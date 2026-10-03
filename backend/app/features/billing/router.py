"""FastAPI router for Stripe Billing endpoints.

Billing is per-space: every endpoint that mutates a subscription is scoped to a
single owned ``space_id``, while the Stripe Customer and the Customer Portal stay
account-scoped because one host owns exactly one Stripe Customer.
"""

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import limiter
from app.features.billing.schemas import (
    BillingOperationResponse,
    BillingSummaryResponse,
    BillingUser,
    CheckoutResponse,
    CreateCheckoutRequest,
    CreatePortalRequest,
    HostBillingRecord,
    PortalResponse,
    PurgeResponse,
    SpaceEntitlement,
)
from app.features.billing.service import (
    cancel_space_subscription,
    create_checkout_session,
    create_portal_session,
    get_billing_summary,
    get_host_billing,
    process_webhook_event,
    purge_host_account,
    resume_space_subscription,
)

router = APIRouter(prefix="/billing", tags=["Billing"])


# Verify the user via proxy token (x-internal-auth)
async def get_current_user(
    x_internal_auth: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_email: Annotated[str | None, Header()] = None,
) -> BillingUser:
    if not x_internal_auth or not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Authenticate requests by comparing the x-internal-auth header with BACKEND_PROXY_SECRET
    if not hmac.compare_digest(
        x_internal_auth.encode("utf-8"), settings.BACKEND_PROXY_SECRET.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")

    return BillingUser(id=x_user_id, email=x_user_email or "")


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("5/minute")
async def checkout(
    request: Request,
    payload: CreateCheckoutRequest,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Creates a Stripe Checkout Session for ONE space's dedicated subscription."""
    try:
        return await create_checkout_session(
            host_id=user.id,
            user_email=user.email or "",
            space_id=payload.space_id,
            return_url=payload.return_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/portal", response_model=PortalResponse)
@limiter.limit("5/minute")
async def portal(
    request: Request,
    payload: CreatePortalRequest,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Creates a Stripe Customer Portal Session listing every per-space subscription."""
    try:
        return await create_portal_session(
            host_id=user.id,
            return_url=payload.return_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/summary", response_model=BillingSummaryResponse)
@limiter.limit("30/minute")
async def billing_summary(
    request: Request,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Returns the account trial plus the entitlement of every owned space."""
    try:
        return await get_billing_summary(host_id=user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/host", response_model=HostBillingRecord)
@limiter.limit("30/minute")
async def host_billing(
    request: Request,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Returns the account-level billing record (Stripe Customer + trial)."""
    try:
        return await get_host_billing(host_id=user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/spaces/{space_id}/entitlement", response_model=SpaceEntitlement)
@limiter.limit("30/minute")
async def space_entitlement(
    request: Request,
    space_id: str,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Returns the entitlement verdict for one owned space."""
    try:
        # Ownership first: never disclose entitlement of another host's space.
        summary = await get_billing_summary(host_id=user.id)
        match = next(
            (item for item in summary.spaces if item.space_id == space_id), None
        )
        if match is None:
            raise HTTPException(
                status_code=404, detail="Space not found or you are not the owner."
            )
        return match
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/spaces/{space_id}/cancel", response_model=BillingOperationResponse)
@limiter.limit("10/minute")
async def cancel_space(
    request: Request,
    space_id: str,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Cancels ONE space's subscription at the end of its paid period.

    Guest access is preserved until ``spaces.current_period_end``.
    """
    try:
        return await cancel_space_subscription(host_id=user.id, space_id=space_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/spaces/{space_id}/resume", response_model=BillingOperationResponse)
@limiter.limit("10/minute")
async def resume_space(
    request: Request,
    space_id: str,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Undoes a scheduled cancellation so ONE space keeps renewing."""
    try:
        return await resume_space_subscription(host_id=user.id, space_id=space_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/purge", response_model=PurgeResponse)
@limiter.limit("3/minute")
async def purge_account(
    request: Request,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Deletes the host's single Stripe customer, cancelling every space subscription."""
    try:
        return await purge_host_account(host_id=user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Annotated[str | None, Header()] = None,
):
    """Handles Stripe Webhook events and syncs them onto the owning space row."""
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    payload_bytes = await request.body()

    try:
        return await process_webhook_event(payload_bytes, stripe_signature)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")

