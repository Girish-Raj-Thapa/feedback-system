"""
Pydantic schemas for Decision Logs and Before vs. After Impact Metrics.
"""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DecisionLogCreate(BaseModel):
    """Payload for creating a new decision log milestone."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Clear title of the decision or milestone (e.g. Redesigned pricing page)",
    )
    description: str | None = Field(
        default=None,
        description="Optional detailed notes, rollout context, or hypotheses",
    )
    category_id: UUID | None = Field(
        default=None,
        description="Optional category/theme bucket ID. None represents workspace-wide decisions.",
    )
    decision_date: date = Field(
        ...,
        description="Calendar date when the decision or change went live",
    )


class DecisionLogUpdate(BaseModel):
    """Payload for updating an existing decision log milestone."""

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = None
    category_id: UUID | None = None
    decision_date: date | None = None


class DecisionWindowMetrics(BaseModel):
    """Metrics calculated for a single 30-day window (pre or post decision)."""

    start_date: date
    end_date: date
    total_submissions: int = 0
    average_rating: float | None = None
    negative_count: int = 0
    negative_percentage: float | None = None


class DecisionImpactMetrics(BaseModel):
    """Comparative before-and-after impact metrics."""

    before: DecisionWindowMetrics
    after: DecisionWindowMetrics
    score_delta: float | None = None
    complaint_share_delta: float | None = None
    status: Literal[
        "positive_impact",
        "negative_impact",
        "neutral_impact",
        "insufficient_data",
    ] = "insufficient_data"


class DecisionLogRead(BaseModel):
    """Read schema for a Decision Log with calculated impact metrics."""

    id: UUID
    workspace_id: UUID
    category_id: UUID | None = None
    category_name: str | None = None
    category_color: str | None = None
    title: str
    description: str | None = None
    decision_date: date
    created_by_user_id: UUID | None = None
    impact: DecisionImpactMetrics | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
