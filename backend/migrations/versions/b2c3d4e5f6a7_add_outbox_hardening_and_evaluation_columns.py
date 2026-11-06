"""Add alert_evaluated_at, alert_evaluation_attempts, and paused_until

Revision ID: b2c3d4e5f6a7
Revises: f6a7b8c9d0e1
Create Date: 2026-11-06 21:35:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add alert_evaluated_at and alert_evaluation_attempts to feedback_submissions
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "alert_evaluated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "alert_evaluation_attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.create_index(
        "ix_feedback_submissions_pending_eval",
        "feedback_submissions",
        ["created_at"],
        postgresql_where=sa.text(
            "alert_evaluated_at IS NULL AND alert_evaluation_attempts < 5"
        ),
    )

    # 2. Add paused_until to notification_connections for 429 rate limit backoff
    op.add_column(
        "notification_connections",
        sa.Column(
            "paused_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("notification_connections", "paused_until")
    op.drop_index(
        "ix_feedback_submissions_pending_eval",
        table_name="feedback_submissions",
    )
    op.drop_column("feedback_submissions", "alert_evaluation_attempts")
    op.drop_column("feedback_submissions", "alert_evaluated_at")

