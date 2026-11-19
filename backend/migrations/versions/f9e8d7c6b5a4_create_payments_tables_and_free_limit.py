"""create payments tables and tighten free monthly_submission_limit to 10

Revision ID: f9e8d7c6b5a4
Revises: d4e5f6a7b8c9
Create Date: 2026-11-16 16:55:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f9e8d7c6b5a4"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspace_subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("plan_tier", sa.String(length=50), nullable=False),
        sa.Column("billing_interval", sa.String(length=20), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("paddle_customer_id", sa.String(length=100), nullable=True),
        sa.Column("paddle_subscription_id", sa.String(length=100), nullable=True),
        sa.Column("paddle_price_id", sa.String(length=100), nullable=True),
        sa.Column(
            "current_period_starts_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "current_period_ends_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False),
        sa.Column(
            "last_event_occurred_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("paddle_subscription_id"),
    )
    op.create_index(
        "ix_workspace_subscriptions_paddle_customer_id",
        "workspace_subscriptions",
        ["paddle_customer_id"],
        unique=False,
    )
    op.create_index(
        "ix_workspace_subscriptions_workspace_id",
        "workspace_subscriptions",
        ["workspace_id"],
        unique=True,
    )

    op.create_table(
        "payment_webhook_events",
        sa.Column("event_id", sa.String(length=100), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_index(
        "ix_payment_webhook_events_workspace_id",
        "payment_webhook_events",
        ["workspace_id"],
        unique=False,
    )

    op.execute(
        sa.text(
            "UPDATE workspaces SET monthly_submission_limit = 10 "
            "WHERE LOWER(plan_tier) = 'free' AND monthly_submission_limit = 500"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE workspaces SET monthly_submission_limit = 500 "
            "WHERE LOWER(plan_tier) = 'free' AND monthly_submission_limit = 10"
        )
    )
    op.drop_index(
        "ix_payment_webhook_events_workspace_id",
        table_name="payment_webhook_events",
    )
    op.drop_table("payment_webhook_events")
    op.drop_index(
        "ix_workspace_subscriptions_workspace_id",
        table_name="workspace_subscriptions",
    )
    op.drop_index(
        "ix_workspace_subscriptions_paddle_customer_id",
        table_name="workspace_subscriptions",
    )
    op.drop_table("workspace_subscriptions")
