"""FastAPI router for Stripe Billing endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.features.billing.schemas import (
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


# Mock dependencies for now; in reality, we verify the user via proxy token or Supabase JWT
# Since proxy.ts forwards x-user-id and x-user-email, we can extract them from headers.
async def get_current_user(
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_email: Annotated[str | None, Header()] = None,
) -> dict:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"id": x_user_id, "email": x_user_email or ""}


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    request: CreateCheckoutRequest,
    user: dict = Depends(get_current_user),  # noqa: B008
):
    """Creates a Stripe Checkout Session for subscribing a space."""
    try:
        response = await create_checkout_session(
            space_id=request.space_id,
            host_id=user["id"],
            user_email=user["email"],
            return_url=request.return_url,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/portal", response_model=PortalResponse)
async def portal(
    request: CreatePortalRequest,
    user: dict = Depends(get_current_user),  # noqa: B008
):
    """Creates a Stripe Customer Portal Session for managing subscriptions."""
    try:
        response = await create_portal_session(
            space_id=request.space_id,
            host_id=user["id"],
            return_url=request.return_url,
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
