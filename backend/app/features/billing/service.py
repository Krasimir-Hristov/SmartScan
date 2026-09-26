"""Service for Stripe Billing operations (Checkout, Portal, Webhooks)."""

import asyncio
import logging

import stripe

from app.core.config import settings
from app.core.database import get_supabase_client
from app.features.billing.schemas import (
    CheckoutResponse,
    PortalResponse,
    SpaceBillingRecord,
)

logger = logging.getLogger(__name__)

# Initialize Stripe with the Secret Key
stripe.api_key = settings.STRIPE_SECRET_KEY


async def create_checkout_session(
    space_id: str, host_id: str, user_email: str, return_url: str | None = None
) -> CheckoutResponse:
    """Creates a Stripe Checkout Session for a space subscription."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    # 1. Verify space ownership
    def _fetch_space():
        return supabase.table("spaces").select("*").eq("id", space_id).execute()

    response = await asyncio.to_thread(_fetch_space)
    if not response.data:
        raise ValueError("Space not found.")
    space = SpaceBillingRecord.model_validate(response.data[0])

    if space.host_id != host_id:
        raise ValueError("Unauthorized. You do not own this space.")

    # Guard: prevent creating a subscription-mode Checkout session for a space that already has a subscription
    sub_status = space.subscription_status
    if space.stripe_subscription_id and sub_status not in [
        "canceled",
    ]:
        raise ValueError("Space already has an active subscription.")

    # 2. Determine success/cancel URLs
    base_url = settings.FRONTEND_URL.rstrip("/")
    success_url = return_url or f"{base_url}/dashboard"
    cancel_url = return_url or f"{base_url}/dashboard"

    # 3. Create Stripe Checkout Session
    try:
        kwargs = {
            "payment_method_types": ["card"],
            "line_items": [{"price": settings.STRIPE_PRICE_ID_STAY, "quantity": 1}],
            "mode": "subscription",
            "success_url": f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": cancel_url,
            "client_reference_id": space_id,
            "subscription_data": {
                "metadata": {"space_id": space_id, "host_id": host_id}
            },
            "metadata": {"space_id": space_id, "host_id": host_id},
        }

        # Add customer or customer_email safely
        stripe_cust_id = space.stripe_customer_id
        if stripe_cust_id and stripe_cust_id.strip():
            kwargs["customer"] = stripe_cust_id.strip()
        elif user_email and user_email.strip():
            kwargs["customer_email"] = user_email.strip()

        def _create_stripe_session():
            return stripe.checkout.Session.create(**kwargs)

        session = await asyncio.to_thread(_create_stripe_session)
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error creating Stripe checkout session: {e}")
        raise ValueError("Could not create checkout session.")


async def create_portal_session(
    space_id: str, host_id: str, return_url: str | None = None
) -> PortalResponse:
    """Creates a Stripe Customer Portal Session for managing the subscription."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    # 1. Verify space ownership
    def _fetch_space_portal():
        return (
            supabase.table("spaces")
            .select("*")
            .eq("id", space_id)
            .execute()
        )

    response = await asyncio.to_thread(_fetch_space_portal)
    if not response.data:
        raise ValueError("Space not found.")
    space = SpaceBillingRecord.model_validate(response.data[0])

    if space.host_id != host_id:
        raise ValueError("Unauthorized. You do not own this space.")

    stripe_customer_id = space.stripe_customer_id
    if not stripe_customer_id:
        raise ValueError("This space does not have an active customer profile yet.")

    # 2. Create Portal Session
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
        if event_type == "checkout.session.completed":
            space_id = data_dict.get("client_reference_id")
            customer_id = data_dict.get("customer")
            subscription_id = data_dict.get("subscription")

            if space_id and subscription_id:
                logger.info(
                    f"Updating DB for space_id: {space_id} with sub_id: {subscription_id}"
                )

                def _update_checkout():
                    return (
                        supabase.table("spaces")
                        .update(
                            {
                                "subscription_status": "active",
                                "stripe_subscription_id": subscription_id,
                                "stripe_customer_id": customer_id,
                                "stripe_price_id": settings.STRIPE_PRICE_ID_STAY,
                                "trial_ends_at": None,
                            }
                        )
                        .eq("id", space_id)
                        .execute()
                    )

                result = await asyncio.to_thread(_update_checkout)
                logger.info(f"Supabase update result: {result}")
                logger.info(f"Space {space_id} subscription activated.")
            else:
                logger.warning(
                    f"Missing space_id ({space_id}) or subscription_id ({subscription_id}) in webhook data."
                )

        elif event_type in [
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ]:
            subscription_id = data_dict.get("id")
            status = data_dict.get("status")
            metadata = data_dict.get("metadata") or {}
            meta_space_id = metadata.get("space_id")

            mapped_status = status
            if status in ["unpaid", "incomplete", "incomplete_expired"]:
                mapped_status = "past_due"

            if subscription_id:

                def _update_subscription():
                    return (
                        supabase.table("spaces")
                        .update({"subscription_status": mapped_status})
                        .eq("stripe_subscription_id", subscription_id)
                        .execute()
                    )

                result = await asyncio.to_thread(_update_subscription)

                if not result.data and meta_space_id:
                    # Fall back to metadata space_id if the stripe_subscription_id was not yet saved or matching
                    def _update_fallback():
                        return (
                            supabase.table("spaces")
                            .update({"subscription_status": mapped_status})
                            .eq("id", meta_space_id)
                            .is_("stripe_subscription_id", "null")
                            .neq("subscription_status", "canceled")
                            .execute()
                        )

                    result = await asyncio.to_thread(_update_fallback)

                if result.data:
                    logger.info(
                        f"Subscription {subscription_id} updated to {mapped_status}."
                    )
                else:
                    logger.warning(
                        f"No matching space found to update subscription {subscription_id}."
                    )

    except Exception as e:  # noqa: BLE001
        logger.error(f"Error processing webhook event {event_type}: {e}")
        raise ValueError("Database update failed during webhook")

    return {"status": "success", "event_type": event_type}
