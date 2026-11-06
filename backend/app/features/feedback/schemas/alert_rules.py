"""
Pydantic schemas for Feedback Alert Rules.
Configures event routing, trigger conditions (detractor vs. all), and form filters.
"""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AlertRuleCreate(BaseModel):
    connection_id: UUID = Field(
        ...,
        description="Foreign key to the destination NotificationConnection",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Alert rule title (e.g. 'Instant Detractor Alerts')",
    )
    trigger_type: Literal["detractors_only", "all_feedback"] = Field(
        default="detractors_only",
        description="Trigger condition: 'detractors_only' (rating <= 3) or 'all_feedback'",
    )
    form_ids: list[UUID] | None = Field(
        default=None,
        description="List of target form IDs. If empty or null, applies to all workspace forms.",
    )
    include_customer_email: bool = Field(
        default=True,
        description="Whether to include customer email in notification cards",
    )


class AlertRuleUpdate(BaseModel):
    connection_id: UUID | None = None
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    trigger_type: Literal["detractors_only", "all_feedback"] | None = None
    form_ids: list[UUID] | None = None
    include_customer_email: bool | None = None
    is_active: bool | None = None


class AlertRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    connection_id: UUID
    name: str
    trigger_type: str
    form_ids: list[str] | None = None
    include_customer_email: bool
    is_active: bool
    connection_name: str | None = None
    connection_health: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, model: Any) -> "AlertRuleRead":
        conn = getattr(model, "connection", None)
        conn_name = conn.name if conn else None
        conn_health = conn.health_status if conn else None
        raw_forms = model.form_ids
        formatted_forms = [str(f) for f in raw_forms] if raw_forms else None

        now = datetime.now()
        return cls(
            id=model.id,
            workspace_id=model.workspace_id,
            connection_id=model.connection_id,
            name=model.name,
            trigger_type=model.trigger_type,
            form_ids=formatted_forms,
            include_customer_email=model.include_customer_email,
            is_active=model.is_active,
            connection_name=conn_name,
            connection_health=conn_health,
            created_at=model.created_at or now,
            updated_at=model.updated_at or now,
        )
