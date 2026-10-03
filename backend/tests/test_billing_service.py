"""Host-level Stripe billing service tests.

These tests cover the migration from per-space subscriptions to a single
host-level subscription, where each enrolled space is represented as a Stripe
Subscription Item tagged with ``metadata.space_id``.

Both Supabase and Stripe are faked: Supabase via an in-memory query-builder
double (following the project's ``FakeQuery`` convention) and Stripe via
``unittest.mock`` patches, so no network calls are made.
"""

import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.core.config import settings
from app.features.billing.service import (
    _ensure_host_record,
    _fetch_owned_spaces,
    _resolve_price_id,
    _timestamp_to_iso,
    add_space_item,
    cancel_host_subscription,
    create_checkout_session,
    create_portal_session,
    map_stripe_status,
    purge_host_account,
    remove_space_item,
)

HOST_ID = "host-1"
OTHER_HOST_ID = "host-2"


# ---------------------------------------------------------------------------
# Supabase double
# ---------------------------------------------------------------------------


class FakeResponse:
    """Minimal stand-in for the PostgREST response object."""

    def __init__(self, data=None, count=None):
        self.data = data
        self.count = count


class FakeTable:
    """Chainable query builder that records the operation for later assertions."""

    def __init__(self, client, name):
        self.client = client
        self.name = name
        self.op = None
        self.payload = None
        self.filters = []
        self.count_mode = None
        self.head = False
        self.limit_n = None
        self.single_flag = False

    def select(self, columns="*", count=None, head=False):
        self.op = "select"
        self.count_mode = count
        self.head = head
        return self

    def insert(self, payload):
        self.op = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.op = "update"
        self.payload = payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self

    def neq(self, column, value):
        self.filters.append(("neq", column, value))
        return self

    def in_(self, column, values):
        self.filters.append(("in", column, values))
        return self

    def limit(self, n):
        self.limit_n = n
        return self

    def maybe_single(self):
        self.single_flag = True
        return self

    def single(self):
        self.single_flag = True
        return self

    def execute(self):
        return self.client._execute(self)


class FakeSupabaseClient:
    """In-memory Supabase client backed by ``hosts`` and ``spaces`` row lists."""

    def __init__(self, hosts=None, spaces=None):
        self.hosts = hosts if hosts is not None else []
        self.spaces = spaces if spaces is not None else []
        self.calls = []

    def table(self, name):
        return FakeTable(self, name)

    def _rows(self, name):
        return self.hosts if name == "hosts" else self.spaces

    @staticmethod
    def _matches(row, filters):
        for kind, column, value in filters:
            if kind == "eq" and row.get(column) != value:
                return False
            if kind == "neq" and row.get(column) == value:
                return False
            if kind == "in" and row.get(column) not in value:
                return False
        return True

    def _execute(self, query):
        rows = self._rows(query.name)
        self.calls.append((query.name, query.op, query.payload, list(query.filters)))
        matched = [row for row in rows if self._matches(row, query.filters)]

        if query.op == "select":
            if query.count_mode == "exact" and query.head:
                return FakeResponse(data=[], count=len(matched))
            if query.limit_n:
                matched = matched[: query.limit_n]
            if query.single_flag:
                return FakeResponse(data=matched[0] if matched else None)
            return FakeResponse(data=list(matched))
        if query.op == "insert":
            new_row = dict(query.payload)
            rows.append(new_row)
            return FakeResponse(data=[new_row])
        if query.op == "update":
            for row in matched:
                row.update(query.payload)
            return FakeResponse(data=list(matched))
        if query.op == "delete":
            deleted = list(matched)
            for row in deleted:
                rows.remove(row)
            return FakeResponse(data=deleted)
        return FakeResponse(data=[])


def make_host(**overrides):
    """Build a hosts row with valid billing defaults."""
    row = {
        "id": HOST_ID,
        "stripe_customer_id": "cus_1",
        "stripe_subscription_id": None,
        "subscription_status": "trialing",
        "trial_ends_at": None,
    }
    row.update(overrides)
    return row


def make_space(space_id, host_id=HOST_ID, **overrides):
    """Build a spaces row owned by ``host_id``."""
    row = {
        "id": space_id,
        "host_id": host_id,
        "space_type": "stay",
        "is_active": True,
        "subscription_status": "trialing",
        "trial_ends_at": None,
    }
    row.update(overrides)
    return row


def patch_supabase(fake):
    """Patch the billing service's Supabase accessor to return ``fake``."""
    return patch("app.features.billing.service.get_supabase_client", return_value=fake)


# ---------------------------------------------------------------------------
# Pure functions
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("active", "active"),
        ("trialing", "trialing"),
        ("past_due", "past_due"),
        ("canceled", "canceled"),
        ("paused", "paused"),
        ("incomplete", "past_due"),
        ("incomplete_expired", "canceled"),
        ("unpaid", "past_due"),
        ("something_unknown", "past_due"),
        ("", "canceled"),
        (None, "canceled"),
    ],
)
def test_map_stripe_status(raw, expected):
    """Stripe statuses map onto the constrained DB enum; unknowns -> past_due."""
    assert map_stripe_status(raw) == expected


@pytest.mark.parametrize("space_type", ["stay", "menu", "real_estate", "auto"])
def test_resolve_price_id_uses_stay_price(space_type):
    """MVP charges the single Stay price regardless of vertical."""
    assert _resolve_price_id(space_type) == settings.STRIPE_PRICE_ID_STAY


def test_timestamp_to_iso_formats_epoch_seconds():
    """A known epoch timestamp is rendered as an ISO-8601 UTC string."""
    assert _timestamp_to_iso(1_700_000_000) == "2023-11-14T22:13:20+00:00"


# ---------------------------------------------------------------------------
# _ensure_host_record
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ensure_host_record_returns_existing_without_insert():
    """An existing hosts row is returned verbatim; no insert is performed."""
    fake = FakeSupabaseClient(hosts=[make_host()])
    with patch_supabase(fake):
        record = await _ensure_host_record(HOST_ID, email="host@example.com")

    assert record.id == HOST_ID
    assert record.stripe_customer_id == "cus_1"
    assert not any(op == "insert" for _, op, _, _ in fake.calls)


@pytest.mark.asyncio
async def test_ensure_host_record_inserts_only_id():
    """A missing row is inserted with ONLY the id; FK/RLS supply the rest."""
    fake = FakeSupabaseClient(hosts=[])
    with patch_supabase(fake):
        record = await _ensure_host_record(HOST_ID, email="host@example.com")

    assert record.id == HOST_ID
    inserts = [payload for _, op, payload, _ in fake.calls if op == "insert"]
    assert inserts == [{"id": HOST_ID}]


# ---------------------------------------------------------------------------
# _fetch_owned_spaces (multi-tenancy pre-filter)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_owned_spaces_filters_by_host_id():
    """Only spaces owned by the host are returned (hard host_id pre-filter)."""
    fake = FakeSupabaseClient(
        spaces=[
            make_space("space-1", HOST_ID),
            make_space("space-2", HOST_ID),
            make_space("space-foreign", OTHER_HOST_ID),
        ]
    )
    with patch_supabase(fake):
        spaces = await _fetch_owned_spaces(HOST_ID, [])

    assert {space.id for space in spaces} == {"space-1", "space-2"}
    select_filters = [
        filters for _, op, _, filters in fake.calls if op == "select"
    ]
    assert ("eq", "host_id", HOST_ID) in select_filters[0]


@pytest.mark.asyncio
async def test_fetch_owned_spaces_narrows_to_requested_ids():
    """When explicit ids are given, an ``in_`` filter narrows the result."""
    fake = FakeSupabaseClient(
        spaces=[
            make_space("space-1", HOST_ID),
            make_space("space-2", HOST_ID),
        ]
    )
    with patch_supabase(fake):
        spaces = await _fetch_owned_spaces(HOST_ID, ["space-2"])

    assert [space.id for space in spaces] == ["space-2"]
    select_filters = [filters for _, op, _, filters in fake.calls if op == "select"]
    assert ("in", "id", ["space-2"]) in select_filters[0]


# ---------------------------------------------------------------------------
# create_checkout_session
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_checkout_rejects_when_active_subscription_exists():
    """A host with a live subscription cannot start a second checkout."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_subscription_id="sub_1", subscription_status="active")],
        spaces=[make_space("space-1")],
    )
    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="already has an active subscription"),
    ):
        await create_checkout_session(HOST_ID, "host@example.com", ["space-1"])


@pytest.mark.asyncio
async def test_checkout_requires_at_least_one_space():
    """Checkout with no enrollees is rejected before any Stripe call."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[])
    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="No spaces available"),
    ):
        await create_checkout_session(HOST_ID, "host@example.com", [])


@pytest.mark.asyncio
async def test_checkout_rejects_foreign_space():
    """A space owned by another host is excluded by the pre-filter, so no
    owned space remains and checkout is refused (multi-tenancy isolation)."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],
        spaces=[make_space("space-foreign", OTHER_HOST_ID)],
    )
    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="No spaces available"),
    ):
        await create_checkout_session(HOST_ID, "host@example.com", ["space-foreign"])


@pytest.mark.asyncio
async def test_checkout_creates_session_with_json_space_ids():
    """Happy path returns a checkout URL and stamps space_ids as JSON metadata."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],  # already has stripe_customer_id -> no Customer.create
        spaces=[make_space("space-1"), make_space("space-2")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        mock_stripe.checkout.Session.create.return_value = SimpleNamespace(
            url="https://checkout.stripe.com/session", id="cs_test_1"
        )
        result = await create_checkout_session(
            HOST_ID, "host@example.com", ["space-1", "space-2"]
        )

    assert result.checkout_url == "https://checkout.stripe.com/session"
    assert result.session_id == "cs_test_1"

    kwargs = mock_stripe.checkout.Session.create.call_args.kwargs
    assert kwargs["mode"] == "subscription"
    assert kwargs["client_reference_id"] == HOST_ID
    assert kwargs["customer"] == "cus_1"
    # One line item per enrolled space, priced at the single Stay price.
    assert kwargs["line_items"] == [
        {"price": settings.STRIPE_PRICE_ID_STAY, "quantity": 1},
        {"price": settings.STRIPE_PRICE_ID_STAY, "quantity": 1},
    ]
    assert json.loads(kwargs["metadata"]["space_ids"]) == ["space-1", "space-2"]
    assert kwargs["subscription_data"]["metadata"]["host_id"] == HOST_ID
    assert json.loads(kwargs["subscription_data"]["metadata"]["space_ids"]) == [
        "space-1",
        "space-2",
    ]


# ---------------------------------------------------------------------------
# add_space_item
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_space_item_appends_item_and_mirrors_active():
    """Adding a space appends a tagged item and mirrors the space to active."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_subscription_id="sub_1", subscription_status="active")
        ],
        spaces=[make_space("space-1", subscription_status="trialing")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        result = await add_space_item(HOST_ID, "space-1")

    assert result.success is True
    assert result.subscription_status == "active"

    items_kwarg = mock_stripe.Subscription.modify.call_args.kwargs["items"]
    assert items_kwarg == [
        {"price": settings.STRIPE_PRICE_ID_STAY, "metadata": {"space_id": "space-1"}}
    ]
    # The denormalized space status is mirrored to the authoritative one.
    assert fake.spaces[0]["subscription_status"] == "active"


@pytest.mark.asyncio
async def test_add_space_item_requires_subscription():
    """Without a live subscription the host must run checkout first."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space("space-1")])
    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="No active subscription"),
    ):
        await add_space_item(HOST_ID, "space-1")


@pytest.mark.asyncio
async def test_add_space_item_requires_ownership():
    """A space the host does not own cannot be added (multi-tenancy)."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_subscription_id="sub_1")],
        spaces=[make_space("space-x", OTHER_HOST_ID)],
    )
    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="Space not found"),
    ):
        await add_space_item(HOST_ID, "space-1")


# ---------------------------------------------------------------------------
# remove_space_item
# ---------------------------------------------------------------------------


def _sub_item(item_id, space_id):
    """Build a fake Stripe Subscription Item tagged with a space_id."""
    return SimpleNamespace(id=item_id, metadata={"space_id": space_id})


@pytest.mark.asyncio
async def test_remove_space_item_noop_without_subscription():
    """No subscription -> immediate success, no Stripe calls."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space("space-1")])
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        result = await remove_space_item(HOST_ID, "space-1")

    assert result.success is True
    assert result.subscription_status == "trialing"
    mock_stripe.SubscriptionItem.list.assert_not_called()


@pytest.mark.asyncio
async def test_remove_last_item_cancels_subscription():
    """Removing the only billable item cancels the whole subscription."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_subscription_id="sub_1", subscription_status="active")
        ],
        spaces=[make_space("space-1", subscription_status="active")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        mock_stripe.SubscriptionItem.list.return_value = SimpleNamespace(
            data=[_sub_item("si_1", "space-1")]
        )
        mock_stripe.Subscription.modify.return_value = SimpleNamespace(
            id="sub_1", status="active", trial_end=None
        )
        result = await remove_space_item(HOST_ID, "space-1")

    assert result.subscription_status == "active"
    mock_stripe.Subscription.modify.assert_called_once_with(
        "sub_1", cancel_at_period_end=True
    )
    mock_stripe.SubscriptionItem.delete.assert_not_called()
    # Space is mirrored back to trial after leaving the subscription.
    assert fake.spaces[0]["subscription_status"] == "active"


@pytest.mark.asyncio
async def test_remove_one_of_many_deletes_single_item():
    """With multiple items, only the targeted item is deleted; sub survives."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_subscription_id="sub_1", subscription_status="active")
        ],
        spaces=[make_space("space-1", subscription_status="active")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        mock_stripe.SubscriptionItem.list.return_value = SimpleNamespace(
            data=[_sub_item("si_1", "space-1"), _sub_item("si_2", "space-2")]
        )
        result = await remove_space_item(HOST_ID, "space-1")

    assert result.subscription_status == "active"
    mock_stripe.SubscriptionItem.delete.assert_called_once_with("si_1")
    mock_stripe.Subscription.modify.assert_not_called()


@pytest.mark.asyncio
async def test_remove_unlisted_space_keeps_host_status():
    """A space with no billable item is mirrored to trial; host status unchanged."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_subscription_id="sub_1", subscription_status="active")
        ],
        spaces=[make_space("space-1", subscription_status="active")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        mock_stripe.SubscriptionItem.list.return_value = SimpleNamespace(
            data=[_sub_item("si_2", "space-2")]
        )
        result = await remove_space_item(HOST_ID, "space-1")

    assert result.subscription_status == "active"
    mock_stripe.SubscriptionItem.delete.assert_not_called()
    mock_stripe.Subscription.modify.assert_not_called()
    assert fake.spaces[0]["subscription_status"] == "trialing"


# ---------------------------------------------------------------------------
# cancel_host_subscription
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cancel_noop_without_subscription():
    """No subscription -> immediate success, no Stripe call."""
    fake = FakeSupabaseClient(hosts=[make_host()])
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        result = await cancel_host_subscription(HOST_ID)

    assert result.success is True
    assert result.subscription_status == "trialing"
    mock_stripe.Subscription.modify.assert_not_called()


@pytest.mark.asyncio
async def test_cancel_sets_period_end_and_syncs_status():
    """Cancelling schedules period-end cancellation and syncs host + spaces."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_subscription_id="sub_1", subscription_status="active")
        ],
        spaces=[make_space("space-1", subscription_status="active")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        mock_stripe.Subscription.modify.return_value = SimpleNamespace(
            id="sub_1", status="active", trial_end=None
        )
        result = await cancel_host_subscription(HOST_ID)

    assert result.subscription_status == "active"
    mock_stripe.Subscription.modify.assert_called_once_with(
        "sub_1", cancel_at_period_end=True
    )
    assert fake.hosts[0]["subscription_status"] == "active"
    assert fake.spaces[0]["subscription_status"] == "active"


# ---------------------------------------------------------------------------
# purge_host_account
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_purge_deletes_customer_host_and_counts_spaces():
    """Purge deletes the Stripe customer, the host row, and counts spaces."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(
                stripe_subscription_id="sub_1",
                stripe_customer_id="cus_1",
            )
        ],
        spaces=[make_space("space-1"), make_space("space-2")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        result = await purge_host_account(HOST_ID)

    assert result.success is True
    assert result.canceled_subscription_id == "sub_1"
    assert result.deleted_spaces == 2
    assert result.deleted_host_record is True
    mock_stripe.Customer.delete.assert_called_once_with("cus_1")
    assert fake.hosts == []
    # spaces.host_id -> auth.users (no cascade from hosts), so the purge must
    # delete them explicitly rather than relying on the hosts-row delete.
    assert fake.spaces == []


@pytest.mark.asyncio
async def test_purge_skips_stripe_when_no_customer():
    """Without a Stripe customer, purge still removes the host row safely."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id=None)],
        spaces=[],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        result = await purge_host_account(HOST_ID)

    assert result.success is True
    assert result.deleted_host_record is True
    assert result.deleted_spaces == 0
    mock_stripe.Customer.delete.assert_not_called()
    assert fake.hosts == []


# ---------------------------------------------------------------------------
# create_portal_session
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_portal_requires_billing_profile():
    """Without a Stripe customer the portal cannot be opened."""
    fake = FakeSupabaseClient(hosts=[make_host(stripe_customer_id=None)])
    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="does not have a billing profile"),
    ):
        await create_portal_session(HOST_ID)


@pytest.mark.asyncio
async def test_portal_creates_session_for_host_customer():
    """Happy path returns the portal URL bound to the host's single customer."""
    fake = FakeSupabaseClient(hosts=[make_host(stripe_customer_id="cus_1")])
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe"
    ) as mock_stripe:
        mock_stripe.billing_portal.Session.create.return_value = SimpleNamespace(
            url="https://billing.stripe.com/portal"
        )
        result = await create_portal_session(HOST_ID)

    assert result.portal_url == "https://billing.stripe.com/portal"
    kwargs = mock_stripe.billing_portal.Session.create.call_args.kwargs
    assert kwargs["customer"] == "cus_1"
    assert kwargs["return_url"].startswith(settings.FRONTEND_URL.rstrip("/"))


# ---------------------------------------------------------------------------
# Webhook processing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_webhook_updates_status_with_dict_payload():
    """Webhook correctly updates status when payload is a raw dictionary."""
    from app.features.billing.service import process_webhook_event
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_subscription_id="sub_test", subscription_status="trialing")
        ],
        spaces=[make_space("space-1", subscription_status="trialing")],
    )
    with patch_supabase(fake), patch(
        "app.features.billing.service.stripe.Webhook.construct_event"
    ) as mock_construct:
        mock_construct.return_value = {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_test",
                    "status": "active",
                    "trial_end": None
                }
            }
        }
        await process_webhook_event(b"fake_payload", "fake_sig")

    assert fake.hosts[0]["subscription_status"] == "active"
    assert fake.spaces[0]["subscription_status"] == "active"
