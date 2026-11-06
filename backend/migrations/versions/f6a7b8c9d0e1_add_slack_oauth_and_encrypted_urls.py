"""Add Slack OAuth columns, provider_metadata, and deduplication index

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-11-06 15:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add connection_method (default 'manual')
    op.add_column(
        "notification_connections",
        sa.Column(
            "connection_method",
            sa.String(length=20),
            server_default="manual",
            nullable=False,
        ),
    )

    # 2. Add provider_metadata (JSONB for team_id, channel_id, etc.)
    op.add_column(
        "notification_connections",
        sa.Column(
            "provider_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )

    # 3. Add created_by_user_id (foreign key to users.id)
    op.add_column(
        "notification_connections",
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # 4. Partial unique index for deduplication on workspace + team_id + channel_id
    op.create_index(
        "ix_notification_connections_ws_slack_channel",
        "notification_connections",
        [
            "workspace_id",
            sa.text("(provider_metadata->>'team_id')"),
            sa.text("(provider_metadata->>'channel_id')"),
        ],
        unique=True,
        postgresql_where=sa.text(
            "deleted_at IS NULL AND provider_metadata IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notification_connections_ws_slack_channel",
        table_name="notification_connections",
        postgresql_where=sa.text(
            "deleted_at IS NULL AND provider_metadata IS NOT NULL"
        ),
    )
    op.drop_column("notification_connections", "created_by_user_id")
    op.drop_column("notification_connections", "provider_metadata")
    op.drop_column("notification_connections", "connection_method")

