"""Service for managing Spaces, including safe deletion with Stripe subscription cancellation."""

import asyncio
import logging

import stripe

from app.core.config import settings
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


async def delete_space(space_id: str, host_id: str) -> bool:
    """
    Deletes a space securely.
    If the space has an active Stripe subscription, cancels it first.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    # 1. Fetch space to verify ownership and check subscription status
    def _fetch_space():
        return supabase.table("spaces").select("*").eq("id", space_id).execute()

    response = await asyncio.to_thread(_fetch_space)
    if not response.data:
        raise ValueError("Space not found.")

    space = response.data[0]
    if space["host_id"] != host_id:
        raise ValueError("Unauthorized. You do not own this space.")

    # 2. Cancel Stripe Subscription if exists
    stripe_sub_id = space.get("stripe_subscription_id")
    if stripe_sub_id:
        try:

            def _cancel_sub():
                return stripe.Subscription.delete(stripe_sub_id)

            await asyncio.to_thread(_cancel_sub)
            logger.info(
                f"Canceled Stripe subscription {stripe_sub_id} for space {space_id}"
            )
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to cancel Stripe subscription {stripe_sub_id}: {e}")
            # Even if Stripe fails (e.g. already canceled, invalid ID),
            # we should still allow the user to delete the space or handle it gracefully.
            # In this case, we proceed to delete the space to avoid locking the user.

    # 3. Delete from Supabase
    def _delete_space():
        return supabase.table("spaces").delete().eq("id", space_id).execute()

    del_response = await asyncio.to_thread(_delete_space)

    if del_response.error:
        raise ValueError(f"Database error deleting space: {del_response.error.message}")

    return True
