"""Schemas for Stripe Billing endpoints."""

from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


class RedirectableRequest(BaseModel):
    """Base model for requests that accept a return_url."""

    return_url: str | None = Field(
        None, description="Custom URL to redirect to after action."
    )

    @field_validator("return_url")
    @classmethod
    def validate_return_url(cls, v: str | None) -> str | None:
        if not v:
            return v

        parsed = urlparse(v)

        # Security check: must be HTTP/HTTPS and have a valid netloc
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("return_url must be a valid HTTP/HTTPS URL")

        from app.core.config import settings

        origin = f"{parsed.scheme}://{parsed.netloc}"
        allowed = [settings.FRONTEND_URL.rstrip("/")] + [
            o.rstrip("/") for o in settings.cors_origins
        ]

        if origin not in allowed:
            raise ValueError("return_url origin is not allowed")

        return v


class CreateCheckoutRequest(RedirectableRequest):
    """Request to create a Stripe Checkout session."""

    space_id: str = Field(..., description="ID of the space to subscribe to.")


class CheckoutResponse(BaseModel):
    """Response containing the Stripe Checkout URL."""

    checkout_url: str = Field(..., description="Stripe Checkout Session URL.")
    session_id: str = Field(..., description="Stripe Session ID.")


class CreatePortalRequest(RedirectableRequest):
    """Request to create a Stripe Customer Portal session."""

    space_id: str = Field(..., description="ID of the space (to resolve customer ID).")


class PortalResponse(BaseModel):
    """Response containing the Stripe Customer Portal URL."""

    portal_url: str = Field(..., description="Stripe Customer Portal URL.")


class BillingUser(BaseModel):
    id: str
    email: str | None = None


class SpaceBillingRecord(BaseModel):
    """Database record for space billing validation."""

    id: str
    host_id: str
    subscription_status: str | None = None
    stripe_subscription_id: str | None = None
    stripe_customer_id: str | None = None
