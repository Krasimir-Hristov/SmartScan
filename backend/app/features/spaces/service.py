"""Service for managing Spaces, including safe deletion with Stripe subscription cancellation."""

import asyncio
import logging
from typing import Any, cast

import stripe
from postgrest.base_request_builder import APIResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PurgeSpaceItem(BaseModel):
    id: str
    stripe_subscription_id: str | None = None


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


async def purge_host_account(host_id: str) -> bool:
    """Purge all subscriptions and spaces for a host to prevent ghost billing before account deletion.
    
    Returns True if successful. Aborts if a Stripe error occurs.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise ValueError("Database connection error.")

    # 1. Fetch all spaces for the host with pagination
    page_size = 100
    current_page = 0
    all_spaces: list[PurgeSpaceItem] = []

    while True:
        start = current_page * page_size
        end = start + page_size - 1

        def _fetch_page(s: int = start, e: int = end) -> APIResponse:
            return (
                supabase.table("spaces")
                .select("id, stripe_subscription_id")
                .eq("host_id", host_id)
                .range(s, e)
                .execute()
            )

        response = await asyncio.to_thread(_fetch_page)
        if not response.data or not isinstance(response.data, list):
            break

        for row in response.data:
            if not isinstance(row, dict):
                raise TypeError("Corrupt data received from spaces table during purge.")
            all_spaces.append(PurgeSpaceItem.model_validate(row))

        if len(response.data) < page_size:
            break
        current_page += 1

    # 2. Sequentially cancel all Stripe subscriptions
    for space in all_spaces:
        stripe_sub_id = space.stripe_subscription_id
        if stripe_sub_id and not stripe_sub_id.startswith("deleted_"):
            try:
                await asyncio.to_thread(stripe.Subscription.delete, stripe_sub_id)
                logger.info("Canceled Stripe subscription %s during account purge for space %s", stripe_sub_id, space.id)
            except stripe.InvalidRequestError as e:
                if getattr(e, "code", None) == "resource_missing":
                    logger.info("Stripe subscription %s already missing during purge.", stripe_sub_id)
                else:
                    logger.exception("Stripe error canceling subscription %s during purge", stripe_sub_id)
                    raise ValueError("Failed to cancel some subscriptions in Stripe. Aborting deletion to prevent ghost billing.") from e
            except Exception as e:
                logger.exception("Unexpected error canceling Stripe subscription %s during purge", stripe_sub_id)
                raise ValueError("Unexpected error during Stripe cancellation. Aborting deletion.") from e

    # 3. Delete each space ensuring tenant space_id is explicitly filtered
    for space in all_spaces:
        def _delete_space(sp_id: str = space.id) -> APIResponse:
            return (
                supabase.table("spaces")
                .delete()
                .eq("id", sp_id)
                .eq("host_id", host_id)
                .execute()
            )

        try:
            await asyncio.to_thread(_delete_space)
        except Exception as e:
            logger.error("Database error deleting space %s for host %s: %s", space.id, host_id, e)
            raise ValueError(f"Could not delete space {space.id} from database.") from e

    return True
