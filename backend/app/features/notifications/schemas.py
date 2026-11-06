"""
Pydantic schemas for Notification Connections, Outbound Deliveries, and Delivery Attempts.
Includes secure URL masking for webhook destinations.
"""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def mask_webhook_url(url: str) -> str:
    """
    Mask secret webhook URL for secure API responses.
    e.g. https://hooks.slack.com/services/T0123/B0456/SECRET1234
    becomes https://hooks.slack.com/services/T0123/B0456/******1234
    """
    if not url:
        return ""
    if "hooks.slack.com/services/" in url:
        parts = url.split("hooks.slack.com/services/")
        prefix = parts[0] + "hooks.slack.com/services/"
        token_path = parts[1]
        segments = token_path.split("/")
        if len(segments) >= 3:
            t = segments[0]
            b = segments[1]
            token = segments[2]
            masked_token = f"****{token[-4:]}" if len(token) > 4 else "******"
            return f"{prefix}{t}/{b}/{masked_token}"
    if len(url) > 20:
        return f"{url[:12]}...****...{url[-4:]}"
    return "******"


class NotificationConnectionCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Friendly name for the integration channel (e.g. '#customer-feedback')",
    )
    provider_type: Literal["slack_webhook"] = Field(
        default="slack_webhook",
        description="Notification provider type",
    )
    destination_url: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Webhook URL endpoint",
    )


class NotificationConnectionUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    destination_url: str | None = Field(
        default=None,
        min_length=10,
        max_length=2000,
    )
    is_active: bool | None = None


class NotificationConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    name: str
    provider_type: str
    connection_method: str = "manual"
    destination_url_masked: str
    is_active: bool
    health_status: str
    failure_reason: str | None = None
    consecutive_failures: int = 0
    provider_metadata: dict[str, Any] | None = None
    last_dispatched_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: Any) -> "NotificationConnectionRead":
        now = datetime.now()
        return cls(
            id=model.id,
            workspace_id=model.workspace_id,
            name=model.name,
            provider_type=model.provider_type,
            connection_method=getattr(model, "connection_method", "manual") or "manual",
            destination_url_masked=mask_webhook_url(model.destination_url),
            is_active=model.is_active,
            health_status=model.health_status,
            failure_reason=model.failure_reason,
            consecutive_failures=model.consecutive_failures or 0,
            provider_metadata=getattr(model, "provider_metadata", None),
            last_dispatched_at=model.last_dispatched_at,
            created_at=model.created_at or now,
            updated_at=model.updated_at or now,
        )


class SlackOAuthAuthorizeResponse(BaseModel):
    authorize_url: str


class SlackOAuthCallbackRequest(BaseModel):
    code: str
    state: str


class SlackOAuthCallbackResponse(BaseModel):
    success: bool
    workspace_slug: str
    channel_name: str
    connection: NotificationConnectionRead


class NotificationConnectionTestRequest(BaseModel):
    destination_url: str | None = Field(
        default=None,
        description="Optional ad-hoc webhook URL to test before saving",
    )
    provider_type: Literal["slack_webhook"] = Field(
        default="slack_webhook",
    )


class NotificationConnectionTestResponse(BaseModel):
    success: bool
    status_code: int | None = None
    message: str


class DeliveryAttemptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    delivery_id: UUID
    attempt_number: int
    status_code: int | None = None
    response_snippet: str | None = None
    error_message: str | None = None
    duration_ms: int | None = None
    attempted_at: datetime


class OutboundDeliveryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    connection_id: UUID
    alert_rule_id: UUID | None = None
    event_type: str
    status: str
    attempt_count: int
    max_attempts: int
    next_retry_at: datetime | None = None
    delivered_at: datetime | None = None
    created_at: datetime
    attempts: list[DeliveryAttemptRead] = []
