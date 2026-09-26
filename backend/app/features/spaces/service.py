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
            logger.info(
                "Canceled Stripe subscription %s for space %s", stripe_sub_id, space_id
            )
        except stripe.InvalidRequestError as e:
            if getattr(e, "code", None) == "resource_missing":
                logger.info(
                    "Stripe subscription %s already missing, proceeding to delete space.",
                    stripe_sub_id,
                )
            else:
                logger.exception(
                    "Stripe error canceling subscription %s", stripe_sub_id
                )
                raise
        except Exception:
            logger.exception(
                "Unexpected error canceling Stripe subscription %s", stripe_sub_id
            )
            raise

    # 2.5 Persist canceled state to decouple before full deletion
    if stripe_sub_id and isinstance(stripe_sub_id, str):

        def _decouple_space() -> APIResponse:
            return (
                supabase.table("spaces")
                .update(
                    {"stripe_subscription_id": f"deleted_{stripe_sub_id}", "subscription_status": "canceled"}
                )
                .eq("id", space_id)
                .execute()
            )

        try:
            await asyncio.to_thread(_decouple_space)
        except Exception:  # noqa: BLE001
            logger.warning(
                "Failed to decouple subscription from space %s. Deletion might be incomplete if it fails next.",
                space_id,
            )

    # 3. Delete from Supabase
    def _delete_space() -> APIResponse:
        return (
            supabase.table("spaces")
            .delete()
            .eq("id", space_id)
            .eq("host_id", host_id)
            .select("id")
            .execute()
        )

    try:
        del_resp = await asyncio.to_thread(_delete_space)
        if not del_resp.data:
            raise ValueError("Space not found or unauthorized.")
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        logger.error(f"Database error deleting space {space_id}: {e}")
        raise ValueError("Could not delete space from database.") from e

    return True
