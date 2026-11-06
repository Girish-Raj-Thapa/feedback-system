"""
Database model for Notification Connections.
Represents configured external integration destinations (Slack incoming webhooks, Discord, email, etc.)
with credentials and operational health status.
"""

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    event,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security.encryption import EncryptedString, set_current_tenant_id
from app.db.base import Base

if TYPE_CHECKING:
    from app.features.auth.models import User, Workspace
    from app.features.feedback.models.alert_rules import AlertRule
    from app.features.notifications.models.deliveries import OutboundDelivery


class NotificationConnection(Base):
    """
    Outbound integration destination owned by a workspace.
    Stores destination URL (encrypted at rest), credentials, and connection health state.
    """

    __tablename__ = "notification_connections"

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
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    provider_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="slack_webhook",
    )  # 'slack_webhook', 'slack_oauth', 'discord_webhook', 'generic_webhook'
    connection_method: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="manual",
        server_default="manual",
    )  # 'oauth' | 'manual'
    destination_url: Mapped[str] = mapped_column(
        EncryptedString,
        nullable=False,
    )
    secret_token: Mapped[str | None] = mapped_column(
        EncryptedString,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    provider_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ─── Operational Health & Circuit Breaker ──────────────────────────────────
    health_status: Mapped[str] = mapped_column(
        String(20),
        default="healthy",
        nullable=False,
    )  # 'healthy', 'degraded', 'revoked'
    consecutive_failures: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    failure_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    last_dispatched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    paused_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
    alert_rules: Mapped[list["AlertRule"]] = relationship(
        "AlertRule",
        back_populates="connection",
    )
    deliveries: Mapped[list["OutboundDelivery"]] = relationship(
        "OutboundDelivery",
        back_populates="connection",
    )

    __table_args__ = (
        Index(
            "ix_notification_connections_ws",
            "workspace_id",
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "ix_notification_connections_ws_slack_channel",
            "workspace_id",
            text("(provider_metadata->>'team_id')"),
            text("(provider_metadata->>'channel_id')"),
            unique=True,
            postgresql_where=text(
                "deleted_at IS NULL AND provider_metadata IS NOT NULL"
            ),
        ),
    )


@event.listens_for(NotificationConnection, "before_insert")
@event.listens_for(NotificationConnection, "before_update")
def _set_tenant_encryption_context(
    mapper: Any, connection: Any, target: NotificationConnection
) -> None:
    """Set the active tenant context for HKDF-SHA256 key derivation."""
    if target.workspace_id:
        set_current_tenant_id(str(target.workspace_id))


@event.listens_for(NotificationConnection, "after_insert")
@event.listens_for(NotificationConnection, "after_update")
def _clear_tenant_encryption_context(
    mapper: Any, connection: Any, target: NotificationConnection
) -> None:
    """Clear the tenant encryption context after DB operation finishes."""
    set_current_tenant_id(None)


