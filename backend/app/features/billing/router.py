"""FastAPI router for Stripe Billing endpoints."""

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import settings
from app.core.rate_limit import limiter
from app.features.billing.schemas import (
    BillingUser,
    CheckoutResponse,
    CreateCheckoutRequest,
    CreatePortalRequest,
    PortalResponse,
)
from app.features.billing.service import (
    create_checkout_session,
    create_portal_session,
    process_webhook_event,
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
    """Creates a Stripe Checkout Session for subscribing a space."""
    try:
        response = await create_checkout_session(
            space_id=payload.space_id,
            host_id=user.id,
            user_email=user.email or "",
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
            space_id=payload.space_id,
            host_id=user.id,
            return_url=payload.return_url,
        )
        return response
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
