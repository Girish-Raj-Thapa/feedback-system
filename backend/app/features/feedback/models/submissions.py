"""
Database models for Feedback Submissions.
Captures rating, category pills, custom question responses, comments, and contact info.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.features.auth.models import Workspace
    from app.features.feedback.models.categories import FeedbackCategory
    from app.features.feedback.models.forms import Form


class FeedbackSubmission(Base):
    """
    Individual feedback submission record submitted via hosted page or widget.
    Links directly to the form and workspace, with optional deterministic category mapping.
    """

    __tablename__ = "feedback_submissions"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    form_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("feedback_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category_pill_label: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    rating: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    rating_scale_type: Mapped[str] = mapped_column(
        String(50),
        default="5_star",
        server_default=text("'5_star'"),
        nullable=False,
    )
    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    custom_answers: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    customer_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    customer_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    customer_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="new",
        server_default=text("'new'"),
        nullable=False,
    )
    sentiment: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    workspace: Mapped["Workspace"] = relationship(
        "Workspace",
        lazy="selectin",
    )
    form: Mapped["Form"] = relationship(
        "Form",
        lazy="selectin",
    )
    category: Mapped["FeedbackCategory | None"] = relationship(
        "FeedbackCategory",
        lazy="selectin",
    )

    __table_args__ = (
        Index(
            "ix_feedback_submissions_workspace_created",
            "workspace_id",
            text("created_at DESC"),
        ),
        Index(
            "ix_feedback_submissions_workspace_customer",
            "workspace_id",
            "customer_email",
        ),
    )
