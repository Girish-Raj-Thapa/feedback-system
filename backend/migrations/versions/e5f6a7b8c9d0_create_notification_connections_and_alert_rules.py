"""create_notification_connections_and_alert_rules

Revision ID: e5f6a7b8c9d0
Revises: 9f5b2c3d4e6f
Create Date: 2026-11-06 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: str | Sequence[str] | None = "9f5b2c3d4e6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema to add outbound notifications and alert rules infrastructure."""
    # ─── 1. notification_connections ──────────────────────────────────────────
    op.create_table(
        "notification_connections",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "provider_type",
            sa.String(length=30),
            server_default=sa.text("'slack_webhook'"),
            nullable=False,
        ),
        sa.Column("destination_url", sa.Text(), nullable=False),
        sa.Column("secret_token", sa.String(length=255), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
        sa.Column(
            "health_status",
            sa.String(length=20),
            server_default=sa.text("'healthy'"),
            nullable=False,
        ),
        sa.Column(
            "consecutive_failures",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("last_dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_notification_connections_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notification_connections")),
    )
    op.create_index(
        op.f("ix_notification_connections_workspace_id"),
        "notification_connections",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        "ix_notification_connections_ws",
        "notification_connections",
        ["workspace_id"],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # ─── 2. alert_rules ────────────────────────────────────────────────────────
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("connection_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
        sa.Column(
            "trigger_type",
            sa.String(length=30),
            server_default=sa.text("'detractors_only'"),
            nullable=False,
        ),
        sa.Column(
            "form_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "include_customer_email",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["connection_id"],
            ["notification_connections.id"],
            name=op.f("fk_alert_rules_connection_id_notification_connections"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_alert_rules_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_alert_rules")),
    )
    op.create_index(
        op.f("ix_alert_rules_workspace_id"),
        "alert_rules",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_alert_rules_connection_id"),
        "alert_rules",
        ["connection_id"],
        unique=False,
    )
    op.create_index(
        "ix_alert_rules_ws_active",
        "alert_rules",
        ["workspace_id"],
        unique=False,
        postgresql_where=sa.text("is_active = TRUE AND deleted_at IS NULL"),
    )

    # ─── 3. outbound_deliveries ────────────────────────────────────────────────
    op.create_table(
        "outbound_deliveries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("connection_id", sa.UUID(), nullable=False),
        sa.Column("alert_rule_id", sa.UUID(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column(
            "attempts_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "max_attempts",
            sa.Integer(),
            server_default=sa.text("4"),
            nullable=False,
        ),
        sa.Column(
            "next_retry_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "payload_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["alert_rule_id"],
            ["alert_rules.id"],
            name=op.f("fk_outbound_deliveries_alert_rule_id_alert_rules"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["connection_id"],
            ["notification_connections.id"],
            name=op.f("fk_outbound_deliveries_connection_id_notification_connections"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_outbound_deliveries_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_outbound_deliveries")),
        sa.UniqueConstraint("idempotency_key", name=op.f("uq_outbound_deliveries_idempotency_key")),
    )
    op.create_index(
        op.f("ix_outbound_deliveries_workspace_id"),
        "outbound_deliveries",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_outbound_deliveries_connection_id"),
        "outbound_deliveries",
        ["connection_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_outbound_deliveries_alert_rule_id"),
        "outbound_deliveries",
        ["alert_rule_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_outbound_deliveries_status"),
        "outbound_deliveries",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_outbound_deliveries_next_retry_at"),
        "outbound_deliveries",
        ["next_retry_at"],
        unique=False,
    )
    op.create_index(
        "ix_deliveries_due_queue",
        "outbound_deliveries",
        ["status", "next_retry_at"],
        unique=False,
        postgresql_where=sa.text("status IN ('pending', 'retry_scheduled')"),
    )
    op.create_index(
        "ix_deliveries_stuck_lock",
        "outbound_deliveries",
        ["status", "locked_until"],
        unique=False,
        postgresql_where=sa.text("status = 'processing'"),
    )

    # ─── 4. delivery_attempts ──────────────────────────────────────────────────
    op.create_table(
        "delivery_attempts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("delivery_id", sa.UUID(), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("http_status_code", sa.Integer(), nullable=True),
        sa.Column("response_snippet", sa.String(length=500), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column(
            "attempted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["delivery_id"],
            ["outbound_deliveries.id"],
            name=op.f("fk_delivery_attempts_delivery_id_outbound_deliveries"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delivery_attempts")),
    )
    op.create_index(
        op.f("ix_delivery_attempts_delivery_id"),
        "delivery_attempts",
        ["delivery_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_delivery_attempts_attempted_at"),
        "delivery_attempts",
        ["attempted_at"],
        unique=False,
    )
    op.create_index(
        "ix_delivery_attempts_delivery_date",
        "delivery_attempts",
        ["delivery_id", "attempted_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema to remove outbound notifications and alert rules infrastructure."""
    op.drop_table("delivery_attempts")
    op.drop_table("outbound_deliveries")
    op.drop_table("alert_rules")
    op.drop_table("notification_connections")

