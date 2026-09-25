"""Schemas for Stripe Billing endpoints."""

from pydantic import BaseModel, Field


class CreateCheckoutRequest(BaseModel):
    """Request to create a Stripe Checkout session."""

    space_id: str = Field(..., description="ID of the space to subscribe to.")
    return_url: str | None = Field(
        None, description="Custom URL to redirect to after checkout."
    )


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


class PortalResponse(BaseModel):
    """Response containing the Stripe Customer Portal URL."""

    portal_url: str = Field(..., description="Stripe Customer Portal URL.")
