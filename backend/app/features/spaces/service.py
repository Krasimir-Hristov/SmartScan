"""Service for managing Spaces, including safe deletion with Stripe subscription cancellation."""

import asyncio
import logging
from typing import Any, cast

import stripe
from postgrest.base_request_builder import APIResponse

from app.core.config import settings
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


async def delete_space(space_id: str, host_id: str) -> bool:
    """Delete a space securely.

    If the space has an active Stripe subscription, cancels it first.
    """
    supabase = get_supabase_client()
    if not supabase:
        msg = "Database connection error."
        raise ValueError(msg)

    # 1. Fetch space to verify ownership and check subscription status
    def _fetch_space() -> APIResponse:
        return supabase.table("spaces").select("*").eq("id", space_id).execute()

    response = await asyncio.to_thread(_fetch_space)
    if not response.data or not isinstance(response.data, list):
        msg = "Space not found."
        raise ValueError(msg)

    space = cast(dict[str, Any], response.data[0])
    
    if space.get("host_id") != host_id:
        msg = "Unauthorized. You do not own this space."
        raise ValueError(msg)

    # 2. Cancel Stripe Subscription if exists
    stripe_sub_id = space.get("stripe_subscription_id")
    if stripe_sub_id and isinstance(stripe_sub_id, str):
        try:

            def _cancel_sub() -> Any:
                return stripe.Subscription.delete(stripe_sub_id)  # type: ignore

            await asyncio.to_thread(_cancel_sub)
            logger.info("Canceled Stripe subscription %s for space %s", stripe_sub_id, space_id)
        except Exception:
            logger.exception("Failed to cancel Stripe subscription %s", stripe_sub_id)
            # Even if Stripe fails (e.g. already canceled, invalid ID),
            # we should still allow the user to delete the space or handle it gracefully.
            # In this case, we proceed to delete the space to avoid locking the user.

    # 3. Delete from Supabase
    def _delete_space() -> APIResponse:
        return supabase.table("spaces").delete().eq("id", space_id).execute()

    try:
        await asyncio.to_thread(_delete_space)
    except Exception as e:
        msg = f"Database error deleting space: {e}"
        raise ValueError(msg) from e

    return True
