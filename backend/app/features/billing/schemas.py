"""Schemas for Stripe Billing endpoints.

Billing ownership lives at the HOST level: one Stripe Customer and one Stripe
Subscription per host, where every enrolled space is a separate Subscription
Item tagged with ``metadata.space_id``. That single billing relationship is what
makes account deletion one Stripe call instead of a loop that can fail halfway
through and leave ghost subscriptions behind.
"""

from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

# Mirrors the subscription_status CHECK constraint on public.hosts and
# public.spaces.
SubscriptionStatus = Literal["trialing", "active", "past_due", "paused", "canceled"]


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
    """Request to create a Stripe Checkout session.

    Checkout is host-scoped: the session creates (or tops up) the host's single
    subscription. `space_ids` selects which owned spaces become billable
    subscription items; when omitted every active space of the host is enrolled.
    """

    space_ids: list[str] = Field(
        default_factory=list,
        description=(
            "Owned space ids to enroll on the host's single subscription. "
            "Empty means: enroll every active space the host owns."
        ),
    )


class CheckoutResponse(BaseModel):
    """Response containing the Stripe Checkout URL."""

    checkout_url: str = Field(..., description="Stripe Checkout Session URL.")
    session_id: str = Field(..., description="Stripe Session ID.")


class CreatePortalRequest(RedirectableRequest):
    """Request to create a Stripe Customer Portal session.

    Host-scoped: the host's single Stripe Customer owns every subscription item,
    so no space_id is required to resolve billing.
    """


class PortalResponse(BaseModel):
    """Response containing the Stripe Customer Portal URL."""

    portal_url: str = Field(..., description="Stripe Customer Portal URL.")


class BillingUser(BaseModel):
    id: str
    email: str | None = None


class HostBillingRecord(BaseModel):
    """Row of ``public.hosts`` — the single billing record for a host."""

    id: str
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    subscription_status: SubscriptionStatus = "trialing"
    trial_ends_at: str | None = None


class SpaceBillingRecord(BaseModel):
    """Space row used for billing validation.

    Holds no Stripe identifiers: those live only on ``public.hosts``.
    """

    id: str
    host_id: str
    space_type: str | None = None
    is_active: bool | None = None
    subscription_status: SubscriptionStatus | None = None


class BillingOperationResponse(BaseModel):
    """Generic success envelope for host-scoped billing mutations."""

    success: bool = True
    subscription_status: SubscriptionStatus | None = Field(
        None, description="Resulting host subscription status, when known."
    )
    scheduled_cancellation: bool = False


class PurgeResponse(BaseModel):
    """Outcome of a host account purge (cancel + delete everything)."""

    success: bool = True
    canceled_subscription_id: str | None = Field(
        None, description="Stripe Subscription id that was canceled, if any."
    )
    deleted_spaces: int = Field(0, description="Number of spaces deleted.")
    deleted_host_record: bool = Field(
        False, description="Whether the public.hosts billing row was removed."
    )
