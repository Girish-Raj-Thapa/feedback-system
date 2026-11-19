"""
Database models for Workspace Subscriptions and Paddle Webhook Event idempotency.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkspaceSubscription(Base):
    """
    Stores the active Paddle Billing subscription state scoped to a Workspace (1:1).
    Only written by PaymentService from verified Paddle webhooks.
    """

    __tablename__ = "workspace_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    plan_tier: Mapped[str] = mapped_column(
        String(50),
        default="free",
        nullable=False,
    )
    billing_interval: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="active",
        nullable=False,
    )
    paddle_customer_id: Mapped[str | None] = mapped_column(
        String(100),
        index=True,
        nullable=True,
    )
    paddle_subscription_id: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
    )
    paddle_price_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    current_period_starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    current_period_ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    last_event_occurred_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class PaymentWebhookEvent(Base):
    """
    Deduplication ledger for processed Paddle webhook event IDs.
    """

    __tablename__ = "payment_webhook_events"

    event_id: Mapped[str] = mapped_column(
        String(100),
        primary_key=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("workspaces.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
