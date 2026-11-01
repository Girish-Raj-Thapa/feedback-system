"""
Pydantic schemas for Feedback Submissions.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class FeedbackSubmissionCreate(BaseModel):
    """
    Payload for submitting feedback through a public form or widget.
    """

    rating: int | None = Field(
        default=None,
        description="Rating value (e.g. 1-5 or 1-10 depending on form scale)",
    )
    category_pill_label: str | None = Field(
        default=None,
        max_length=100,
        description="Selected category pill label",
    )
    comment: str | None = Field(
        default=None,
        max_length=10000,
        description="Open-ended feedback text",
    )
    custom_answers: dict[str, Any] = Field(
        default_factory=dict,
        description="Key-value mapping of custom question answers",
    )
    customer_email: EmailStr | None = Field(
        default=None,
        description="Optional or required customer email address",
    )
    customer_name: str | None = Field(
        default=None,
        max_length=255,
        description="Optional customer name",
    )
    customer_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Client device, URL, referrer, and screen metadata",
    )


class FeedbackOutcomeResponse(BaseModel):
    """
    Tailored outcome configuration returned to the user upon submission.
    """

    title: str
    message: str
    is_high_score: bool
    cta_text: str | None = None
    cta_url: str | None = None


class FeedbackSubmissionResponse(BaseModel):
    """
    Public response returned after successful feedback submission.
    """

    id: UUID
    workspace_slug: str
    form_slug: str
    rating: int | None
    rating_scale_type: str
    category_pill_label: str | None
    category_id: UUID | None
    status: str
    created_at: datetime
    outcome: FeedbackOutcomeResponse


class FeedbackSubmissionRead(BaseModel):
    """
    Full feedback submission schema for workspace inbox and reporting.
    """

    id: UUID
    workspace_id: UUID
    form_id: UUID
    category_id: UUID | None
    category_pill_label: str | None
    rating: int | None
    rating_scale_type: str
    comment: str | None
    custom_answers: dict[str, Any]
    customer_email: str | None
    customer_name: str | None
    customer_metadata: dict[str, Any]
    status: str
    sentiment: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

