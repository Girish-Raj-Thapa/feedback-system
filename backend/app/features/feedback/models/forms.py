"""
Database models for Feedback Forms and Widget Configurations.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
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


class Form(Base):
    """
    Form & Widget Studio configuration.
    Controls the embeddable widget, standalone feedback page, questions,
    category pills, and conditional outcome screens.
    """

    __tablename__ = "forms"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )
    template_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # Core Content
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="How was your experience today?",
    )
    subtitle: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Signal 1: Quantitative Rating Scale
    rating_scale_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="5_star",  # 5_star, 5_emoji, 1_10_numeric
    )
    rating_required: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # Signal 2: Category Selector Pills (Linked to Feedback Categories)
    category_pills: Mapped[list[dict]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
        nullable=False,
    )

    # Custom Questions (Max 3: radio, multi-choice, text)
    custom_questions: Mapped[list[dict]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
        nullable=False,
    )

    # Signal 3: Open Feedback Field
    open_feedback_prompt: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="What could we improve?",
    )
    open_feedback_placeholder: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default="Tell us what went wrong or what you loved...",
    )
    contact_field_mode: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="optional",  # hidden, optional, required
    )

    # Visual Theme & Styling
    theme_config: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )

    # Conditional Outcome Screens (e.g. Low score private apology vs High score review CTA)
    outcome_screen: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )

    # Embed & Trigger Settings
    widget_settings: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    allowed_domains: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
        nullable=False,
    )

    # Timestamps & Soft Delete
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")

    __table_args__ = (
        Index(
            "idx_forms_ws_slug_active",
            workspace_id,
            func.lower(slug),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "idx_forms_ws_active",
            workspace_id,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )
