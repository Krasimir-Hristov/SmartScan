"""Service for managing Spaces under the host-level Stripe billing model.

Billing identifiers live on ``public.hosts`` (one Stripe Customer and one
Subscription per host). A space is represented on that subscription as a
Stripe SubscriptionItem tagged with ``metadata.space_id``. Consequently:

* deleting a single space removes only its subscription item (and cancels the
  whole subscription when it was the last enrolled space);
* deleting the host account is a single Stripe customer deletion, handled by
  the billing service, which also removes every space and the hosts row.

This module therefore performs NO direct Stripe calls; all billing mutations
are delegated to ``app.features.billing.service`` so the host-level model has
a single source of truth.
"""

import asyncio
import logging
from typing import Literal

from postgrest.base_request_builder import APIResponse

from app.core.database import get_supabase_client
from app.features.billing.service import (
    purge_host_account as purge_host_billing,
)
from app.features.billing.service import (
    remove_space_item,
)

logger = logging.getLogger(__name__)



async def delete_space(space_id: str, host_id: str) -> Literal["deleted", "cancellation_scheduled"]:
    """Delete a single space and detach its Stripe subscription item.

    Verifies ownership, removes the space's billing item from the host's
    single subscription, then deletes the space row. ``knowledge_chunks``
    cascade from the space row. The Stripe item is removed FIRST so a space is
    never deleted while its item keeps billing the host (ghost billing).
    """
    supabase = get_supabase_client()
    if not supabase:
        msg = "Database connection error."
        raise ValueError(msg)

    # 1. Verify the space exists AND belongs to this host in one pre-filtered
    #    query (hard multi-tenancy isolation: WHERE id AND host_id).
    def _fetch_space() -> APIResponse:
        return (
            supabase.table("spaces")
            .select("id, host_id")
            .eq("id", space_id)
            .eq("host_id", host_id)
            .execute()
        )

    response = await asyncio.to_thread(_fetch_space)
    if not response.data or not isinstance(response.data, list):
        msg = "Space not found or you are not the owner."
        raise ValueError(msg)

    # 2. Detach billing: remove this space's item from the host subscription.
    #    Aborts on Stripe failure so the row is never orphaned from billing.
    response_billing = await remove_space_item(host_id=host_id, space_id=space_id)
    
    # If the subscription was only scheduled for cancellation at period end,
    # the space is still legally active until then. Do not delete from database.
    if response_billing.scheduled_cancellation:
        return "cancellation_scheduled"

    # 3. Delete the space row (knowledge_chunks cascade). The host_id filter
    #    keeps the delete strictly tenant-scoped.
    def _delete_space() -> APIResponse:
        return (
            supabase.table("spaces")
            .delete()
            .eq("id", space_id)
            .eq("host_id", host_id)
            .execute()
        )

    try:
        await asyncio.to_thread(_delete_space)
    except Exception as e:
        logger.error("Database error deleting space %s: %s", space_id, e)
        raise ValueError("Could not delete space from database.") from e

    return "deleted"


async def purge_host_account(host_id: str) -> bool:
    """Purge everything for a host before auth account deletion.

    Delegates to the host-level billing purge, which deletes the single Stripe
    customer (cancelling the one subscription), removes every space owned by
    the host and finally drops the ``public.hosts`` billing row. Returns True
    on success; the billing service raises ``ValueError`` on any Stripe or
    database failure so the caller can abort before deleting the auth user.
    """
    result = await purge_host_billing(host_id=host_id)
    return result.success
