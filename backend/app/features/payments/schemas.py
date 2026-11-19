"""
Pydantic schemas for Paddle Billing overview, overlay checkout config, portal URLs, and webhooks.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class CheckoutConfigRead(BaseModel):
    """Public client-side Paddle Billing v2 checkout configuration."""

    environment: Literal["sandbox", "production"]
    client_token: str
    monthly_price_id: str
    annual_price_id: str
    is_configured: bool


class BillingOverviewRead(BaseModel):
    """Workspace subscription status, plan limits, and live usage metrics."""

    workspace_id: UUID
    plan_tier: Literal["free", "pro"]
    subscription_status: str
    billing_interval: Literal["month", "year"] | None = None
    current_period_starts_at: datetime | None = None
    current_period_ends_at: datetime | None = None
    cancel_at_period_end: bool = False
    has_portal_access: bool = False
    forms_used: int
    forms_limit: int
    submissions_used: int
    submissions_limit: int
    cycle_reset_at: datetime | None = None
    checkout: CheckoutConfigRead


class PortalSessionRead(BaseModel):
    """Temporary authenticated Paddle Customer Portal URL."""

    url: str


class WebhookAckResponse(BaseModel):
    """Acknowledgement returned to Paddle webhook deliveries."""

    received: bool = True
    event_id: str | None = None
    status: str = "processed"
