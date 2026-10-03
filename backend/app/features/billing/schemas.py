"""Schemas for Stripe Billing endpoints.

Billing ownership model — per-space subscriptions with an account-level trial:

* ONE Stripe Customer per host        -> ``public.hosts.stripe_customer_id``
* ONE Stripe Subscription PER SPACE   -> ``public.spaces.stripe_subscription_id``
* ONE account-level trial per host    -> ``public.hosts.trial_ends_at``

A space is ENTITLED (usable by guests) while it has an ``active`` subscription
OR the owning host's account-level trial is still open. A subscription cancelled
at period end keeps Stripe status ``active`` until ``current_period_end``
passes, so the space stays entitled for the period the host already paid for.

Deleting the Stripe customer on account deletion cancels every per-space
subscription in one call, which is what keeps the model free of ghost charges.
"""

from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

# Field metadata is declared through ``Annotated`` with a real Python default on
# the assignment. This is the idiomatic Pydantic v2 form and the ONLY one that
# static type checkers recognise as optional: both pyright/Pylance and mypy
# (without the pydantic plugin) read ``Field(False, ...)`` and even
# ``Field(default=False, ...)`` as a REQUIRED argument, which produces false
# "Argument missing for parameter" errors at every call site that omits it.
# ``Annotated`` also keeps the OpenAPI/JSON-schema descriptions intact.

# Mirrors the subscription_status CHECK constraint on public.hosts and
# public.spaces.
SubscriptionStatus = Literal["trialing", "active", "past_due", "paused", "canceled"]

# Verdict of the entitlement rule, as computed by public.get_space_entitlement
# and public.get_guest_space_by_slug.
EntitlementStatus = Literal["active", "trial", "expired"]


class RedirectableRequest(BaseModel):
    """Base model for requests that accept a return_url."""

    return_url: Annotated[
        str | None,
        Field(description="Custom URL to redirect to after action."),
    ] = None

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
    """Request to create a Stripe Checkout session for ONE space.

    Checkout is space-scoped: the session creates a dedicated Stripe
    Subscription for exactly one owned space, charged against the host's single
    Stripe Customer.
    """

    space_id: Annotated[
        str,
        Field(
            min_length=1,
            description="Owned space id that gets its own dedicated subscription.",
        ),
    ]


class CheckoutResponse(BaseModel):
    """Response containing the Stripe Checkout URL."""

    checkout_url: Annotated[str, Field(description="Stripe Checkout Session URL.")]
    session_id: Annotated[str, Field(description="Stripe Session ID.")]


class CreatePortalRequest(RedirectableRequest):
    """Request to create a Stripe Customer Portal session.

    Host-scoped: the host's single Stripe Customer owns every per-space
    subscription, so the portal lists them all and no space_id is required.
    """


class PortalResponse(BaseModel):
    """Response containing the Stripe Customer Portal URL."""

    portal_url: Annotated[str, Field(description="Stripe Customer Portal URL.")]


class BillingUser(BaseModel):
    id: str
    email: str | None = None


class HostBillingRecord(BaseModel):
    """Row of ``public.hosts`` — the account-level billing record.

    Holds the single Stripe Customer and the account-level trial. It carries NO
    subscription state: subscriptions live one-per-space on ``public.spaces``.
    """

    id: str
    stripe_customer_id: str | None = None
    trial_ends_at: str | None = None
    trial_claimed_at: str | None = None


class SpaceBillingRecord(BaseModel):
    """Space row used for billing validation.

    Owns the space's dedicated Stripe Subscription id and the end of its paid
    period. The Stripe Customer still lives on ``public.hosts``.
    """

    id: str
    host_id: str
    space_type: str | None = None
    is_active: bool | None = None
    subscription_status: SubscriptionStatus | None = None
    stripe_subscription_id: str | None = None
    current_period_end: str | None = None


class SpaceEntitlement(BaseModel):
    """Atomic entitlement snapshot for one space.

    Produced by the ``public.get_space_entitlement`` RPC so the backend gate and
    the SQL-side gates (guest lookup, semantic search) share one predicate.
    """

    space_id: str
    host_id: str | None = None
    is_active: bool = False
    subscription_status: SubscriptionStatus | None = None
    current_period_end: str | None = None
    trial_ends_at: str | None = None
    entitlement_status: EntitlementStatus = "expired"
    valid_until: str | None = None
    entitled: bool = False


class BillingOperationResponse(BaseModel):
    """Generic success envelope for space-scoped billing mutations."""

    success: bool = True
    subscription_status: Annotated[
        SubscriptionStatus | None,
        Field(description="Resulting subscription status of the space, when known."),
    ] = None
    current_period_end: Annotated[
        str | None,
        Field(description="End of the paid period the space stays entitled until."),
    ] = None
    scheduled_cancellation: Annotated[
        bool,
        Field(description="True when cancellation is queued for period end."),
    ] = False


class PurgeResponse(BaseModel):
    """Outcome of a host account purge (cancel + delete everything)."""

    success: bool = True
    canceled_subscription_ids: Annotated[
        list[str],
        Field(
            description=(
                "Per-space Stripe Subscription ids canceled by deleting the "
                "host's single Stripe Customer."
            )
        ),
    ] = []
    deleted_spaces: Annotated[int, Field(description="Number of spaces deleted.")] = 0
    deleted_host_record: Annotated[
        bool,
        Field(description="Whether the public.hosts billing row was removed."),
    ] = False


class BillingSummaryResponse(BaseModel):
    """Account-level billing overview consumed by the host dashboard.

    One call returns the host's single Stripe Customer plus the account-level
    trial, together with the entitlement verdict of every space that host owns,
    so the dashboard never has to re-derive billing state client-side.
    """

    host: HostBillingRecord
    spaces: Annotated[
        list[SpaceEntitlement],
        Field(description="Entitlement verdict of every space this host owns."),
    ] = []
