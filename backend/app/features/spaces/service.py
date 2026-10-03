"""Service for managing Spaces under the per-space Stripe billing model.

Billing ownership:

* ONE Stripe Customer per host, stored on ``public.hosts.stripe_customer_id``;
* ONE dedicated Stripe Subscription PER SPACE, stored on
  ``public.spaces.stripe_subscription_id``.

Consequently:

* deleting a single space cancels ONLY that space's own subscription, leaving the
  host's other spaces (and their charges) untouched;
* deleting the host account is a single Stripe customer deletion, handled by the
  billing service, which cancels every per-space subscription and then removes
  every space and the hosts row.

This module therefore performs NO direct Stripe calls; all billing mutations are
delegated to ``app.features.billing.service`` so the billing model keeps a single
source of truth.
"""

import asyncio
import logging
from typing import Literal

from postgrest.base_request_builder import APIResponse

from app.core.database import get_supabase_client
from app.features.billing.service import (
    detach_space_subscription,
)
from app.features.billing.service import (
    purge_host_account as purge_host_billing,
)

logger = logging.getLogger(__name__)


async def delete_space(space_id: str, host_id: str) -> Literal["deleted"]:
    """Delete a single space and cancel its own Stripe subscription.

    Verifies ownership, cancels the space's dedicated subscription in Stripe,
    then deletes the space row. ``knowledge_chunks`` cascade from the space row.
    The subscription is cancelled FIRST so a space is never deleted while its
    subscription keeps billing the host (ghost billing).
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

    # 2. Detach billing: cancel this space's dedicated subscription now.
    #    Aborts on Stripe failure so the row is never orphaned from billing.
    await detach_space_subscription(host_id=host_id, space_id=space_id)

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

    Delegates to the account-level billing purge, which deletes the host's single
    Stripe customer (cancelling every per-space subscription in one call), removes
    every space owned by the host and finally drops the ``public.hosts`` billing
    row. Returns True on success; the billing service raises ``ValueError`` on any
    Stripe or database failure so the caller can abort before deleting the auth
    user.
    """
    result = await purge_host_billing(host_id=host_id)
    return result.success
