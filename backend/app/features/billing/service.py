"""Service for Stripe Billing operations (Checkout, Portal, Webhooks).

Billing is HOST-scoped: one Stripe Customer and one Stripe Subscription per
host. Each enrolled space is a separate Subscription Item whose
``metadata.space_id`` links it back to ``public.spaces``. ``public.hosts`` is
the authoritative billing record; ``spaces.subscription_status`` is only a
denormalised display mirror.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, cast

import stripe
from postgrest.types import CountMethod

from app.core.config import settings
from app.core.database import get_supabase_client
from app.features.billing.schemas import (
    BillingOperationResponse,
    CheckoutResponse,
    HostBillingRecord,
    PortalResponse,
    PurgeResponse,
    SpaceBillingRecord,
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


def map_stripe_status(raw_status: str | None) -> SubscriptionStatus:
    """Pure mapping from a raw Stripe status to our DB-constrained status."""
    if not raw_status:
        return "canceled"
    return _STRIPE_TO_DB_STATUS.get(raw_status, "past_due")


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


async def _ensure_host_record(
    host_id: str, *, email: str | None = None
) -> HostBillingRecord:
    """Return the host's billing row, creating it if it does not exist yet."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    def _fetch() -> Any:
        return supabase.table("hosts").select("*").eq("id", host_id).execute()

    response = await asyncio.to_thread(_fetch)
    if response.data:
        return HostBillingRecord.model_validate(cast(dict, response.data[0]))

    def _insert() -> Any:
        return supabase.table("hosts").insert({"id": host_id}).execute()

    inserted = await asyncio.to_thread(_insert)
    if inserted.data:
        return HostBillingRecord.model_validate(cast(dict, inserted.data[0]))
    raise ValueError("Could not initialise the host billing record.")


async def get_host_billing(host_id: str, email: str | None = None) -> HostBillingRecord:
    """Public read accessor for the host's single billing record."""
    return await _ensure_host_record(host_id, email=email)


async def _get_or_create_stripe_customer(host_id: str, email: str | None = None) -> str:
    """Return the Stripe Customer id for a host, creating it once if needed."""
    host = await _ensure_host_record(host_id, email=email)
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
    except Exception as e:
        logger.error(f"Error creating Stripe customer for host {host_id}: {e}")
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


async def create_checkout_session(
    host_id: str,
    user_email: str,
    space_ids: list[str] | None = None,
    return_url: str | None = None,
) -> CheckoutResponse:
    """Create a Stripe Checkout session for the host's SINGLE subscription.

    The session enrolls one or more owned spaces as subscription items. If the
    host already has a live subscription, adding spaces goes through
    ``add_space_item`` instead, because Stripe forbids a second
    subscription-mode session on the same billing relationship.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    host = await _ensure_host_record(host_id, email=user_email)

    # Guard: a live subscription cannot be re-created via Checkout.
    if host.stripe_subscription_id and host.subscription_status != "canceled":
        raise ValueError(
            "This account already has an active subscription. "
            "Use the billing portal or add a space instead."
        )

    # 1. Resolve which owned spaces become subscription items.
    spaces = await _fetch_owned_spaces(host_id, space_ids or [])
    if not spaces:
        raise ValueError("No spaces available to subscribe. Create a space first.")

    unauthorized = [space for space in spaces if space.host_id != host_id]
    if unauthorized:
        raise ValueError("Unauthorized. You do not own one of these spaces.")

    enrolled_ids = json.dumps([space.id for space in spaces])
    # One line item per space so Stripe creates one Subscription Item per space.
    line_items = [{"price": _resolve_price_id(space.space_type), "quantity": 1} for space in spaces]

    # 2. Ensure the host has exactly one Stripe Customer.
    customer_id = await _get_or_create_stripe_customer(host_id, user_email)

    # 3. Determine success/cancel URLs
    base_url = settings.FRONTEND_URL.rstrip("/")
    success_url = return_url or f"{base_url}/dashboard"
    cancel_url = return_url or f"{base_url}/dashboard"

    # 4. Create the Stripe Checkout Session
    try:
        kwargs: dict[str, Any] = {
            "payment_method_types": ["card"],
            "line_items": line_items,
            "mode": "subscription",
            "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url,
            "customer": customer_id,
            "client_reference_id": host_id,
            "subscription_data": {
                "metadata": {"host_id": host_id, "space_ids": enrolled_ids}
            },
            "metadata": {"host_id": host_id, "space_ids": enrolled_ids},
        }

        def _create_stripe_session() -> Any:
            return stripe.checkout.Session.create(**kwargs)

        session = await asyncio.to_thread(_create_stripe_session)
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
    except Exception as e:
        logger.error(f"Error creating Stripe checkout session: {e}")
        raise ValueError(f"Could not create checkout session: {e}") from e


async def _fetch_owned_spaces(
    host_id: str, space_ids: list[str]
) -> list[SpaceBillingRecord]:
    """Fetch spaces owned by the host, optionally restricted to given ids."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    wanted = [sid.strip() for sid in space_ids if sid and sid.strip()]

    def _fetch() -> Any:
        query = (
            supabase.table("spaces")
            .select("id, host_id, space_type, is_active, subscription_status")
            .eq("host_id", host_id)
        )
        query = query.in_("id", wanted) if wanted else query.eq("is_active", True)
        return query.execute()

    response = await asyncio.to_thread(_fetch)
    rows = response.data if isinstance(response.data, list) else []
    return [SpaceBillingRecord.model_validate(cast(dict, row)) for row in rows]


async def _sync_subscription_from_stripe(
    host_id: str, subscription: Any, space_ids: list[str] | None = None
) -> None:
    """Persist authoritative Stripe subscription state onto hosts and mirror spaces."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    if isinstance(subscription, dict):
        subscription_id = str(subscription.get("id", "") or "")
        raw_status = str(subscription.get("status", "") or "")
        raw_trial_end = subscription.get("trial_end", None)
    else:
        subscription_id = str(getattr(subscription, "id", "") or "")
        raw_status = str(getattr(subscription, "status", "") or "")
        raw_trial_end = getattr(subscription, "trial_end", None)

    status = map_stripe_status(raw_status)

    trial_ends_at: str | None = None
    if isinstance(raw_trial_end, (int, float)) and raw_trial_end > 0:
        trial_ends_at = _timestamp_to_iso(raw_trial_end)

    host_payload: dict[str, Any] = {
        "stripe_subscription_id": subscription_id or None,
        "subscription_status": status,
    }
    if trial_ends_at:
        host_payload["trial_ends_at"] = trial_ends_at

    def _update_host() -> Any:
        return supabase.table("hosts").update(host_payload).eq("id", host_id).execute()

    await asyncio.to_thread(_update_host)

    # Mirror the authoritative status onto every space owned by the host.
    def _mirror_spaces() -> Any:
        return (
            supabase.table("spaces")
            .update({"subscription_status": status})
            .eq("host_id", host_id)
            .execute()
        )

    await asyncio.to_thread(_mirror_spaces)

    # Tag brand-new items with their space_id when checkout carried the mapping.
    if space_ids and subscription_id:
        await _tag_subscription_items(subscription_id, host_id, space_ids)


async def _list_subscription_items(subscription_id: str) -> list[Any]:
    """Return the Subscription Items of a subscription."""

    def _list() -> Any:
        return stripe.SubscriptionItem.list(subscription=subscription_id, limit=100)

    listing = await asyncio.to_thread(_list)
    return list(getattr(listing, "data", []) or [])


async def _find_item_for_space(
    subscription_id: str, space_id: str, items: list[Any] | None = None
) -> Any | None:
    """Find the Subscription Item tagged with the given space_id.

    Accepts an already-fetched ``items`` list to avoid a redundant Stripe call
    when the caller has just listed the subscription items.
    """
    if items is None:
        items = await _list_subscription_items(subscription_id)
    for item in items:
        metadata = getattr(item, "metadata", None) or {}
        if metadata.get("space_id") == space_id:
            return item
    return None


async def _tag_subscription_items(subscription_id: str, host_id: str, space_ids: list[str]) -> None:
    """Attach ``metadata.space_id`` to freshly created subscription items.

    Stripe Checkout cannot stamp per-item metadata, so after the session
    completes we verify the unmapped items match the space count, and tag them.
    """
    if not space_ids:
        return

    spaces = await _fetch_owned_spaces(host_id, space_ids)
    if not spaces:
        return

    # Let listing failures propagate
    items = await _list_subscription_items(subscription_id)

    mapped_space_ids = {
        (getattr(item, "metadata", None) or {}).get("space_id") 
        for item in items
    }
    
    supabase = get_supabase_client()
    if supabase:
        def _fetch_all_spaces() -> Any:
            return supabase.table("spaces").select("id").eq("host_id", host_id).execute()
        all_spaces_response = await asyncio.to_thread(_fetch_all_spaces)
        all_spaces = all_spaces_response.data if isinstance(all_spaces_response.data, list) else []
        valid_ids = {s.get("id") for s in all_spaces}
    else:
        valid_ids = {s.id for s in spaces}
        
    invalid_mapped_ids = {sid for sid in mapped_space_ids if sid and sid not in valid_ids}
    if invalid_mapped_ids:
        raise ValueError(f"Subscription has items mapped to unknown spaces: {invalid_mapped_ids}")
    
    unmapped_spaces = [space for space in spaces if space.id not in mapped_space_ids]
    if not unmapped_spaces:
        return
        
    unmapped_items = [
        item for item in items 
        if not (getattr(item, "metadata", None) or {}).get("space_id")
    ]

    unmapped_spaces_by_price: dict[str, list[SpaceBillingRecord]] = {}
    for space in unmapped_spaces:
        price = _resolve_price_id(space.space_type)
        unmapped_spaces_by_price.setdefault(price, []).append(space)

    unmapped_items_by_price: dict[str, list[Any]] = {}
    for item in unmapped_items:
        price_val = getattr(getattr(item, "price", None), "id", None)
        price_str: str = price_val if isinstance(price_val, str) else ""
        unmapped_items_by_price.setdefault(price_str, []).append(item)

    for price_id, grouped_spaces in unmapped_spaces_by_price.items():
        grouped_items = unmapped_items_by_price.get(price_id, [])
        if len(grouped_spaces) != len(grouped_items):
            msg = f"Cannot tag spaces: found {len(grouped_items)} items for {len(grouped_spaces)} spaces for price {price_id}."
            logger.error(msg)
            raise ValueError(msg)
            
        for space, item in zip(grouped_spaces, grouped_items, strict=True):
            def _tag(item_id: str = str(item.id), sid: str = space.id) -> Any:
                return stripe.SubscriptionItem.modify(item_id, metadata={"space_id": sid})
            
            # Let metadata update failures propagate
            await asyncio.to_thread(_tag)


async def create_portal_session(
    host_id: str, return_url: str | None = None
) -> PortalResponse:
    """Creates a Stripe Customer Portal session for the host's billing."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    # The host's single Stripe Customer owns every subscription item.
    host = await _ensure_host_record(host_id)
    stripe_customer_id = (host.stripe_customer_id or "").strip()
    if not stripe_customer_id:
        raise ValueError("This account does not have a billing profile yet.")

    # Build the return URL
    base_url = settings.FRONTEND_URL.rstrip("/")
    portal_return_url = return_url or f"{base_url}/dashboard"

    try:

        def _create_portal_session():
            return stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=portal_return_url,
            )

        session = await asyncio.to_thread(_create_portal_session)
        return PortalResponse(portal_url=session.url)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error creating Stripe portal session: {e}")
        raise ValueError("Could not create customer portal session.")


async def process_webhook_event(payload_bytes: bytes, sig_header: str) -> dict:
    """Processes incoming Stripe Webhook events and updates the database."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    try:
        event = stripe.Webhook.construct_event(
            payload_bytes, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.warning(f"Invalid payload: {e}")
        raise ValueError("Invalid payload")
    except stripe.SignatureVerificationError as e:
        logger.warning(f"Invalid signature: {e}")
        raise ValueError("Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]
    data_dict = (
        data_object.to_dict() if hasattr(data_object, "to_dict") else data_object
    )

    try:
        if event_type in [
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
        ]:
            host_id = data_dict.get("client_reference_id")
            subscription_id = data_dict.get("subscription")

            if host_id and subscription_id:
                logger.info(
                    f"Checkout completed for host {host_id}, subscription {subscription_id}."
                )

                session_metadata = data_dict.get("metadata") or {}
                encoded_space_ids = str(session_metadata.get("space_ids") or "")
                space_ids: list[str] = []
                if encoded_space_ids:
                    try:
                        decoded = json.loads(encoded_space_ids)
                        if isinstance(decoded, list):
                            space_ids = [str(item) for item in decoded]
                    except json.JSONDecodeError:
                        logger.warning("Invalid space_ids JSON in session metadata.")

                def _fetch_sub():
                    return stripe.Subscription.retrieve(subscription_id)

                sub = await asyncio.to_thread(_fetch_sub)
                await _sync_subscription_from_stripe(host_id, sub, space_ids=space_ids)
                logger.info(f"Host {host_id} subscription activated.")
            else:
                logger.warning(
                    f"Missing host_id ({host_id}) or subscription_id ({subscription_id}) in webhook data."
                )

        elif event_type in [
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ]:
            subscription_id = data_dict.get("id")
            if not subscription_id:
                logger.warning("Subscription event missing subscription id.")
            else:

                def _find_host():
                    return (
                        supabase.table("hosts")
                        .select("id")
                        .eq("stripe_subscription_id", subscription_id)
                        .limit(1)
                        .maybe_single()
                        .execute()
                    )

                host_row = await asyncio.to_thread(_find_host)
                row = host_row.data if host_row is not None else None
                matched_host_id = row.get("id") if isinstance(row, dict) else None
                if matched_host_id:
                    await _sync_subscription_from_stripe(
                        str(matched_host_id), data_object
                    )
                else:
                    logger.warning(f"No host found for subscription {subscription_id}.")

    except Exception as e:
        logger.error(f"Error processing webhook event {event_type}: {e}")
        raise ValueError("Database update failed during webhook") from e

    return {"status": "success", "event_type": event_type}


async def add_space_item(host_id: str, space_id: str) -> BillingOperationResponse:
    """Adds a single space as a new item on the host's existing subscription."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    host = await _ensure_host_record(host_id)
    subscription_id = (host.stripe_subscription_id or "").strip()
    if not subscription_id:
        raise ValueError(
            "No active subscription found. Start checkout first to add spaces."
        )

    owned_spaces = await _fetch_owned_spaces(host_id, [space_id])
    if not any(space.id == space_id for space in owned_spaces):
        raise ValueError("Space not found or you are not the owner.")

    space_type = owned_spaces[0].space_type
    price_id = _resolve_price_id(space_type)

    existing_item = await _find_item_for_space(subscription_id, space_id)
    if existing_item:
        return BillingOperationResponse(success=True, subscription_status=host.subscription_status)

    try:

        def _add_item():
            return stripe.Subscription.modify(
                subscription_id,
                items=[{"price": price_id, "metadata": {"space_id": space_id}}],
            )

        await asyncio.to_thread(_add_item)

        def _mirror_active():
            return (
                supabase.table("spaces")
                .update({"subscription_status": "active"})
                .eq("id", space_id)
                .execute()
            )

        await asyncio.to_thread(_mirror_active)
        return BillingOperationResponse(success=True, subscription_status="active")
    except Exception as e:
        logger.error(f"Error adding space {space_id} to host subscription: {e}")
        raise ValueError("Could not add this space to your subscription.") from e


async def remove_space_item(host_id: str, space_id: str) -> BillingOperationResponse:
    """Removes a space's subscription item; cancels the subscription if it was the last one."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    host = await _ensure_host_record(host_id)
    subscription_id = (host.stripe_subscription_id or "").strip()
    if not subscription_id:
        return BillingOperationResponse(
            success=True, subscription_status=host.subscription_status
        )

    items = await _list_subscription_items(subscription_id)
    target_item = await _find_item_for_space(subscription_id, space_id, items=items)

    try:
        if target_item is None:
            if items and any(not (getattr(item, "metadata", None) or {}).get("space_id") for item in items):
                raise ValueError("Cannot remove space: subscription has unmapped items.")
            # Nothing billable for this space; still mirror it back to trial.
            result_status: SubscriptionStatus = host.subscription_status
            scheduled_cancel = False
        elif len(items) <= 1:
            # Last billable item: cancel the whole subscription.
            def _cancel():
                return stripe.Subscription.modify(
                    subscription_id, cancel_at_period_end=True
                )

            sub = await asyncio.to_thread(_cancel)
            result_status = map_stripe_status(str(getattr(sub, "status", "")))
            scheduled_cancel = True
        else:
            def _delete_item():
                return stripe.SubscriptionItem.delete(str(target_item.id))

            await asyncio.to_thread(_delete_item)
            result_status = host.subscription_status
            scheduled_cancel = False

        # Always mirror the space back to trial once it is no longer billable.
        if not scheduled_cancel:
            def _mirror_trial():
                return (
                    supabase.table("spaces")
                    .update({"subscription_status": "trialing"})
                    .eq("id", space_id)
                    .execute()
                )

            await asyncio.to_thread(_mirror_trial)
            
        return BillingOperationResponse(
            success=True, 
            subscription_status=result_status,
            scheduled_cancellation=scheduled_cancel
        )
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error removing space {space_id} from host subscription: {e}")
        raise ValueError("Could not remove this space from your subscription.") from e


async def cancel_host_subscription(host_id: str) -> BillingOperationResponse:
    """Cancels the host's subscription at the end of the current period."""
    host = await _ensure_host_record(host_id)
    subscription_id = (host.stripe_subscription_id or "").strip()
    if not subscription_id:
        return BillingOperationResponse(
            success=True, subscription_status=host.subscription_status
        )

    try:

        def _cancel():
            return stripe.Subscription.modify(
                subscription_id, cancel_at_period_end=True
            )

        sub = await asyncio.to_thread(_cancel)
        await _sync_subscription_from_stripe(host_id, sub)
        return BillingOperationResponse(
            success=True, subscription_status=map_stripe_status(str(getattr(sub, "status", "")))
        )
    except Exception as e:
        logger.error(f"Error cancelling host subscription for {host_id}: {e}")
        raise ValueError("Could not cancel your subscription.") from e


async def purge_host_account(host_id: str) -> PurgeResponse:
    """Permanently deletes the Stripe customer and cascades the account purge."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    host = await _ensure_host_record(host_id)
    stripe_customer_id = (host.stripe_customer_id or "").strip()
    canceled_subscription_id = (host.stripe_subscription_id or "").strip() or None

    # 1. Delete the Stripe customer (cancels every subscription at once).
    if stripe_customer_id:
        try:

            def _delete_customer():
                return stripe.Customer.delete(stripe_customer_id)

            await asyncio.to_thread(_delete_customer)
        except stripe.InvalidRequestError as e:
            if e.code == "resource_missing":
                pass
            else:
                logger.error(f"Error deleting Stripe customer for host {host_id}: {e}")
                raise ValueError("Could not delete billing profile.") from e
        except Exception as e:
            logger.error(f"Error deleting Stripe customer for host {host_id}: {e}")
            raise ValueError("Could not delete billing profile.") from e

    def _clear_stripe_ids():
        return (
            supabase.table("hosts")
            .update({"stripe_customer_id": None, "stripe_subscription_id": None})
            .eq("id", host_id)
            .execute()
        )

    await asyncio.to_thread(_clear_stripe_ids)

    # 2. Count then delete every space owned by the host. spaces.host_id
    #    references auth.users (NOT public.hosts), so spaces do NOT cascade
    #    from the hosts-row delete below and must be removed explicitly.
    #    knowledge_chunks cascade from each space row.
    def _count_spaces():
        return (
            supabase.table("spaces")
            .select("id", count=CountMethod.exact, head=True)
            .eq("host_id", host_id)
            .execute()
        )

    count_result = await asyncio.to_thread(_count_spaces)
    deleted_spaces = int(getattr(count_result, "count", 0) or 0)

    def _purge_spaces():
        return supabase.table("spaces").delete().eq("host_id", host_id).execute()

    await asyncio.to_thread(_purge_spaces)

    # 3. Delete the hosts billing row (id -> auth.users; no space cascade).
    def _purge_host():
        return supabase.table("hosts").delete().eq("id", host_id).execute()

    purge_result = await asyncio.to_thread(_purge_host)
    deleted_host_record = bool(purge_result.data)

    return PurgeResponse(
        success=True,
        canceled_subscription_id=canceled_subscription_id,
        deleted_spaces=deleted_spaces,
        deleted_host_record=deleted_host_record,
    )
