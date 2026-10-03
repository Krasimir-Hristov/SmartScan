"""Per-space Stripe billing service tests.

Billing ownership model under test:

* ONE Stripe Customer per host        -> ``public.hosts.stripe_customer_id``
* ONE Stripe Subscription PER SPACE   -> ``public.spaces.stripe_subscription_id``
* ONE account-level trial per host    -> ``public.hosts.trial_ends_at``

Both Supabase and Stripe are faked: Supabase via an in-memory query-builder
double (following the project's ``FakeQuery`` convention, extended with an RPC
double that mirrors ``public.get_space_entitlement``) and Stripe via
``unittest.mock`` patches, so no network calls are made.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import stripe

from app.core.config import settings
from app.features.billing.service import (
    SPACE_SUBSCRIPTION_REQUIRED,
    SpaceNotEntitledError,
    _build_new_host_payload,
    _ensure_host_record,
    _fetch_owned_spaces,
    _read_period_end,
    _resolve_price_id,
    _subscription_snapshot,
    _timestamp_to_iso,
    cancel_space_subscription,
    create_checkout_session,
    create_portal_session,
    detach_space_subscription,
    ensure_space_entitled,
    get_billing_summary,
    get_host_billing,
    get_space_entitlement,
    is_billable_space_id,
    map_stripe_status,
    process_webhook_event,
    purge_host_account,
    resume_space_subscription,
)

HOST_ID = "host-1"
OTHER_HOST_ID = "host-2"
SPACE_ID = "space-1"


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


class FakeRpc:
    """Chainable stand-in for a PostgREST function (RPC) call."""

    def __init__(self, client, name, params):
        self.client = client
        self.name = name
        self.params = params

    def execute(self):
        return self.client._execute_rpc(self)


class FakeSupabaseClient:
    """In-memory Supabase client backed by ``hosts`` and ``spaces`` row lists."""

    def __init__(self, hosts=None, spaces=None, rpc_results=None):
        self.hosts = hosts if hosts is not None else []
        self.spaces = spaces if spaces is not None else []
        self.rpc_results = rpc_results if rpc_results is not None else {}
        self.calls = []

    def table(self, name):
        return FakeTable(self, name)

    def rpc(self, name, params=None):
        return FakeRpc(self, name, params or {})

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
        self.calls.append((query.name, query.op, list(query.filters)))
        rows = self._rows(query.name)
        matched = [row for row in rows if self._matches(row, query.filters)]

        if query.op == "select":
            if query.single_flag:
                return FakeResponse(data=matched[0] if matched else None)
            return FakeResponse(data=list(matched))

        if query.op == "insert":
            created = dict(query.payload)
            rows.append(created)
            return FakeResponse(data=[created])

        if query.op == "update":
            for row in matched:
                row.update(query.payload)
            return FakeResponse(data=list(matched))

        if query.op == "delete":
            for row in matched:
                rows.remove(row)
            return FakeResponse(data=list(matched))

        return FakeResponse(data=[])

    def _execute_rpc(self, call):
        self.calls.append((call.name, "rpc", dict(call.params)))
        handler = self.rpc_results.get(call.name)
        if handler is None:
            return FakeResponse(data=[])
        return FakeResponse(data=handler(call.params))


def entitlement_rows(fake):
    """Python mirror of ``public.get_space_entitlement`` over the fake rows.

    Reproducing the SQL predicate keeps the tests honest: a space is entitled
    when it is active AND (has an ``active`` subscription OR the owning account
    trial is still open).
    """

    def _call(params):
        target = params.get("target_space_id")
        space = next((row for row in fake.spaces if row.get("id") == target), None)
        if space is None:
            return []

        host = next(
            (row for row in fake.hosts if row.get("id") == space.get("host_id")), None
        )
        trial_ends_at = (host or {}).get("trial_ends_at")
        status = space.get("subscription_status")
        is_active = bool(space.get("is_active", True))
        trial_open = bool(
            trial_ends_at
            and datetime.fromisoformat(trial_ends_at) > datetime.now(timezone.utc)
        )

        if status == "active":
            entitlement_status = "active"
            valid_until = space.get("current_period_end")
        else:
            entitlement_status = "trial" if trial_open else "expired"
            valid_until = trial_ends_at

        return [
            {
                "space_id": space.get("id"),
                "host_id": space.get("host_id"),
                "is_active": is_active,
                "subscription_status": status,
                "current_period_end": space.get("current_period_end"),
                "trial_ends_at": trial_ends_at,
                "entitlement_status": entitlement_status,
                "valid_until": valid_until,
                "entitled": bool(is_active and (status == "active" or trial_open)),
            }
        ]

    return _call


# ---------------------------------------------------------------------------
# Row / object builders and patch helpers
# ---------------------------------------------------------------------------


def future_iso(days=30):
    """ISO timestamp ``days`` in the future (UTC)."""
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


def past_iso(days=1):
    """ISO timestamp ``days`` in the past (UTC)."""
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def make_host(
    host_id=HOST_ID,
    stripe_customer_id="cus_1",
    trial_ends_at=None,
    trial_claimed_at=None,
):
    """Build a ``hosts`` row: the account-level billing record."""
    return {
        "id": host_id,
        "stripe_customer_id": stripe_customer_id,
        "trial_ends_at": trial_ends_at,
        "trial_claimed_at": trial_claimed_at,
    }


def make_space(
    space_id=SPACE_ID,
    host_id=HOST_ID,
    space_type="stay",
    is_active=True,
    subscription_status="trialing",
    stripe_subscription_id=None,
    current_period_end=None,
):
    """Build a ``spaces`` row that owns its own dedicated subscription."""
    return {
        "id": space_id,
        "host_id": host_id,
        "space_type": space_type,
        "is_active": is_active,
        "subscription_status": subscription_status,
        "stripe_subscription_id": stripe_subscription_id,
        "current_period_end": current_period_end,
    }


def make_subscription(
    subscription_id="sub_1",
    status="active",
    current_period_end=None,
    cancel_at_period_end=False,
):
    """Build a Stripe subscription double with a top-level ``current_period_end``."""
    return SimpleNamespace(
        id=subscription_id,
        status=status,
        current_period_end=current_period_end,
        cancel_at_period_end=cancel_at_period_end,
        items=None,
    )


def make_item_subscription(
    subscription_id="sub_1",
    status="active",
    current_period_end=None,
    cancel_at_period_end=False,
):
    """Build a subscription double using the per-item (basil) period-end shape."""
    return SimpleNamespace(
        id=subscription_id,
        status=status,
        current_period_end=None,
        cancel_at_period_end=cancel_at_period_end,
        items=SimpleNamespace(
            data=[SimpleNamespace(current_period_end=current_period_end)]
        ),
    )


def patch_supabase(fake):
    """Patch the billing service's Supabase accessor to return ``fake``.

    Registers the entitlement RPC mirror by default so every test exercises the
    same predicate the SQL gate uses.
    """
    fake.rpc_results.setdefault("get_space_entitlement", entitlement_rows(fake))
    return patch("app.features.billing.service.get_supabase_client", return_value=fake)


def stripe_invalid_request_error(code=None):
    """Build a ``stripe.InvalidRequestError`` carrying an optional error code."""
    import stripe

    error = stripe.InvalidRequestError("no such subscription", "subscription")
    error.code = code
    return error


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("trialing", "trialing"),
        ("active", "active"),
        ("past_due", "past_due"),
        ("paused", "paused"),
        ("canceled", "canceled"),
        # Stripe-only statuses must collapse into the DB CHECK-constrained set.
        ("unpaid", "past_due"),
        ("incomplete", "past_due"),
        ("incomplete_expired", "canceled"),
        ("something_new", "past_due"),
        ("", "canceled"),
        (None, "canceled"),
    ],
)
def test_map_stripe_status_collapses_stripe_statuses(raw, expected):
    """The stored status can never violate the DB CHECK constraint."""
    assert map_stripe_status(raw) == expected


@pytest.mark.parametrize(
    ("space_id", "expected"),
    [
        ("11111111-1111-1111-1111-111111111111", True),
        ("demo-villa", False),
        ("demo-", False),
        ("", False),
        ("   ", False),
        ("not-a-uuid", False),
    ],
)
def test_is_billable_space_id_skips_demo_and_malformed_ids(space_id, expected):
    """Demo fixtures and malformed ids are never sent to the entitlement RPC."""
    assert is_billable_space_id(space_id) is expected


def test_resolve_price_id_returns_configured_stay_price():
    """Every vertical resolves to a real configured Price id."""
    assert _resolve_price_id("stay") == settings.STRIPE_PRICE_ID_STAY
    assert _resolve_price_id("menu") == settings.STRIPE_PRICE_ID_STAY
    assert _resolve_price_id(None) == settings.STRIPE_PRICE_ID_STAY


def test_timestamp_to_iso_is_utc():
    """Unix timestamps become ISO-8601 UTC strings."""
    assert _timestamp_to_iso(0) == "1970-01-01T00:00:00+00:00"


def test_read_period_end_supports_top_level_shape():
    """Legacy subscriptions expose ``current_period_end`` at the top level."""
    subscription = make_subscription(current_period_end=1_800_000_000)
    assert _read_period_end(subscription) == _timestamp_to_iso(1_800_000_000)


def test_read_period_end_supports_per_item_shape():
    """API version 2025-03-31.basil moved the period end onto the items."""
    subscription = make_item_subscription(current_period_end=1_800_000_000)
    assert _read_period_end(subscription) == _timestamp_to_iso(1_800_000_000)


def test_read_period_end_returns_none_when_absent():
    """No period end anywhere yields None rather than a bogus epoch date."""
    assert _read_period_end(make_subscription()) is None
    assert _read_period_end(make_item_subscription()) is None


def test_subscription_snapshot_projects_persisted_columns():
    """The snapshot carries exactly what gets written onto the space row."""
    subscription = make_subscription(
        subscription_id="sub_9",
        status="unpaid",
        current_period_end=1_800_000_000,
        cancel_at_period_end=True,
    )

    assert _subscription_snapshot(subscription) == (
        "sub_9",
        "past_due",
        _timestamp_to_iso(1_800_000_000),
        True,
    )


def test_subscription_snapshot_accepts_plain_dicts():
    """Webhook payloads arrive as dicts, not Stripe objects."""
    payload = {
        "id": "sub_dict",
        "status": "canceled",
        "current_period_end": 1_800_000_000,
        "cancel_at_period_end": False,
    }

    assert _subscription_snapshot(payload) == (
        "sub_dict",
        "canceled",
        _timestamp_to_iso(1_800_000_000),
        False,
    )


def test_build_new_host_payload_grants_trial_from_settings():
    """A brand-new host row gets the configured trial length, granted once."""
    payload = _build_new_host_payload(HOST_ID)

    assert payload["id"] == HOST_ID
    assert payload["trial_claimed_at"]
    starts_at = datetime.fromisoformat(payload["trial_claimed_at"])
    ends_at = datetime.fromisoformat(payload["trial_ends_at"])
    assert (ends_at - starts_at).days == settings.ACCOUNT_TRIAL_DAYS


def test_build_new_host_payload_without_trial_days():
    """With the trial disabled no ``trial_ends_at`` is written at all."""
    with patch.object(settings, "ACCOUNT_TRIAL_DAYS", 0):
        payload = _build_new_host_payload(HOST_ID)

    assert "trial_ends_at" not in payload
    assert payload["trial_claimed_at"]


# ---------------------------------------------------------------------------
# _ensure_host_record / get_host_billing (account-level trial, granted ONCE)
# ---------------------------------------------------------------------------


class ConflictOnInsertClient(FakeSupabaseClient):
    """Fake whose first insert clashes, then exposes the winner's row.

    Reproduces two requests initialising the same host at the same time: the
    loser must re-read the winner's row instead of overwriting its trial.
    """

    def __init__(self, winning_row, **kwargs):
        super().__init__(**kwargs)
        self._winning_row = winning_row
        self._insert_attempted = False

    def _execute(self, query):
        if query.op == "insert" and not self._insert_attempted:
            self._insert_attempted = True
            self.calls.append((query.name, query.op, list(query.filters)))
            self.hosts.append(self._winning_row)
            raise RuntimeError("duplicate key value violates unique constraint")
        return super()._execute(query)


def insert_calls(fake):
    """Return only the insert operations recorded by the fake client."""
    return [call for call in fake.calls if call[1] == "insert"]


@pytest.mark.asyncio
async def test_ensure_host_record_reads_existing_row_without_inserting():
    """An existing account record is returned as-is; nothing is written."""
    fake = FakeSupabaseClient(hosts=[make_host(trial_ends_at=past_iso(5))])

    with patch_supabase(fake):
        host = await _ensure_host_record(HOST_ID)

    assert host.id == HOST_ID
    assert host.stripe_customer_id == "cus_1"
    assert insert_calls(fake) == []


@pytest.mark.asyncio
async def test_ensure_host_record_creates_account_trial_once():
    """First touch creates the hosts row and grants the account-level trial."""
    fake = FakeSupabaseClient(hosts=[])

    with patch_supabase(fake):
        host = await _ensure_host_record(HOST_ID)

    assert len(fake.hosts) == 1
    created = fake.hosts[0]
    assert created["id"] == HOST_ID
    assert created["trial_claimed_at"]
    assert host.trial_ends_at == created["trial_ends_at"]

    claimed = datetime.fromisoformat(created["trial_claimed_at"])
    ends = datetime.fromisoformat(created["trial_ends_at"])
    assert (ends - claimed).days == settings.ACCOUNT_TRIAL_DAYS


@pytest.mark.asyncio
async def test_ensure_host_record_never_restarts_an_expired_trial():
    """Re-reading an expired trial never extends it (no infinite free usage)."""
    expired = past_iso(5)
    fake = FakeSupabaseClient(hosts=[make_host(trial_ends_at=expired)])

    with patch_supabase(fake):
        await _ensure_host_record(HOST_ID)
        host = await _ensure_host_record(HOST_ID)

    assert host.trial_ends_at == expired
    assert insert_calls(fake) == []


@pytest.mark.asyncio
async def test_ensure_host_record_survives_concurrent_insert():
    """On a unique clash the loser re-reads the winner's row and its trial."""
    winner_trial = future_iso(9)
    fake = ConflictOnInsertClient(
        winning_row=make_host(trial_ends_at=winner_trial),
        hosts=[],
    )

    with patch_supabase(fake):
        host = await _ensure_host_record(HOST_ID)

    assert host.trial_ends_at == winner_trial
    assert len(fake.hosts) == 1


@pytest.mark.asyncio
async def test_ensure_host_record_raises_without_database():
    """A missing Supabase client fails loudly instead of silently granting access."""
    with (
        patch("app.features.billing.service.get_supabase_client", return_value=None),
        pytest.raises(ValueError, match="Database connection error"),
    ):
        await _ensure_host_record(HOST_ID)


@pytest.mark.asyncio
async def test_get_host_billing_exposes_account_record():
    """The public accessor returns the account record, not per-space state."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(3))],
        spaces=[make_space(subscription_status="active")],
    )

    with patch_supabase(fake):
        host = await get_host_billing(HOST_ID)

    assert host.id == HOST_ID
    assert host.trial_ends_at
    # The account record carries NO subscription state: that lives on spaces.
    assert not hasattr(host, "subscription_status")


# ---------------------------------------------------------------------------
# Entitlement gate (the rule every guest-facing feature must pass)
# ---------------------------------------------------------------------------


def entitlement_calls(fake):
    """Return the recorded ``get_space_entitlement`` RPC calls."""
    return [call for call in fake.calls if call[0] == "get_space_entitlement"]


@pytest.mark.asyncio
async def test_entitlement_paid_space_survives_an_expired_trial():
    """An ``active`` per-space subscription entitles the space on its own."""
    period_end = future_iso(20)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(5))],
        spaces=[
            make_space(
                subscription_status="active",
                stripe_subscription_id="sub_1",
                current_period_end=period_end,
            )
        ],
    )

    with patch_supabase(fake):
        entitlement = await get_space_entitlement(SPACE_ID)

    assert entitlement is not None
    assert entitlement.entitled is True
    assert entitlement.entitlement_status == "active"
    assert entitlement.valid_until == period_end


@pytest.mark.asyncio
async def test_entitlement_open_account_trial_covers_unpaid_space():
    """A space with no subscription is entitled while the account trial is open."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(7))],
        spaces=[make_space(subscription_status="trialing")],
    )

    with patch_supabase(fake):
        entitlement = await get_space_entitlement(SPACE_ID)

    assert entitlement is not None
    assert entitlement.entitled is True
    assert entitlement.entitlement_status == "trial"


@pytest.mark.asyncio
async def test_entitlement_expired_without_subscription_or_trial():
    """No paid subscription AND no open trial locks the space for guests."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))],
        spaces=[make_space(subscription_status="canceled")],
    )

    with patch_supabase(fake):
        entitlement = await get_space_entitlement(SPACE_ID)

    assert entitlement is not None
    assert entitlement.entitled is False
    assert entitlement.entitlement_status == "expired"


@pytest.mark.asyncio
async def test_entitlement_deactivated_space_is_locked_even_when_paid():
    """``is_active = FALSE`` (e.g. seasonal pause) locks a paid space too."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(7))],
        spaces=[
            make_space(
                is_active=False,
                subscription_status="active",
                stripe_subscription_id="sub_1",
            )
        ],
    )

    with patch_supabase(fake):
        entitlement = await get_space_entitlement(SPACE_ID)

    assert entitlement is not None
    assert entitlement.entitled is False


@pytest.mark.asyncio
async def test_entitlement_unknown_space_returns_none():
    """A space that does not exist yields None so callers can answer 404."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[])

    with patch_supabase(fake):
        assert await get_space_entitlement("ghost") is None


@pytest.mark.asyncio
async def test_entitlement_is_read_from_the_shared_sql_rpc():
    """The verdict comes from SQL, so Python and DB gates cannot drift."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space()])

    with patch_supabase(fake):
        await get_space_entitlement(SPACE_ID)

    assert entitlement_calls(fake) == [
        ("get_space_entitlement", "rpc", {"target_space_id": SPACE_ID})
    ]


@pytest.mark.asyncio
async def test_entitlement_lookup_failure_raises():
    """An RPC failure raises rather than defaulting to "entitled"."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space()])

    def _boom(_params):
        raise RuntimeError("rpc unavailable")

    fake.rpc_results["get_space_entitlement"] = _boom

    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="Could not verify this space's subscription"),
    ):
        await get_space_entitlement(SPACE_ID)


@pytest.mark.asyncio
async def test_ensure_space_entitled_returns_snapshot_when_entitled():
    """The gate passes through the snapshot for an entitled space."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(7))],
        spaces=[make_space()],
    )

    with patch_supabase(fake):
        entitlement = await ensure_space_entitled(SPACE_ID)

    assert entitlement.space_id == SPACE_ID
    assert entitlement.entitled is True


@pytest.mark.asyncio
async def test_ensure_space_entitled_raises_for_unknown_space():
    """An unknown space is a plain ValueError (routers answer 404/400)."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[])

    with (
        patch_supabase(fake),
        pytest.raises(ValueError, match="Space not found"),
    ):
        await ensure_space_entitled("ghost")


@pytest.mark.asyncio
async def test_ensure_space_entitled_raises_dedicated_error_when_locked():
    """A locked space raises the error routers map to 403."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))],
        spaces=[make_space(subscription_status="canceled")],
    )

    with (
        patch_supabase(fake),
        pytest.raises(SpaceNotEntitledError) as exc_info,
    ):
        await ensure_space_entitled(SPACE_ID)

    assert str(exc_info.value) == SPACE_SUBSCRIPTION_REQUIRED
    # Subclasses ValueError so pre-existing error handling keeps working.
    assert isinstance(exc_info.value, ValueError)


# ---------------------------------------------------------------------------
# Tenant-scoped space lookup
# ---------------------------------------------------------------------------


def select_calls(fake, table="spaces"):
    """Return the recorded select operations for a table."""
    return [call for call in fake.calls if call[0] == table and call[1] == "select"]


@pytest.mark.asyncio
async def test_fetch_owned_spaces_never_returns_foreign_spaces():
    """Another host's space is invisible even though it exists."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],
        spaces=[make_space("space-1", HOST_ID), make_space("space-2", OTHER_HOST_ID)],
    )

    with patch_supabase(fake):
        spaces = await _fetch_owned_spaces(HOST_ID, [])

    assert [space.id for space in spaces] == ["space-1"]


@pytest.mark.asyncio
async def test_fetch_owned_spaces_by_id_keeps_the_host_filter():
    """Explicitly naming a foreign space id still returns nothing."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],
        spaces=[make_space("space-2", OTHER_HOST_ID)],
    )

    with patch_supabase(fake):
        spaces = await _fetch_owned_spaces(HOST_ID, ["space-2"])

    assert spaces == []
    # The hard multi-tenancy pre-filter is present on the query itself.
    assert ("eq", "host_id", HOST_ID) in select_calls(fake)[0][2]
    assert ("in", "id", ["space-2"]) in select_calls(fake)[0][2]


@pytest.mark.asyncio
async def test_fetch_owned_spaces_without_ids_selects_active_spaces():
    """Listing a host's billable spaces defaults to the active ones."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],
        spaces=[
            make_space("space-1", HOST_ID, is_active=True),
            make_space("space-2", HOST_ID, is_active=False),
        ],
    )

    with patch_supabase(fake):
        spaces = await _fetch_owned_spaces(HOST_ID, [])

    assert [space.id for space in spaces] == ["space-1"]
    assert ("eq", "is_active", True) in select_calls(fake)[0][2]


# ---------------------------------------------------------------------------
# create_checkout_session (ONE dedicated subscription per space)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_checkout_creates_a_dedicated_subscription_for_one_space():
    """Checkout is space-scoped and tags the subscription for the webhook."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id="cus_1")],
        spaces=[make_space(SPACE_ID, subscription_status="trialing")],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.checkout.Session.create.return_value = SimpleNamespace(
            url="https://checkout.stripe.com/pay", id="cs_test_1"
        )
        result = await create_checkout_session(
            host_id=HOST_ID, user_email="host@example.com", space_id=SPACE_ID
        )

    assert result.checkout_url == "https://checkout.stripe.com/pay"
    assert result.session_id == "cs_test_1"

    kwargs = mock_stripe.checkout.Session.create.call_args.kwargs
    assert kwargs["mode"] == "subscription"
    assert kwargs["customer"] == "cus_1"
    assert kwargs["client_reference_id"] == HOST_ID
    assert kwargs["line_items"] == [
        {"price": settings.STRIPE_PRICE_ID_STAY, "quantity": 1}
    ]
    # space_id travels on BOTH the session and the subscription so the webhook
    # can resolve the affected space without scanning anything.
    correlation = {"host_id": HOST_ID, "space_id": SPACE_ID}
    assert kwargs["metadata"] == correlation
    assert kwargs["subscription_data"] == {"metadata": correlation}
    assert "{CHECKOUT_SESSION_ID}" in kwargs["success_url"]


@pytest.mark.asyncio
async def test_checkout_creates_the_stripe_customer_once_per_host():
    """The single Customer per host is created lazily and persisted."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id=None)], spaces=[make_space(SPACE_ID)]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.Customer.create.return_value = SimpleNamespace(id="cus_new")
        mock_stripe.checkout.Session.create.return_value = SimpleNamespace(
            url="https://checkout.stripe.com/pay", id="cs_test_2"
        )
        await create_checkout_session(
            host_id=HOST_ID, user_email="host@example.com", space_id=SPACE_ID
        )

    assert fake.hosts[0]["stripe_customer_id"] == "cus_new"
    # Exactly ONE customer for the whole account, reused by every space.
    assert mock_stripe.Customer.create.call_count == 1
    assert mock_stripe.Customer.create.call_args.kwargs["metadata"] == {
        "host_id": HOST_ID
    }
    assert mock_stripe.checkout.Session.create.call_args.kwargs["customer"] == "cus_new"


@pytest.mark.asyncio
async def test_checkout_rejects_a_foreign_space():
    """A space owned by another host can never be checked out."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[make_space(SPACE_ID, OTHER_HOST_ID)]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
        pytest.raises(ValueError, match="not the owner"),
    ):
        await create_checkout_session(
            host_id=HOST_ID, user_email="host@example.com", space_id=SPACE_ID
        )

    mock_stripe.checkout.Session.create.assert_not_called()


@pytest.mark.asyncio
async def test_checkout_rejects_a_space_with_a_live_subscription():
    """A live subscription is managed in the portal, never re-created."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],
        spaces=[
            make_space(
                subscription_status="active",
                stripe_subscription_id="sub_1",
                current_period_end=future_iso(10),
            )
        ],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
        pytest.raises(ValueError, match="already has a subscription"),
    ):
        await create_checkout_session(
            host_id=HOST_ID, user_email="host@example.com", space_id=SPACE_ID
        )

    mock_stripe.checkout.Session.create.assert_not_called()


@pytest.mark.asyncio
async def test_checkout_allows_resubscribing_a_cancelled_space():
    """A cancelled space may subscribe again (seasonal re-activation)."""
    fake = FakeSupabaseClient(
        hosts=[make_host()],
        spaces=[
            make_space(subscription_status="canceled", stripe_subscription_id="sub_old")
        ],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.checkout.Session.create.return_value = SimpleNamespace(
            url="https://checkout.stripe.com/pay", id="cs_test_3"
        )
        result = await create_checkout_session(
            host_id=HOST_ID, user_email="host@example.com", space_id=SPACE_ID
        )

    assert result.session_id == "cs_test_3"


@pytest.mark.asyncio
async def test_checkout_wraps_stripe_failures_in_a_safe_error():
    """Raw Stripe errors never leak to the client."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space(SPACE_ID)])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.checkout.Session.create.side_effect = RuntimeError("stripe down")
        with pytest.raises(ValueError, match="Could not create checkout session"):
            await create_checkout_session(
                host_id=HOST_ID, user_email="host@example.com", space_id=SPACE_ID
            )


@pytest.mark.asyncio
async def test_checkout_honours_a_custom_return_url():
    """The dashboard can deep-link the host back to a specific space."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space(SPACE_ID)])
    return_url = "https://app.example.com/dashboard?space=space-1"

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.checkout.Session.create.return_value = SimpleNamespace(
            url="https://checkout.stripe.com/pay", id="cs_test_4"
        )
        await create_checkout_session(
            host_id=HOST_ID,
            user_email="host@example.com",
            space_id=SPACE_ID,
            return_url=return_url,
        )

    kwargs = mock_stripe.checkout.Session.create.call_args.kwargs
    assert kwargs["cancel_url"] == return_url
    assert kwargs["success_url"].startswith(return_url)


# ---------------------------------------------------------------------------
# create_portal_session (host-scoped: one Customer lists every space)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_portal_session_is_created_for_the_host_customer():
    """The portal is opened for the account's single Stripe Customer."""
    fake = FakeSupabaseClient(hosts=[make_host(stripe_customer_id="cus_1")])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.billing_portal.Session.create.return_value = SimpleNamespace(
            url="https://billing.stripe.com/session"
        )
        result = await create_portal_session(HOST_ID)

    assert result.portal_url == "https://billing.stripe.com/session"
    kwargs = mock_stripe.billing_portal.Session.create.call_args.kwargs
    assert kwargs["customer"] == "cus_1"
    assert kwargs["return_url"] == f"{settings.FRONTEND_URL.rstrip('/')}/dashboard"


@pytest.mark.asyncio
async def test_portal_session_requires_a_billing_profile():
    """Without a Stripe Customer the portal cannot be opened."""
    fake = FakeSupabaseClient(hosts=[make_host(stripe_customer_id=None)])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
        pytest.raises(ValueError, match="does not have a billing profile"),
    ):
        await create_portal_session(HOST_ID)

    mock_stripe.billing_portal.Session.create.assert_not_called()


@pytest.mark.asyncio
async def test_portal_session_wraps_stripe_failures():
    """Portal creation failures surface as a safe ValueError."""
    fake = FakeSupabaseClient(hosts=[make_host()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe") as mock_stripe,
    ):
        mock_stripe.billing_portal.Session.create.side_effect = RuntimeError("boom")
        with pytest.raises(ValueError, match="Could not create customer portal"):
            await create_portal_session(HOST_ID)


# ---------------------------------------------------------------------------
# get_billing_summary (dashboard overview: account trial + per-space verdicts)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_billing_summary_reports_per_space_verdicts_independently():
    """One paid space stays live while its unpaid sibling is locked."""
    period_end = future_iso(15)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(2))],
        spaces=[
            make_space(
                "space-paid",
                subscription_status="active",
                stripe_subscription_id="sub_paid",
                current_period_end=period_end,
            ),
            make_space("space-free", subscription_status="trialing"),
        ],
    )

    with patch_supabase(fake):
        summary = await get_billing_summary(HOST_ID)

    assert summary.host.id == HOST_ID
    by_id = {space.space_id: space for space in summary.spaces}
    assert set(by_id) == {"space-paid", "space-free"}

    paid = by_id["space-paid"]
    assert paid.entitled is True
    assert paid.entitlement_status == "active"
    assert paid.valid_until == period_end

    free = by_id["space-free"]
    assert free.entitled is False
    assert free.entitlement_status == "expired"


@pytest.mark.asyncio
async def test_billing_summary_shows_the_account_trial_for_unpaid_spaces():
    """While the account trial is open every space reports ``trial``."""
    trial_end = future_iso(4)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=trial_end)],
        spaces=[make_space("space-a"), make_space("space-b")],
    )

    with patch_supabase(fake):
        summary = await get_billing_summary(HOST_ID)

    assert summary.host.trial_ends_at == trial_end
    assert [space.entitlement_status for space in summary.spaces] == ["trial", "trial"]
    assert all(space.entitled for space in summary.spaces)
    assert all(space.valid_until == trial_end for space in summary.spaces)


@pytest.mark.asyncio
async def test_billing_summary_is_scoped_to_the_calling_host():
    """Another host's spaces never appear in the summary."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(4))],
        spaces=[
            make_space("space-mine", HOST_ID),
            make_space("space-theirs", OTHER_HOST_ID),
        ],
    )

    with patch_supabase(fake):
        summary = await get_billing_summary(HOST_ID)

    assert [space.space_id for space in summary.spaces] == ["space-mine"]


@pytest.mark.asyncio
async def test_billing_summary_without_spaces_returns_only_the_account():
    """A brand-new account still gets its trial reported."""
    fake = FakeSupabaseClient(hosts=[make_host(trial_ends_at=future_iso(7))], spaces=[])

    with patch_supabase(fake):
        summary = await get_billing_summary(HOST_ID)

    assert summary.spaces == []
    assert summary.host.trial_ends_at


@pytest.mark.asyncio
async def test_billing_summary_creates_the_account_trial_on_first_read():
    """Opening the dashboard for the first time grants the account trial."""
    fake = FakeSupabaseClient(hosts=[], spaces=[])

    with patch_supabase(fake):
        summary = await get_billing_summary(HOST_ID)

    assert summary.host.trial_ends_at
    assert summary.host.trial_claimed_at


# ---------------------------------------------------------------------------
# cancel_space_subscription (keeps access until current_period_end)
# ---------------------------------------------------------------------------


def future_timestamp(days=12):
    """Unix timestamp ``days`` in the future."""
    return int((datetime.now(timezone.utc) + timedelta(days=days)).timestamp())


def paid_space(
    space_id=SPACE_ID,
    host_id=HOST_ID,
    subscription_id="sub_1",
    period_end=None,
):
    """Build a space row that already has its own live subscription."""
    return make_space(
        space_id,
        host_id,
        subscription_status="active",
        stripe_subscription_id=subscription_id,
        current_period_end=period_end or _timestamp_to_iso(future_timestamp()),
    )


@pytest.mark.asyncio
async def test_cancel_schedules_end_of_period_and_keeps_the_space_entitled():
    """Cancelling must NOT lock the space the host already paid for."""
    period_end = future_timestamp(12)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(3))],
        spaces=[paid_space(period_end=_timestamp_to_iso(period_end))],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.return_value = make_subscription(
            status="active", current_period_end=period_end, cancel_at_period_end=True
        )
        result = await cancel_space_subscription(HOST_ID, SPACE_ID)

        # Stripe keeps status ``active`` while cancel_at_period_end is set, so
        # the entitlement gate must still open the door for guests.
        entitlement = await get_space_entitlement(SPACE_ID)

    assert result.success is True
    assert result.scheduled_cancellation is True
    assert result.subscription_status == "active"
    assert result.current_period_end == _timestamp_to_iso(period_end)

    assert mock_sub.modify.call_args.args == ("sub_1",)
    assert mock_sub.modify.call_args.kwargs == {"cancel_at_period_end": True}

    assert fake.spaces[0]["subscription_status"] == "active"
    assert entitlement is not None
    assert entitlement.entitled is True


@pytest.mark.asyncio
async def test_cancel_without_a_subscription_is_a_noop():
    """A trial-only space has nothing to cancel and never hits Stripe."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(5))],
        spaces=[make_space(subscription_status="trialing")],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        result = await cancel_space_subscription(HOST_ID, SPACE_ID)

    assert result.success is True
    assert result.subscription_status == "trialing"
    assert result.scheduled_cancellation is False
    mock_sub.modify.assert_not_called()


@pytest.mark.asyncio
async def test_cancel_drops_a_subscription_stripe_no_longer_knows():
    """A stale subscription pointer is cleared instead of blocking the host."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(5))],
        spaces=[paid_space()],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.side_effect = stripe_invalid_request_error("resource_missing")
        result = await cancel_space_subscription(HOST_ID, SPACE_ID)

    assert result.success is True
    assert result.subscription_status == "canceled"
    # The space falls back to the account trial instead of pointing at a ghost.
    assert fake.spaces[0]["stripe_subscription_id"] is None
    assert fake.spaces[0]["current_period_end"] is None
    assert fake.spaces[0]["subscription_status"] == "trialing"


@pytest.mark.asyncio
async def test_cancel_rejects_a_foreign_space():
    """Another host's subscription can never be cancelled."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[paid_space(host_id=OTHER_HOST_ID)]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
        pytest.raises(ValueError, match="not the owner"),
    ):
        await cancel_space_subscription(HOST_ID, SPACE_ID)

    mock_sub.modify.assert_not_called()


@pytest.mark.asyncio
async def test_cancel_wraps_unexpected_stripe_errors():
    """Unexpected Stripe failures surface as a safe, generic message."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.side_effect = RuntimeError("stripe down")
        with pytest.raises(ValueError, match="Could not cancel this space"):
            await cancel_space_subscription(HOST_ID, SPACE_ID)


@pytest.mark.asyncio
async def test_cancel_wraps_stripe_request_errors_without_a_known_code():
    """An InvalidRequestError that is not ``resource_missing`` still fails safely."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.side_effect = stripe_invalid_request_error("parameter_unknown")
        with pytest.raises(ValueError, match="Could not cancel this space"):
            await cancel_space_subscription(HOST_ID, SPACE_ID)

    # Nothing was cleared: the host keeps their paid access.
    assert fake.spaces[0]["stripe_subscription_id"] == "sub_1"


# ---------------------------------------------------------------------------
# resume_space_subscription (undo a scheduled cancellation)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resume_undoes_a_scheduled_cancellation():
    """Resuming keeps the space renewing and stays entitled."""
    period_end = future_timestamp(20)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(3))], spaces=[paid_space()]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.return_value = make_subscription(
            status="active", current_period_end=period_end, cancel_at_period_end=False
        )
        result = await resume_space_subscription(HOST_ID, SPACE_ID)

    assert result.success is True
    assert result.scheduled_cancellation is False
    assert result.subscription_status == "active"
    assert result.current_period_end == _timestamp_to_iso(period_end)
    assert mock_sub.modify.call_args.kwargs == {"cancel_at_period_end": False}
    assert fake.spaces[0]["current_period_end"] == _timestamp_to_iso(period_end)


@pytest.mark.asyncio
async def test_resume_requires_a_subscription():
    """A trial-only space has nothing to resume."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[make_space(subscription_status="trialing")]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
        pytest.raises(ValueError, match="does not have a subscription"),
    ):
        await resume_space_subscription(HOST_ID, SPACE_ID)

    mock_sub.modify.assert_not_called()


@pytest.mark.asyncio
async def test_resume_drops_a_subscription_stripe_no_longer_knows():
    """Resuming a ghost subscription clears the stale pointer."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.side_effect = stripe_invalid_request_error("resource_missing")
        result = await resume_space_subscription(HOST_ID, SPACE_ID)

    assert result.subscription_status == "canceled"
    assert fake.spaces[0]["stripe_subscription_id"] is None
    assert fake.spaces[0]["current_period_end"] is None


@pytest.mark.asyncio
async def test_resume_rejects_a_foreign_space():
    """Another host's subscription cannot be resumed."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[paid_space(host_id=OTHER_HOST_ID)]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
        pytest.raises(ValueError, match="not the owner"),
    ):
        await resume_space_subscription(HOST_ID, SPACE_ID)

    mock_sub.modify.assert_not_called()


@pytest.mark.asyncio
async def test_resume_wraps_unexpected_stripe_errors():
    """Unexpected Stripe failures surface as a safe, generic message."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.modify.side_effect = RuntimeError("stripe down")
        with pytest.raises(ValueError, match="Could not resume this space"):
            await resume_space_subscription(HOST_ID, SPACE_ID)


# ---------------------------------------------------------------------------
# detach_space_subscription (ghost-charge protection before deleting a space)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_detach_cancels_immediately_and_clears_the_space():
    """A space is never deleted while its subscription keeps charging."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.cancel.return_value = make_subscription(status="canceled")
        result = await detach_space_subscription(HOST_ID, SPACE_ID)

    assert result.success is True
    assert result.subscription_status == "canceled"
    assert mock_sub.cancel.call_args.args == ("sub_1",)
    # The row no longer points at a subscription, so it cannot look entitled.
    assert fake.spaces[0]["stripe_subscription_id"] is None
    assert fake.spaces[0]["current_period_end"] is None


@pytest.mark.asyncio
async def test_detach_without_a_subscription_is_a_noop():
    """A trial-only space can be deleted without touching Stripe."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[make_space(subscription_status="trialing")]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        result = await detach_space_subscription(HOST_ID, SPACE_ID)

    assert result.success is True
    assert result.subscription_status == "trialing"
    mock_sub.cancel.assert_not_called()


@pytest.mark.asyncio
async def test_detach_treats_a_missing_subscription_as_already_cancelled():
    """A subscription already gone in Stripe must not block the deletion."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.cancel.side_effect = stripe_invalid_request_error("resource_missing")
        result = await detach_space_subscription(HOST_ID, SPACE_ID)

    assert result.success is True
    assert result.subscription_status == "canceled"
    assert fake.spaces[0]["stripe_subscription_id"] is None


@pytest.mark.asyncio
async def test_detach_fails_closed_on_unexpected_stripe_errors():
    """If Stripe cannot confirm cancellation, the space must NOT be deleted."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_sub.cancel.side_effect = RuntimeError("stripe down")
        with pytest.raises(ValueError, match="Could not cancel this space"):
            await detach_space_subscription(HOST_ID, SPACE_ID)

    # The pointer survives so the caller aborts the deletion instead of
    # leaving a subscription that keeps charging for a deleted space.
    assert fake.spaces[0]["stripe_subscription_id"] == "sub_1"


@pytest.mark.asyncio
async def test_detach_rejects_a_foreign_space():
    """Another host's subscription cannot be detached."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[paid_space(host_id=OTHER_HOST_ID)]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
        pytest.raises(ValueError, match="not the owner"),
    ):
        await detach_space_subscription(HOST_ID, SPACE_ID)

    mock_sub.cancel.assert_not_called()


# ---------------------------------------------------------------------------
# process_webhook_event — checkout.session.completed
# ---------------------------------------------------------------------------


def make_event(event_type, data_object):
    """Build a Stripe webhook event as returned by ``construct_event``."""
    return {"id": "evt_1", "type": event_type, "data": {"object": data_object}}


def make_real_event(event_type, data_object):
    """Build a REAL ``stripe.Event`` — the type ``construct_event`` returns.

    ``stripe.Event`` is a ``StripeObject``: ATTRIBUTE access only and NO ``.get()``
    method. The dict-based ``make_event`` above is a convenient double, but it
    hides any handler that reads the payload as a dictionary — such a handler
    passes every dict test and then raises ``AttributeError`` on the first real
    webhook. The tests using this helper exercise the true object shape.
    """
    return stripe.Event.construct_from(
        {"id": "evt_real_1", "type": event_type, "data": {"object": data_object}},
        "sk_test_secret",
    )


PAYLOAD = b"raw-payload"
SIGNATURE = "t=1,v1=abc"


@pytest.mark.asyncio
async def test_webhook_checkout_completed_activates_only_its_own_space():
    """A completed checkout activates exactly the space in its metadata."""
    period_end = future_timestamp(30)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))],
        spaces=[
            make_space("space-paid", subscription_status="trialing"),
            make_space("space-free", subscription_status="trialing"),
        ],
    )
    event = make_event(
        "checkout.session.completed",
        {
            "id": "cs_live_1",
            "subscription": "sub_new",
            "metadata": {"host_id": HOST_ID, "space_id": "space-paid"},
        },
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_webhook.construct_event.return_value = event
        mock_sub.retrieve.return_value = make_subscription(
            subscription_id="sub_new", status="active", current_period_end=period_end
        )
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

        paid = await get_space_entitlement("space-paid")
        free = await get_space_entitlement("space-free")

    assert result == {"received": True}
    assert mock_sub.retrieve.call_args.args == ("sub_new",)

    paid_row = next(row for row in fake.spaces if row["id"] == "space-paid")
    assert paid_row["stripe_subscription_id"] == "sub_new"
    assert paid_row["subscription_status"] == "active"
    assert paid_row["current_period_end"] == _timestamp_to_iso(period_end)

    # Only the subscribed space is entitled; its sibling stays locked.
    assert paid is not None and paid.entitled is True
    assert free is not None and free.entitled is False


@pytest.mark.asyncio
async def test_webhook_verifies_the_signature_before_touching_billing_state():
    """An invalid signature can never mutate billing state."""
    import stripe

    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_webhook.construct_event.side_effect = stripe.SignatureVerificationError(
            "bad signature", SIGNATURE
        )
        with pytest.raises(ValueError, match="Invalid signature"):
            await process_webhook_event(PAYLOAD, SIGNATURE)

    mock_sub.retrieve.assert_not_called()
    assert fake.spaces[0]["subscription_status"] == "active"


@pytest.mark.asyncio
async def test_webhook_rejects_a_malformed_payload():
    """An unparsable payload is rejected with a safe message."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.side_effect = ValueError("no json")
        with pytest.raises(ValueError, match="Invalid payload"):
            await process_webhook_event(PAYLOAD, SIGNATURE)


@pytest.mark.asyncio
async def test_webhook_ignores_checkout_without_space_metadata():
    """Legacy sessions without space_id must not guess a space."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])
    event = make_event(
        "checkout.session.completed", {"id": "cs_live_2", "subscription": "sub_x"}
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    mock_sub.retrieve.assert_not_called()
    assert fake.spaces[0]["stripe_subscription_id"] == "sub_1"


@pytest.mark.asyncio
async def test_webhook_reports_a_subscription_it_cannot_retrieve():
    """A failed retrieve surfaces as an error so Stripe retries the event."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[make_space(SPACE_ID)])
    event = make_event(
        "checkout.session.completed",
        {
            "subscription": "sub_new",
            "metadata": {"host_id": HOST_ID, "space_id": SPACE_ID},
        },
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_webhook.construct_event.return_value = event
        mock_sub.retrieve.side_effect = RuntimeError("stripe down")
        with pytest.raises(ValueError, match="Could not retrieve the subscription"):
            await process_webhook_event(PAYLOAD, SIGNATURE)

    assert fake.spaces[0]["stripe_subscription_id"] is None


# ---------------------------------------------------------------------------
# process_webhook_event — customer.subscription.updated / .deleted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_webhook_subscription_updated_syncs_the_mapped_space():
    """A payment failure (past_due) is mirrored onto the owning space only."""
    period_end = future_timestamp(5)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))],
        spaces=[paid_space("space-paid", subscription_id="sub_1"), make_space("free")],
    )
    event = make_event(
        "customer.subscription.updated",
        {
            "id": "sub_1",
            "status": "past_due",
            "current_period_end": period_end,
            "cancel_at_period_end": False,
        },
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

        paid = await get_space_entitlement("space-paid")

    assert result == {"received": True}
    paid_row = next(row for row in fake.spaces if row["id"] == "space-paid")
    assert paid_row["subscription_status"] == "past_due"
    assert paid_row["current_period_end"] == _timestamp_to_iso(period_end)
    # past_due is not ``active``, so the space loses guest access immediately.
    assert paid is not None and paid.entitled is False


@pytest.mark.asyncio
async def test_webhook_subscription_deleted_locks_the_space():
    """When Stripe ends the subscription the space stops being entitled."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))], spaces=[paid_space()]
    )
    event = make_event(
        "customer.subscription.deleted", {"id": "sub_1", "status": "canceled"}
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        await process_webhook_event(PAYLOAD, SIGNATURE)
        entitlement = await get_space_entitlement(SPACE_ID)

    assert fake.spaces[0]["subscription_status"] == "canceled"
    assert entitlement is not None and entitlement.entitled is False


@pytest.mark.asyncio
async def test_webhook_subscription_deleted_keeps_an_open_trial_alive():
    """A cancelled subscription still leaves the space on the account trial."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=future_iso(6))], spaces=[paid_space()]
    )
    event = make_event(
        "customer.subscription.deleted", {"id": "sub_1", "status": "canceled"}
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        await process_webhook_event(PAYLOAD, SIGNATURE)
        entitlement = await get_space_entitlement(SPACE_ID)

    assert entitlement is not None
    assert entitlement.entitled is True
    assert entitlement.entitlement_status == "trial"


@pytest.mark.asyncio
async def test_webhook_ignores_a_subscription_mapped_to_no_space():
    """Events for subscriptions this database does not know are ignored."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])
    event = make_event(
        "customer.subscription.updated", {"id": "sub_unknown", "status": "active"}
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    assert fake.spaces[0]["subscription_status"] == "active"


@pytest.mark.asyncio
async def test_webhook_ignores_a_subscription_event_without_an_id():
    """A malformed subscription event changes nothing."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])
    event = make_event("customer.subscription.updated", {"status": "canceled"})

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    assert fake.spaces[0]["subscription_status"] == "active"


@pytest.mark.asyncio
async def test_webhook_acknowledges_unhandled_event_types():
    """Unknown events are acknowledged so Stripe stops retrying them."""
    fake = FakeSupabaseClient(hosts=[make_host()], spaces=[paid_space()])
    event = make_event("invoice.payment_succeeded", {"id": "in_1"})

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    assert fake.spaces[0]["subscription_status"] == "active"


# ---------------------------------------------------------------------------
# purge_host_account (billing-first deletion: no charge may survive)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_purge_deletes_the_stripe_customer_and_every_local_record():
    """One Customer deletion cancels every per-space subscription at once."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id="cus_1")],
        spaces=[
            paid_space("space-a", subscription_id="sub_a"),
            paid_space("space-b", subscription_id="sub_b"),
            make_space("space-trial", subscription_status="trialing"),
        ],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Customer") as mock_customer,
    ):
        result = await purge_host_account(HOST_ID)

    assert result.success is True
    assert result.deleted_spaces == 3
    assert result.deleted_host_record is True
    assert result.canceled_subscription_ids == ["sub_a", "sub_b"]

    # Deleting the single Customer is what cancels all per-space subscriptions.
    assert mock_customer.delete.call_count == 1
    assert mock_customer.delete.call_args.args == ("cus_1",)
    assert fake.spaces == []
    assert fake.hosts == []


@pytest.mark.asyncio
async def test_purge_fails_closed_when_stripe_cannot_delete_the_customer():
    """If Stripe may still charge, nothing local is deleted."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id="cus_1")], spaces=[paid_space()]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Customer") as mock_customer,
    ):
        mock_customer.delete.side_effect = stripe_invalid_request_error("some_other")
        with pytest.raises(ValueError, match="Could not delete the billing profile"):
            await purge_host_account(HOST_ID)

    # The caller must abort before removing the auth user, so the rows survive.
    assert len(fake.spaces) == 1
    assert len(fake.hosts) == 1


@pytest.mark.asyncio
async def test_purge_continues_when_the_customer_is_already_gone():
    """A customer already deleted in Stripe must not block the local cleanup."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id="cus_gone")], spaces=[paid_space()]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Customer") as mock_customer,
    ):
        mock_customer.delete.side_effect = stripe_invalid_request_error(
            "resource_missing"
        )
        result = await purge_host_account(HOST_ID)

    assert result.success is True
    assert result.deleted_spaces == 1
    assert fake.spaces == []
    assert fake.hosts == []


@pytest.mark.asyncio
async def test_purge_without_a_billing_profile_skips_stripe():
    """An account that never subscribed is purged locally only."""
    fake = FakeSupabaseClient(
        hosts=[make_host(stripe_customer_id=None)], spaces=[make_space(SPACE_ID)]
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Customer") as mock_customer,
    ):
        result = await purge_host_account(HOST_ID)

    assert result.success is True
    assert result.canceled_subscription_ids == []
    assert result.deleted_host_record is True
    mock_customer.delete.assert_not_called()


@pytest.mark.asyncio
async def test_purge_never_touches_another_hosts_records():
    """Purging one account must leave every other account intact."""
    fake = FakeSupabaseClient(
        hosts=[
            make_host(stripe_customer_id="cus_1"),
            make_host(OTHER_HOST_ID, "cus_2"),
        ],
        spaces=[
            paid_space("space-mine", HOST_ID, subscription_id="sub_mine"),
            paid_space("space-theirs", OTHER_HOST_ID, subscription_id="sub_theirs"),
        ],
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Customer") as mock_customer,
    ):
        result = await purge_host_account(HOST_ID)

    assert result.deleted_spaces == 1
    assert result.canceled_subscription_ids == ["sub_mine"]
    assert [row["id"] for row in fake.spaces] == ["space-theirs"]
    assert [row["id"] for row in fake.hosts] == [OTHER_HOST_ID]
    assert mock_customer.delete.call_args.args == ("cus_1",)


# ---------------------------------------------------------------------------
# process_webhook_event — REAL stripe.Event objects (regression guard)
# ---------------------------------------------------------------------------


def test_real_stripe_event_is_an_object_not_a_dict():
    """Pin the contract the webhook handler must respect.

    ``construct_event`` returns a ``stripe.Event`` (a ``StripeObject``), not a
    mapping. Any handler that reads it as a dict works under the ``make_event``
    doubles and then raises ``AttributeError`` on the first production webhook.
    """
    event = make_real_event("customer.subscription.updated", {"id": "sub_1"})

    assert isinstance(event, stripe.Event)
    assert not isinstance(event, dict)
    assert event.type == "customer.subscription.updated"
    assert event.data.object.id == "sub_1"


@pytest.mark.asyncio
async def test_webhook_real_event_checkout_completed_activates_the_space():
    """A real Checkout event object still resolves metadata + subscription."""
    period_end = future_timestamp(12)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(3))],
        spaces=[make_space(SPACE_ID), make_space("free")],
    )
    event = make_real_event(
        "checkout.session.completed",
        {
            "id": "cs_real_1",
            "subscription": "sub_new",
            "metadata": {"host_id": HOST_ID, "space_id": SPACE_ID},
        },
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
        patch("app.features.billing.service.stripe.Subscription") as mock_sub,
    ):
        mock_webhook.construct_event.return_value = event
        mock_sub.retrieve.return_value = make_subscription(
            subscription_id="sub_new", status="active", current_period_end=period_end
        )
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    mock_sub.retrieve.assert_called_once_with("sub_new")
    own = next(row for row in fake.spaces if row["id"] == SPACE_ID)
    other = next(row for row in fake.spaces if row["id"] == "free")
    assert own["stripe_subscription_id"] == "sub_new"
    assert own["subscription_status"] == "active"
    assert own["current_period_end"] == _timestamp_to_iso(period_end)
    # Hard multi-tenancy: the sibling space is never touched.
    assert other["stripe_subscription_id"] is None
    assert other["subscription_status"] == "trialing"


@pytest.mark.asyncio
async def test_webhook_real_event_subscription_updated_syncs_the_mapped_space():
    """A real Subscription event object is synced onto its owning space only."""
    period_end = future_timestamp(5)
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))],
        spaces=[paid_space("space-paid", subscription_id="sub_1"), make_space("free")],
    )
    event = make_real_event(
        "customer.subscription.updated",
        {
            "id": "sub_1",
            "status": "past_due",
            "current_period_end": period_end,
            "cancel_at_period_end": False,
        },
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    paid_row = next(row for row in fake.spaces if row["id"] == "space-paid")
    free_row = next(row for row in fake.spaces if row["id"] == "free")
    assert paid_row["subscription_status"] == "past_due"
    assert paid_row["current_period_end"] == _timestamp_to_iso(period_end)
    assert free_row["subscription_status"] == "trialing"


@pytest.mark.asyncio
async def test_webhook_real_event_subscription_deleted_locks_the_space():
    """A real deletion event flips the space to canceled and locks it."""
    fake = FakeSupabaseClient(
        hosts=[make_host(trial_ends_at=past_iso(1))], spaces=[paid_space()]
    )
    event = make_real_event(
        "customer.subscription.deleted", {"id": "sub_1", "status": "canceled"}
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

        entitlement = await get_space_entitlement(SPACE_ID)

    assert result == {"received": True}
    assert fake.spaces[0]["subscription_status"] == "canceled"
    assert entitlement is not None and entitlement.entitled is False


@pytest.mark.asyncio
async def test_webhook_real_event_with_no_matching_space_writes_nothing():
    """An unmapped real event changes nothing (no ghost writes)."""
    fake = FakeSupabaseClient(
        hosts=[make_host()], spaces=[paid_space("space-paid", subscription_id="sub_1")]
    )
    event = make_real_event(
        "customer.subscription.updated", {"id": "sub_ghost", "status": "active"}
    )

    with (
        patch_supabase(fake),
        patch("app.features.billing.service.stripe.Webhook") as mock_webhook,
    ):
        mock_webhook.construct_event.return_value = event
        result = await process_webhook_event(PAYLOAD, SIGNATURE)

    assert result == {"received": True}
    assert fake.spaces[0]["subscription_status"] == "active"
    assert fake.spaces[0]["stripe_subscription_id"] == "sub_1"
