"""Service for Stripe Billing operations (Checkout, Portal, Webhooks).

Billing model — per-space subscriptions with an account-level trial:

* ONE Stripe Customer per host        -> ``public.hosts.stripe_customer_id``
* ONE Stripe Subscription PER SPACE   -> ``public.spaces.stripe_subscription_id``
* ONE account-level trial per host    -> ``public.hosts.trial_ends_at``

ENTITLEMENT RULE (single source of truth: ``public.get_space_entitlement``):
    a space is usable by guests while
    ``spaces.subscription_status == 'active'`` OR ``now() <= hosts.trial_ends_at``.

So while the account trial runs, EVERY space of that host works. Once it ends,
only spaces that hold their own paid subscription keep working.

CANCELLATION SEMANTICS:
    ``cancel_space_subscription`` sets ``cancel_at_period_end``. Stripe keeps the
    subscription ``active`` until ``spaces.current_period_end`` passes, so the
    space stays entitled for the period the host already paid for. Only a real
    ``customer.subscription.deleted`` event flips it to ``canceled`` and locks it.

GHOST-SUBSCRIPTION PROTECTION:
    ``detach_space_subscription`` cancels a space's subscription in Stripe BEFORE
    its row is deleted, and ``purge_host_account`` deletes the host's single
    Stripe customer, which cancels every per-space subscription in one call.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, cast

import stripe

from app.core.config import settings
from app.core.database import get_supabase_client
from app.features.billing.schemas import (
    BillingOperationResponse,
    BillingSummaryResponse,
    CheckoutResponse,
    HostBillingRecord,
    PortalResponse,
    PurgeResponse,
    SpaceBillingRecord,
    SpaceEntitlement,
    SubscriptionStatus,
)

logger = logging.getLogger(__name__)

# Initialize Stripe with the Secret Key
stripe.api_key = settings.STRIPE_SECRET_KEY

# Stripe statuses that must collapse into our narrower CHECK-constrained set.
_STRIPE_TO_DB_STATUS: dict[str, SubscriptionStatus] = {
    "trialing": "trialing",
    "active": "active",
    "past_due": "past_due",
    "paused": "paused",
    "canceled": "canceled",
    "unpaid": "past_due",
    "incomplete": "past_due",
    "incomplete_expired": "canceled",
}

# Stripe subscription statuses that still represent a live, cancelable charge.
LIVE_STRIPE_STATUSES = frozenset(
    {"trialing", "active", "past_due", "paused", "unpaid", "incomplete"}
)

# DB-constrained statuses that still represent a live, cancelable subscription.
LIVE_DB_STATUSES = frozenset({"trialing", "active", "past_due", "paused"})

# Error code surfaced to guests when a space is locked for billing reasons.
SPACE_SUBSCRIPTION_REQUIRED = "SPACE_SUBSCRIPTION_REQUIRED"

# Columns read for billing decisions. Every query using them is scoped by
# host_id in addition to id (hard multi-tenancy isolation).
_SPACE_BILLING_COLUMNS = (
    "id, host_id, name, space_type, is_active, subscription_status, "
    "stripe_subscription_id, current_period_end"
)


class SpaceNotEntitledError(ValueError):
    """Raised when a space is locked: no paid subscription and the trial ended.

    Subclasses ``ValueError`` so existing error handling keeps working, but
    routers catch it FIRST to answer ``403 SPACE_SUBSCRIPTION_REQUIRED`` instead
    of a generic ``400``.
    """


def map_stripe_status(raw_status: str | None) -> SubscriptionStatus:
    """Pure mapping from a raw Stripe status to our DB-constrained status."""
    if not raw_status:
        return "canceled"
    return _STRIPE_TO_DB_STATUS.get(raw_status, "past_due")


def is_billable_space_id(space_id: str) -> bool:
    """Pure predicate: does this id identify a real, billable space?

    Demo fixtures (``demo-*``) and malformed ids have no ``public.spaces`` row,
    so they cannot be entitlement-checked. Callers use this to skip the gate for
    them instead of turning them into 404s.
    """
    cleaned = (space_id or "").strip()
    if not cleaned or cleaned.startswith("demo-"):
        return False
    try:
        uuid.UUID(cleaned)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _resolve_price_id(space_type: str | None) -> str:
    """Map a space vertical to its Stripe Price id."""
    normalized = (space_type or "stay").strip()
    if normalized in ("menu", "real_estate"):
        # Verticals without a dedicated configured price fall back to the Stay
        # price so billing never hard-fails; each vertical gets its own env var
        # when it launches.
        return settings.STRIPE_PRICE_ID_STAY
    return settings.STRIPE_PRICE_ID_STAY


def _timestamp_to_iso(unix_seconds: float) -> str:
    """Pure conversion of a Stripe unix timestamp to an ISO-8601 UTC string."""
    return datetime.fromtimestamp(unix_seconds, tz=timezone.utc).isoformat()


def _read_attr(obj: Any, name: str) -> Any:
    """Pure attribute/key reader that works for Stripe objects and plain dicts."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _extract_metadata(obj: Any) -> dict[str, Any]:
    """Safely extracts metadata as a dict from a Stripe object or dict."""
    meta = _read_attr(obj, "metadata")
    if meta is None:
        return {}
    if hasattr(meta, "to_dict"):
        return cast(dict[str, Any], meta.to_dict())
    if isinstance(meta, dict):
        return meta
    return {}


def _read_period_end(subscription: Any) -> str | None:
    """Pure extraction of the paid-period end from a Stripe subscription.

    Stripe moved ``current_period_end`` onto subscription items in API version
    2025-03-31.basil, so both the legacy top-level shape and the per-item shape
    are supported.
    """
    raw = _read_attr(subscription, "current_period_end")
    if isinstance(raw, (int, float)) and not isinstance(raw, bool) and raw > 0:
        return _timestamp_to_iso(raw)

    items = _read_attr(subscription, "items")
    item_rows = _read_attr(items, "data")
    for item in item_rows or []:
        raw_item = _read_attr(item, "current_period_end")
        if (
            isinstance(raw_item, (int, float))
            and not isinstance(raw_item, bool)
            and raw_item > 0
        ):
            return _timestamp_to_iso(raw_item)
    return None


def _subscription_snapshot(
    subscription: Any,
) -> tuple[str, SubscriptionStatus, str | None, bool]:
    """Pure projection of a Stripe subscription onto the columns we persist."""
    subscription_id = str(_read_attr(subscription, "id") or "")
    status = map_stripe_status(str(_read_attr(subscription, "status") or ""))
    period_end = _read_period_end(subscription)
    cancel_at_period_end = bool(_read_attr(subscription, "cancel_at_period_end"))
    return subscription_id, status, period_end, cancel_at_period_end


def _build_new_host_payload(host_id: str) -> dict[str, Any]:
    """Pure builder for a brand-new ``hosts`` row, granting the trial ONCE.

    ``public.hosts.trial_ends_at`` has no database default, so the configured
    ``ACCOUNT_TRIAL_DAYS`` is the only source of truth for the trial length.
    ``trial_claimed_at`` freezes the start so the trial can never be restarted.
    """
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "id": host_id,
        "trial_claimed_at": now.isoformat(),
    }
    trial_days = settings.ACCOUNT_TRIAL_DAYS
    if trial_days > 0:
        payload["trial_ends_at"] = (now + timedelta(days=trial_days)).isoformat()
    return payload


async def _ensure_host_record(host_id: str) -> HostBillingRecord:
    """Return the host's account-level billing row, creating it if absent.

    The account trial is granted exactly once, here, on first insert. Re-reading
    an existing row never touches ``trial_ends_at``, so the trial can neither be
    extended nor restarted by repeated calls.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    def _fetch() -> Any:
        return supabase.table("hosts").select("*").eq("id", host_id).execute()

    response = await asyncio.to_thread(_fetch)
    if response.data:
        return HostBillingRecord.model_validate(cast(dict, response.data[0]))

    payload = _build_new_host_payload(host_id)

    def _insert() -> Any:
        return supabase.table("hosts").insert(payload).execute()

    try:
        inserted = await asyncio.to_thread(_insert)
    except Exception as exc:  # noqa: BLE001
        # Concurrent first touch: the row now exists. Re-read it rather than
        # failing, and never overwrite the trial another request just granted.
        logger.warning("Concurrent hosts insert for %s: %s", host_id, exc)
        refetched = await asyncio.to_thread(_fetch)
        if refetched.data:
            return HostBillingRecord.model_validate(cast(dict, refetched.data[0]))
        raise ValueError("Could not initialise the host billing record.") from exc

    if inserted.data:
        return HostBillingRecord.model_validate(cast(dict, inserted.data[0]))
    raise ValueError("Could not initialise the host billing record.")


async def get_host_billing(host_id: str) -> HostBillingRecord:
    """Public read accessor for the host's account-level billing record."""
    return await _ensure_host_record(host_id)


async def _get_or_create_stripe_customer(host_id: str, email: str | None = None) -> str:
    """Return the Stripe Customer id for a host, creating it once if needed.

    Every per-space subscription of this host is attached to this ONE customer,
    which is what lets account deletion cancel them all in a single call.
    """
    host = await _ensure_host_record(host_id)
    existing = (host.stripe_customer_id or "").strip()
    if existing:
        return existing

    try:

        def _create_customer() -> Any:
            kwargs: dict[str, Any] = {"metadata": {"host_id": host_id}}
            if email and email.strip():
                kwargs["email"] = email.strip()
            return stripe.Customer.create(**kwargs)

        customer = await asyncio.to_thread(_create_customer)
    except Exception as e:  # noqa: BLE001
        logger.error("Error creating Stripe customer for host %s: %s", host_id, e)
        raise ValueError("Could not create the billing profile.") from e

    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    customer_id = str(customer.id)

    def _persist_customer() -> Any:
        return (
            supabase.table("hosts")
            .update({"stripe_customer_id": customer_id})
            .eq("id", host_id)
            .execute()
        )

    await asyncio.to_thread(_persist_customer)
    return customer_id


# ---------------------------------------------------------------------------
# Entitlement (the gate every guest-facing feature must pass)
# ---------------------------------------------------------------------------


async def get_space_entitlement(space_id: str) -> SpaceEntitlement | None:
    """Return the atomic entitlement snapshot for a space, or None if unknown.

    Reads the ``public.get_space_entitlement`` RPC so the verdict comes from the
    exact same SQL predicate that ``get_guest_space_by_slug`` and
    ``match_space_knowledge`` use. Keeping the rule in one place means the Python
    gate and the SQL gates can never drift apart.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    def _call() -> Any:
        return supabase.rpc(
            "get_space_entitlement", {"target_space_id": space_id}
        ).execute()

    try:
        response = await asyncio.to_thread(_call)
    except Exception as exc:  # noqa: BLE001
        logger.error("Entitlement lookup failed for space %s: %s", space_id, exc)
        raise ValueError("Could not verify this space's subscription.") from exc

    rows = response.data if isinstance(response.data, list) else []
    if not rows:
        return None
    return SpaceEntitlement.model_validate(cast(dict, rows[0]))


async def ensure_space_entitled(space_id: str) -> SpaceEntitlement:
    """Return the entitlement snapshot or raise when the space is locked.

    Raises:
        ValueError: the space does not exist.
        SpaceNotEntitledError: the space exists but has no paid subscription and
            the owning account's trial has ended. Routers turn this into
            ``403 SPACE_SUBSCRIPTION_REQUIRED``.
    """
    entitlement = await get_space_entitlement(space_id)
    if entitlement is None:
        raise ValueError("Space not found.")
    if not entitlement.entitled:
        raise SpaceNotEntitledError(SPACE_SUBSCRIPTION_REQUIRED)
    return entitlement


async def get_billing_summary(host_id: str) -> BillingSummaryResponse:
    """Return the host's account trial plus the entitlement of every owned space.

    Every verdict comes from the ``public.get_space_entitlement`` RPC, so the
    dashboard shows exactly what the guest-facing gates will enforce.
    """
    host = await _ensure_host_record(host_id)

    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    def _fetch_space_ids() -> Any:
        return supabase.table("spaces").select("id").eq("host_id", host_id).execute()

    try:
        response = await asyncio.to_thread(_fetch_space_ids)
    except Exception as e:  # noqa: BLE001
        logger.error("Could not enumerate spaces for host %s: %s", host_id, e)
        raise ValueError("Could not load the billing summary.") from e

    rows = response.data if isinstance(response.data, list) else []
    space_ids = [
        str(row["id"]) for row in rows if isinstance(row, dict) and row.get("id")
    ]

    entitlements = await asyncio.gather(
        *(get_space_entitlement(space_id) for space_id in space_ids)
    )

    return BillingSummaryResponse(
        host=host,
        spaces=[item for item in entitlements if item is not None],
    )


# ---------------------------------------------------------------------------
# Space lookup (always tenant-scoped)
# ---------------------------------------------------------------------------


async def _fetch_owned_spaces(
    host_id: str, space_ids: list[str]
) -> list[SpaceBillingRecord]:
    """Fetch spaces owned by the host, optionally restricted to given ids.

    Every branch keeps the hard ``host_id`` filter, so a caller can never read a
    space belonging to another host even by supplying its id explicitly.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    wanted = [sid.strip() for sid in space_ids if sid and sid.strip()]

    def _fetch() -> Any:
        query = (
            supabase.table("spaces")
            .select(_SPACE_BILLING_COLUMNS)
            .eq("host_id", host_id)
        )
        query = query.in_("id", wanted) if wanted else query.eq("is_active", True)
        return query.execute()

    response = await asyncio.to_thread(_fetch)
    rows = response.data if isinstance(response.data, list) else []
    return [SpaceBillingRecord.model_validate(cast(dict, row)) for row in rows]


async def _require_owned_space(host_id: str, space_id: str) -> SpaceBillingRecord:
    """Return one owned space or raise. Hard filter: id AND host_id."""
    spaces = await _fetch_owned_spaces(host_id, [space_id])
    match = next(
        (
            space
            for space in spaces
            if space.id == space_id and space.host_id == host_id
        ),
        None,
    )
    if match is None:
        raise ValueError("Space not found or you are not the owner.")
    return match


# ---------------------------------------------------------------------------
# Checkout & Portal
# ---------------------------------------------------------------------------


async def create_checkout_session(
    host_id: str,
    user_email: str,
    space_id: str,
    return_url: str | None = None,
) -> CheckoutResponse:
    """Create a Stripe Checkout session for ONE space's dedicated subscription.

    The subscription is attached to the host's single Stripe Customer, so the
    Customer Portal lists every space of that host in one place.
    """
    space = await _require_owned_space(host_id, space_id)

    # Guard: a space with a live subscription cannot be re-created via Checkout.
    existing_sub = (space.stripe_subscription_id or "").strip()
    if existing_sub and space.subscription_status in LIVE_DB_STATUSES:
        raise ValueError(
            "This space already has a subscription. "
            "Use the billing portal to manage it."
        )

    customer_id = await _get_or_create_stripe_customer(host_id, user_email)

    base_url = settings.FRONTEND_URL.rstrip("/")
    success_url = return_url or f"{base_url}/dashboard"
    cancel_url = return_url or f"{base_url}/dashboard"

    # space_id travels on BOTH the session and the subscription so the webhook
    # can resolve the affected space without scanning anything.
    correlation = {"host_id": host_id, "space_id": space_id}

    try:
        kwargs: dict[str, Any] = {
            "line_items": [
                {"price": _resolve_price_id(space.space_type), "quantity": 1}
            ],
            "mode": "subscription",
            "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url,
            "customer": customer_id,
            "client_reference_id": host_id,
            "subscription_data": {
                "metadata": correlation,
                "description": space.name.strip()
                if space.name
                else "Абонамент за обект",
            },
            "metadata": correlation,
        }

        def _create_stripe_session() -> Any:
            return stripe.checkout.Session.create(**kwargs)

        session = await asyncio.to_thread(_create_stripe_session)
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
    except Exception as e:  # noqa: BLE001
        logger.error("Error creating Stripe checkout session: %s", e)
        raise ValueError("Could not create checkout session.") from e


async def create_portal_session(
    host_id: str, return_url: str | None = None
) -> PortalResponse:
    """Creates a Stripe Customer Portal session for the host's billing.

    Host-scoped on purpose: the single Stripe Customer owns every per-space
    subscription, so the host manages all of them from one portal.
    """
    host = await _ensure_host_record(host_id)
    stripe_customer_id = (host.stripe_customer_id or "").strip()
    if not stripe_customer_id:
        raise ValueError("This account does not have a billing profile yet.")

    base_url = settings.FRONTEND_URL.rstrip("/")
    portal_return_url = return_url or f"{base_url}/dashboard"

    try:

        def _create_portal_session() -> Any:
            return stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=portal_return_url,
            )

        session = await asyncio.to_thread(_create_portal_session)
        return PortalResponse(portal_url=session.url)
    except Exception as e:  # noqa: BLE001
        logger.error("Error creating Stripe portal session: %s", e)
        raise ValueError("Could not create customer portal session.") from e


# ---------------------------------------------------------------------------
# Stripe -> DB synchronisation (per-space)
# ---------------------------------------------------------------------------


async def _sync_space_subscription(
    space_id: str, subscription: Any
) -> SpaceBillingRecord | None:
    """Persist authoritative Stripe state onto ONE space row.

    Stripe is the single source of truth for subscription state. ``spaces`` only
    mirrors what Stripe reported, so no status here is ever inferred locally.

    Returns None (and logs) when the subscription points at a space that no
    longer exists — the ghost-subscription case that purge/detach prevent.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    subscription_id, status, period_end, _cancel_at_period_end = _subscription_snapshot(
        subscription
    )

    payload: dict[str, Any] = {
        "stripe_subscription_id": subscription_id or None,
        "subscription_status": status,
        "current_period_end": period_end,
    }

    def _update() -> Any:
        return supabase.table("spaces").update(payload).eq("id", space_id).execute()

    try:
        response = await asyncio.to_thread(_update)
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to sync subscription for space %s: %s", space_id, e)
        raise ValueError("Could not update the space billing state.") from e

    rows = response.data if isinstance(response.data, list) else []
    if not rows:
        logger.warning(
            "Subscription %s referenced missing space %s; ignoring.",
            subscription_id or "<unknown>",
            space_id,
        )
        return None
    return SpaceBillingRecord.model_validate(cast(dict, rows[0]))


async def _clear_space_subscription(space_id: str) -> None:
    """Reset a space to "never subscribed" so the account trial covers it again.

    Used when Stripe no longer knows the subscription (deleted in the Stripe
    dashboard) — without this, the space would keep pointing at a subscription
    id that does not exist and wrongly look entitled.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    def _update() -> Any:
        return (
            supabase.table("spaces")
            .update(
                {
                    "stripe_subscription_id": None,
                    "current_period_end": None,
                    "subscription_status": "trialing",
                }
            )
            .eq("id", space_id)
            .execute()
        )

    await asyncio.to_thread(_update)


async def _find_space_id_by_subscription(subscription_id: str) -> str | None:
    """Resolve the owning space of a subscription id, or None when unmapped."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    def _find() -> Any:
        return (
            supabase.table("spaces")
            .select("id")
            .eq("stripe_subscription_id", subscription_id)
            .limit(1)
            .maybe_single()
            .execute()
        )

    try:
        response = await asyncio.to_thread(_find)
    except Exception as e:  # noqa: BLE001
        logger.error(
            "Failed to resolve space for subscription %s: %s", subscription_id, e
        )
        raise ValueError("Could not resolve the space for this subscription.") from e

    row = response.data if response is not None else None
    if isinstance(row, dict) and row.get("id"):
        return str(row["id"])
    return None


async def process_webhook_event(payload_bytes: bytes, sig_header: str) -> dict:
    """Verify and route a Stripe webhook event to its per-space handler.

    Signature verification happens BEFORE any business logic so an unsigned or
    tampered payload can never mutate billing state.
    """
    try:
        event = stripe.Webhook.construct_event(
            payload_bytes, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.warning("Invalid Stripe webhook payload: %s", e)
        raise ValueError("Invalid payload") from e
    except stripe.SignatureVerificationError as e:
        logger.warning("Invalid Stripe webhook signature: %s", e)
        raise ValueError("Invalid signature") from e

    # `construct_event` returns a typed `stripe.Event` — a `StripeObject` with
    # ATTRIBUTE access and NO `.get()` method. `_read_attr` normalises that and
    # the plain-dict shape tests hand us, so the handler never assumes a
    # container Stripe does not actually provide. Reading `event["data"]` as a
    # dict here would raise AttributeError on every real webhook.
    event_type = str(_read_attr(event, "type") or "")
    data_object = _read_attr(_read_attr(event, "data"), "object")

    if event_type in (
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    ):
        metadata = _extract_metadata(data_object)
        space_id = str(metadata.get("space_id") or "")
        subscription_id = _read_attr(data_object, "subscription")
        if space_id and subscription_id:

            def _retrieve_subscription() -> Any:
                return stripe.Subscription.retrieve(str(subscription_id))

            try:
                subscription = await asyncio.to_thread(_retrieve_subscription)
            except Exception as e:  # noqa: BLE001
                logger.error(
                    "Could not retrieve subscription %s: %s", subscription_id, e
                )
                raise ValueError("Could not retrieve the subscription.") from e

            await _sync_space_subscription(space_id, subscription)
            logger.info(
                "Space %s subscription %s activated.", space_id, subscription_id
            )
        else:
            logger.warning(
                "Checkout event %s missing space_id/subscription metadata; ignoring.",
                event_type,
            )

    elif event_type in (
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        subscription_id = str(_read_attr(data_object, "id") or "")
        if not subscription_id:
            logger.warning("Subscription event %s missing subscription id.", event_type)
        else:
            mapped_space_id = await _find_space_id_by_subscription(subscription_id)
            if mapped_space_id:
                await _sync_space_subscription(mapped_space_id, data_object)
                logger.info(
                    "Subscription %s (%s) synced to space %s.",
                    subscription_id,
                    event_type,
                    mapped_space_id,
                )
            else:
                logger.warning(
                    "No space mapped to subscription %s (%s); ignoring.",
                    subscription_id,
                    event_type,
                )

    else:
        logger.debug("Unhandled Stripe event type: %s", event_type)

    return {"received": True}


# ---------------------------------------------------------------------------
# Cancellation, resume and detach (space-scoped)
# ---------------------------------------------------------------------------


async def _load_live_subscription(
    host_id: str, space_id: str
) -> tuple[SpaceBillingRecord, str]:
    """Return an owned space plus its live subscription id, or raise."""
    space = await _require_owned_space(host_id, space_id)
    subscription_id = (space.stripe_subscription_id or "").strip()
    if not subscription_id:
        raise ValueError("This space does not have a subscription.")
    return space, subscription_id


async def cancel_space_subscription(
    host_id: str, space_id: str
) -> BillingOperationResponse:
    """Cancel ONE space's subscription at the end of its paid period.

    Access is preserved until ``spaces.current_period_end``: Stripe keeps the
    subscription ``active`` while ``cancel_at_period_end`` is set, so the space
    stays entitled for the period the host already paid for. Only the later
    ``customer.subscription.deleted`` event locks it.
    """
    space = await _require_owned_space(host_id, space_id)
    subscription_id = (space.stripe_subscription_id or "").strip()

    if not subscription_id:
        # Nothing to cancel: the space is on the account trial only.
        return BillingOperationResponse(
            success=True,
            subscription_status=space.subscription_status,
            current_period_end=space.current_period_end,
        )

    try:

        def _schedule_cancel() -> Any:
            return stripe.Subscription.modify(
                subscription_id, cancel_at_period_end=True
            )

        subscription = await asyncio.to_thread(_schedule_cancel)
    except stripe.InvalidRequestError as e:
        if getattr(e, "code", None) == "resource_missing":
            # Stripe no longer knows this subscription: drop the stale pointer so
            # the space cannot claim a subscription it does not have.
            await _clear_space_subscription(space_id)
            return BillingOperationResponse(
                success=True, subscription_status="canceled"
            )
        logger.error("Could not cancel subscription %s: %s", subscription_id, e)
        raise ValueError("Could not cancel this space's subscription.") from e
    except Exception as e:  # noqa: BLE001
        logger.error("Could not cancel subscription %s: %s", subscription_id, e)
        raise ValueError("Could not cancel this space's subscription.") from e

    await _sync_space_subscription(space_id, subscription)
    return BillingOperationResponse(
        success=True,
        subscription_status=map_stripe_status(
            str(_read_attr(subscription, "status") or "")
        ),
        current_period_end=_read_period_end(subscription),
        scheduled_cancellation=bool(_read_attr(subscription, "cancel_at_period_end")),
    )


async def resume_space_subscription(
    host_id: str, space_id: str
) -> BillingOperationResponse:
    """Undo a scheduled cancellation so the space keeps renewing."""
    _space, subscription_id = await _load_live_subscription(host_id, space_id)

    try:

        def _resume() -> Any:
            return stripe.Subscription.modify(
                subscription_id, cancel_at_period_end=False
            )

        subscription = await asyncio.to_thread(_resume)
    except stripe.InvalidRequestError as e:
        if getattr(e, "code", None) == "resource_missing":
            await _clear_space_subscription(space_id)
            return BillingOperationResponse(
                success=True, subscription_status="canceled"
            )
        logger.error("Could not resume subscription %s: %s", subscription_id, e)
        raise ValueError("Could not resume this space's subscription.") from e
    except Exception as e:  # noqa: BLE001
        logger.error("Could not resume subscription %s: %s", subscription_id, e)
        raise ValueError("Could not resume this space's subscription.") from e

    await _sync_space_subscription(space_id, subscription)
    return BillingOperationResponse(
        success=True,
        subscription_status=map_stripe_status(
            str(_read_attr(subscription, "status") or "")
        ),
        current_period_end=_read_period_end(subscription),
        scheduled_cancellation=bool(_read_attr(subscription, "cancel_at_period_end")),
    )


async def detach_space_subscription(
    host_id: str, space_id: str
) -> BillingOperationResponse:
    """Cancel a space's subscription IMMEDIATELY, before its row is deleted.

    Ghost-subscription protection: a space must never be deleted while its Stripe
    subscription keeps charging the host. Called by the spaces service before any
    ``DELETE FROM spaces``.
    """
    space = await _require_owned_space(host_id, space_id)
    subscription_id = (space.stripe_subscription_id or "").strip()

    if not subscription_id:
        return BillingOperationResponse(
            success=True, subscription_status=space.subscription_status
        )

    try:

        def _cancel_now() -> Any:
            try:
                return stripe.Subscription.cancel(subscription_id)
            except stripe.InvalidRequestError as e:
                if getattr(e, "code", None) == "resource_missing":
                    return None
                raise

        subscription = await asyncio.to_thread(_cancel_now)
    except Exception as e:  # noqa: BLE001
        # Fail closed: never delete a space row while Stripe may still charge.
        logger.error("Could not detach subscription %s: %s", subscription_id, e)
        raise ValueError("Could not cancel this space's subscription.") from e

    await _clear_space_subscription(space_id)
    return BillingOperationResponse(
        success=True,
        subscription_status=(
            map_stripe_status(str(_read_attr(subscription, "status") or ""))
            if subscription is not None
            else "canceled"
        ),
    )


# ---------------------------------------------------------------------------
# Account purge (ghost-billing protection)
# ---------------------------------------------------------------------------


async def purge_host_account(host_id: str) -> PurgeResponse:
    """Delete a host's billing footprint: Stripe customer, spaces, host row.

    Order matters and is deliberately billing-first:

    1. Collect every per-space ``stripe_subscription_id`` (for the report).
    2. DELETE the host's single Stripe Customer — Stripe cancels every attached
       per-space subscription in one call, so no charge can survive.
    3. Delete the spaces (cascades to knowledge_chunks).
    4. Delete the hosts billing row.

    If step 2 fails, nothing is deleted: the caller aborts before removing the
    auth user, which is what prevents orphaned subscriptions.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    host = await _ensure_host_record(host_id)
    stripe_customer_id = (host.stripe_customer_id or "").strip()

    def _fetch_spaces() -> Any:
        return (
            supabase.table("spaces")
            .select("id, stripe_subscription_id")
            .eq("host_id", host_id)
            .execute()
        )

    try:
        spaces_response = await asyncio.to_thread(_fetch_spaces)
    except Exception as e:  # noqa: BLE001
        logger.error("Could not enumerate spaces for host %s: %s", host_id, e)
        raise ValueError("Could not enumerate the spaces to purge.") from e

    space_rows = spaces_response.data if isinstance(spaces_response.data, list) else []
    deleted_spaces = len(space_rows)
    canceled_subscription_ids = sorted(
        {
            str(row["stripe_subscription_id"])
            for row in space_rows
            if isinstance(row, dict) and row.get("stripe_subscription_id")
        }
    )

    if stripe_customer_id:
        try:

            def _delete_customer() -> Any:
                return stripe.Customer.delete(stripe_customer_id)

            await asyncio.to_thread(_delete_customer)
        except stripe.InvalidRequestError as e:
            if getattr(e, "code", None) != "resource_missing":
                logger.error(
                    "Could not delete Stripe customer %s: %s", stripe_customer_id, e
                )
                raise ValueError("Could not delete the billing profile.") from e
            # Already gone in Stripe: proceed with the local cleanup.
            logger.warning("Stripe customer %s already deleted.", stripe_customer_id)
        except Exception as e:  # noqa: BLE001
            logger.error(
                "Could not delete Stripe customer %s: %s", stripe_customer_id, e
            )
            raise ValueError("Could not delete the billing profile.") from e

    def _delete_spaces() -> Any:
        return supabase.table("spaces").delete().eq("host_id", host_id).execute()

    def _delete_host() -> Any:
        return supabase.table("hosts").delete().eq("id", host_id).execute()

    try:
        await asyncio.to_thread(_delete_spaces)
        host_response = await asyncio.to_thread(_delete_host)
    except Exception as e:  # noqa: BLE001
        logger.error("Could not purge local records for host %s: %s", host_id, e)
        raise ValueError("Could not delete the account records.") from e

    host_rows = host_response.data if isinstance(host_response.data, list) else []

    return PurgeResponse(
        success=True,
        canceled_subscription_ids=canceled_subscription_ids,
        deleted_spaces=deleted_spaces,
        deleted_host_record=bool(host_rows),
    )
