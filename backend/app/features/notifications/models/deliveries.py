"""
Database model for Outbound Deliveries.
The durable state machine record for all outbound notifications (Slack, Discord, webhooks, etc.).
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
    from app.features.feedback.models.alert_rules import AlertRule
    from app.features.notifications.models.attempts import DeliveryAttempt
    from app.features.notifications.models.connections import NotificationConnection


class OutboundDelivery(Base):
    """
    Durable state machine record for an outbound notification dispatch.
    Created atomically in the ingestion transaction (Outbox pattern).
    """

    __tablename__ = "outbound_deliveries"

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
        ForeignKey("notification_connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alert_rule_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("alert_rules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(160),
        unique=True,
        nullable=False,
        index=True,
    )

    # ─── State Machine ────────────────────────────────────────────────────────────
    # 'pending', 'processing', 'retry_scheduled', 'delivered', 'failed', 'cancelled'
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        index=True,
    )
    attempts_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer,
        default=4,
        nullable=False,
    )
    next_retry_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Payload & Delivery Result ────────────────────────────────────────────────
    payload_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )
    last_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Timestamps ──────────────────────────────────────────────────────────────
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

    # ─── Relationships ───────────────────────────────────────────────────────────
    workspace: Mapped["Workspace"] = relationship("Workspace")
    connection: Mapped["NotificationConnection"] = relationship(
        "NotificationConnection",
        back_populates="deliveries",
    )
    alert_rule: Mapped["AlertRule | None"] = relationship(
        "AlertRule",
        back_populates="deliveries",
    )
    attempts: Mapped[list["DeliveryAttempt"]] = relationship(
        "DeliveryAttempt",
        back_populates="delivery",
        cascade="all, delete-orphan",
        order_by="desc(DeliveryAttempt.attempted_at)",
    )

    __table_args__ = (
        Index(
            "ix_deliveries_due_queue",
            "status",
            "next_retry_at",
            postgresql_where=text("status IN ('pending', 'retry_scheduled')"),
        ),
        Index(
            "ix_deliveries_stuck_lock",
            "status",
            "locked_until",
            postgresql_where=text("status = 'processing'"),
        ),
    )

