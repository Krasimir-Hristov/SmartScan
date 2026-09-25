"""Schemas for Stripe Billing endpoints."""

from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


class CreateCheckoutRequest(BaseModel):
    """Request to create a Stripe Checkout session."""

    space_id: str = Field(..., description="ID of the space to subscribe to.")
    return_url: str | None = Field(
        None, description="Custom URL to redirect to after checkout."
    )

    @field_validator("return_url")
    @classmethod
    def validate_return_url(cls, v: str | None) -> str | None:
        if not v:
            return v
        from app.core.config import settings

        parsed = urlparse(v)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        allowed = [settings.FRONTEND_URL.rstrip("/")] + [
            o.rstrip("/") for o in settings.cors_origins
        ]
        if origin not in allowed:
            raise ValueError("return_url origin is not allowed")
        return v


class CheckoutResponse(BaseModel):
    """Response containing the Stripe Checkout URL."""

    checkout_url: str = Field(..., description="Stripe Checkout Session URL.")
    session_id: str = Field(..., description="Stripe Session ID.")


class CreatePortalRequest(BaseModel):
    """Request to create a Stripe Customer Portal session."""

    space_id: str = Field(..., description="ID of the space (to resolve customer ID).")
    return_url: str | None = Field(
        None, description="Custom URL to redirect to after portal."
    )

    @field_validator("return_url")
    @classmethod
    def validate_return_url(cls, v: str | None) -> str | None:
        if not v:
            return v
        from app.core.config import settings

        parsed = urlparse(v)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        allowed = [settings.FRONTEND_URL.rstrip("/")] + [
            o.rstrip("/") for o in settings.cors_origins
        ]
        if origin not in allowed:
            raise ValueError("return_url origin is not allowed")
        return v


class PortalResponse(BaseModel):
    """Response containing the Stripe Customer Portal URL."""

    portal_url: str = Field(..., description="Stripe Customer Portal URL.")


class BillingUser(BaseModel):
    id: str
    email: str | None = None
