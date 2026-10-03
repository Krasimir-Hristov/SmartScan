"""FastAPI router for Stripe Billing endpoints."""

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import limiter
from app.features.billing.schemas import (
    BillingOperationResponse,
    BillingUser,
    CheckoutResponse,
    CreateCheckoutRequest,
    CreatePortalRequest,
    PortalResponse,
    PurgeResponse,
)
from app.features.billing.service import (
    add_space_item,
    cancel_host_subscription,
    create_checkout_session,
    create_portal_session,
    process_webhook_event,
    purge_host_account,
    remove_space_item,
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
    """Creates a Stripe Checkout Session for the host's single subscription."""
    try:
        response = await create_checkout_session(
            host_id=user.id,
            user_email=user.email or "",
            space_ids=payload.space_ids,
            return_url=payload.return_url,
        )
        return response
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
    """Creates a Stripe Customer Portal Session for managing subscriptions."""
    try:
        response = await create_portal_session(
            host_id=user.id,
            return_url=payload.return_url,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/spaces/{space_id}/add", response_model=BillingOperationResponse)
@limiter.limit("10/minute")
async def add_space(
    request: Request,
    space_id: str,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Adds an owned space as a new item on the host's existing subscription."""
    try:
        return await add_space_item(host_id=user.id, space_id=space_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/spaces/{space_id}/remove", response_model=BillingOperationResponse)
@limiter.limit("10/minute")
async def remove_space(
    request: Request,
    space_id: str,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Removes a space's subscription item, cancelling if it was the last one."""
    try:
        return await remove_space_item(host_id=user.id, space_id=space_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/cancel", response_model=BillingOperationResponse)
@limiter.limit("5/minute")
async def cancel_subscription(
    request: Request,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Cancels the host's subscription at the end of the current period."""
    try:
        return await cancel_host_subscription(host_id=user.id)
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
    """Permanently deletes the Stripe customer and cascades the account purge."""
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
    """Handles Stripe Webhook events."""
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    payload_bytes = await request.body()

    try:
        result = await process_webhook_event(payload_bytes, stripe_signature)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")
