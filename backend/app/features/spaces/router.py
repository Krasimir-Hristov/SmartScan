"""FastAPI router for Space endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.rate_limit import limiter
from app.features.billing.router import get_current_user
from app.features.billing.schemas import BillingUser
from app.features.spaces.service import delete_space


class DeleteSpaceResponse(BaseModel):
    success: bool


router = APIRouter(prefix="/spaces", tags=["Spaces"])


@router.delete("/{space_id}", response_model=DeleteSpaceResponse)
@limiter.limit("5/minute")
async def delete_space_endpoint(
    space_id: str,
    request: Request,
    user: BillingUser = Depends(get_current_user),  # noqa: B008
):
    """Securely deletes a space and cancels its Stripe subscription if any."""
    try:
        success = await delete_space(space_id=space_id, host_id=user.id)
        return DeleteSpaceResponse(success=success)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Internal server error")
