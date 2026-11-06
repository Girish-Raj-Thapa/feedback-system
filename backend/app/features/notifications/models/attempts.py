"""
Database model for Delivery Attempts.
Append-only execution audit log recording each HTTP dispatch attempt, latency, and status code.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.features.notifications.models.deliveries import OutboundDelivery


class DeliveryAttempt(Base):
    """
    Lightweight execution log for an individual HTTP dispatch attempt.
    """

    __tablename__ = "delivery_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("outbound_deliveries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    http_status_code: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    response_snippet: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    duration_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    # ─── Relationships ───────────────────────────────────────────────────────────
    delivery: Mapped["OutboundDelivery"] = relationship(
        "OutboundDelivery",
        back_populates="attempts",
    )

    __table_args__ = (
        Index(
            "ix_delivery_attempts_delivery_date",
            "delivery_id",
            "attempted_at",
        ),
    )

