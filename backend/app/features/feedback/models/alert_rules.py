"""
Database model for Feedback Alert Rules.
Represents feedback domain routing rules linking form events/ratings to a notification connection.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

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
    from app.features.notifications.models.connections import NotificationConnection
    from app.features.notifications.models.deliveries import OutboundDelivery


class AlertRule(Base):
    """
    Feedback-specific alert rule.
    Evaluates customer feedback ratings and forms to route notifications to a NotificationConnection.
    """

    __tablename__ = "alert_rules"

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
    connection_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("notification_connections.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # ─── Independent Trigger Matrix ───────────────────────────────────────────────
    # trigger_type: 'detractors_only' (rating <= 3) | 'all_feedback'
    trigger_type: Mapped[str] = mapped_column(
        String(30),
        default="detractors_only",
        nullable=False,
    )
    # form_ids: None means all forms; list of UUID strings filters by form
    form_ids: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
    )

    # ─── Privacy Controls ────────────────────────────────────────────────────────
    include_customer_email: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # ─── Timestamps & Soft Delete ────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Relationships ───────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship(
        "Workspace",
        lazy="joined",
    )
    connection: Mapped["NotificationConnection"] = relationship(
        "NotificationConnection",
        back_populates="alert_rules",
        lazy="joined",
    )
    deliveries: Mapped[list["OutboundDelivery"]] = relationship(
        "OutboundDelivery",
        back_populates="alert_rule",
    )

    __table_args__ = (
        Index(
            "ix_alert_rules_ws_active",
            "workspace_id",
            postgresql_where=text("is_active = TRUE AND deleted_at IS NULL"),
        ),
    )

