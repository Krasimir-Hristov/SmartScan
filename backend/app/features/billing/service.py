"""Service for Stripe Billing operations (Checkout, Portal, Webhooks)."""

import logging

import stripe
from app.core.config import settings
from app.core.database import get_supabase_client
from app.features.billing.schemas import CheckoutResponse, PortalResponse

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
    response = supabase.table("spaces").select("*").eq("id", space_id).execute()
    if not response.data:
        raise ValueError("Space not found.")
    space = response.data[0]
    
    if space["host_id"] != host_id:
        raise ValueError("Unauthorized. You do not own this space.")

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
            "subscription_data": {"metadata": {"space_id": space_id, "host_id": host_id}},
            "metadata": {"space_id": space_id, "host_id": host_id},
        }

        # Add customer or customer_email safely
        stripe_cust_id = space.get("stripe_customer_id")
        if stripe_cust_id and stripe_cust_id.strip():
            kwargs["customer"] = stripe_cust_id.strip()
        elif user_email and user_email.strip():
            kwargs["customer_email"] = user_email.strip()

        session = stripe.checkout.Session.create(**kwargs)
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error creating Stripe checkout session: {e}")
        # Връщаме точната грешка към фронтенда, за да разберем веднага какво не харесва Stripe
        raise ValueError(f"Stripe Error: {e!s}")


async def create_portal_session(
    space_id: str, host_id: str, return_url: str | None = None
) -> PortalResponse:
    """Creates a Stripe Customer Portal Session for managing the subscription."""
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    # 1. Verify space ownership
    response = supabase.table("spaces").select("host_id, stripe_customer_id").eq("id", space_id).execute()
    if not response.data:
        raise ValueError("Space not found.")
    space = response.data[0]
    
    if space["host_id"] != host_id:
        raise ValueError("Unauthorized. You do not own this space.")

    stripe_customer_id = space.get("stripe_customer_id")
    if not stripe_customer_id:
        raise ValueError("This space does not have an active customer profile yet.")

    # 2. Create Portal Session
    base_url = settings.FRONTEND_URL.rstrip("/")
    portal_return_url = return_url or f"{base_url}/dashboard"

    try:
        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=portal_return_url,
        )
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
        # Invalid payload
        logger.warning(f"Invalid payload: {e}")
        raise ValueError("Invalid payload")
    except stripe.SignatureVerificationError as e:
        # Invalid signature
        logger.warning(f"Invalid signature: {e}")
        raise ValueError("Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]

    # В новите версии на stripe библиотеката обектът не е dict. 
    # Трябва да го конвертираме, за да ползваме .get() безопасно.
    data_dict = data_object.to_dict() if hasattr(data_object, "to_dict") else data_object

    try:
        if event_type == "checkout.session.completed":
            space_id = data_dict.get("client_reference_id")
            customer_id = data_dict.get("customer")
            subscription_id = data_dict.get("subscription")

            if space_id and subscription_id:
                logger.info(f"Updating DB for space_id: {space_id} with sub_id: {subscription_id}")
                # Mark space as active
                result = supabase.table("spaces").update({
                    "subscription_status": "active",
                    "stripe_subscription_id": subscription_id,
                    "stripe_customer_id": customer_id,
                    "stripe_price_id": settings.STRIPE_PRICE_ID_STAY,
                    "trial_ends_at": None,
                }).eq("id", space_id).execute()
                logger.info(f"Supabase update result: {result}")
                logger.info(f"Space {space_id} subscription activated.")
            else:
                logger.warning(f"Missing space_id ({space_id}) or subscription_id ({subscription_id}) in webhook data.")

        elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
            subscription_id = data_dict.get("id")
            status = data_dict.get("status")
            customer_id = data_dict.get("customer")
            
            # Map Stripe statuses to our allowed Enum: 'trialing', 'active', 'past_due', 'paused', 'canceled'
            # Stripe statuses: trialing, active, past_due, canceled, unpaid, incomplete, incomplete_expired, paused
            mapped_status = status
            if status in ["unpaid", "incomplete", "incomplete_expired"]:
                mapped_status = "past_due"

            if subscription_id:
                # We locate the space by stripe_subscription_id
                supabase.table("spaces").update({
                    "subscription_status": mapped_status,
                }).eq("stripe_subscription_id", subscription_id).execute()
                logger.info(f"Subscription {subscription_id} updated to {mapped_status}.")
                
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error processing webhook event {event_type}: {e}")
        # We still return 200 so Stripe doesn't infinitely retry unless it's a critical DB crash
        raise ValueError("Database update failed during webhook")

    return {"status": "success", "event_type": event_type}
