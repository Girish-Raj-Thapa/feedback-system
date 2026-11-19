"""
Database models for Decision Logs (Before vs. After Impact Tracker).
Allows business owners to record business milestones and decisions tied to a Theme Bucket or workspace-wide,
and measure impact on average rating and complaint share.
"""

import uuid
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.features.auth.models import User, Workspace
    from app.features.feedback.models.categories import FeedbackCategory


class DecisionLog(Base):
    """
    Business milestone or decision record.
    Tracks changes (e.g. pricing redesign, feature release, onboarding overhaul)
    and measures sentiment before vs after the decision date.
    """

    __tablename__ = "decision_logs"

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
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("feedback_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    decision_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
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
        lazy="raise",
    )
    category: Mapped["FeedbackCategory | None"] = relationship(
        "FeedbackCategory",
        lazy="raise",
    )
    created_by: Mapped["User | None"] = relationship(
        "User",
        lazy="raise",
    )

    __table_args__ = (
        Index(
            "ix_decision_logs_workspace_date",
            "workspace_id",
            text("decision_date DESC"),
        ),
    )
