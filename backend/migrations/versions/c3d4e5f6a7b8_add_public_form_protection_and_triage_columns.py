"""Add token_jti, trust_level, lane, source, content_hash, challenge_result, spam_score, spam_reasons, triage_state to feedback_submissions

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-08 20:55:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "feedback_submissions",
        sa.Column("token_jti", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_feedback_submissions_token_jti",
        "feedback_submissions",
        ["token_jti"],
        unique=True,
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "trust_level",
            sa.String(length=30),
            server_default="anonymous",
            nullable=False,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "lane",
            sa.String(length=30),
            server_default="lane_a",
            nullable=False,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "source",
            sa.String(length=30),
            server_default="hosted",
            nullable=False,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column("content_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_feedback_submissions_content_hash",
        "feedback_submissions",
        ["content_hash"],
        unique=False,
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "challenge_result",
            sa.String(length=30),
            server_default="skipped",
            nullable=False,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "spam_score",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "spam_reasons",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "feedback_submissions",
        sa.Column(
            "triage_state",
            sa.String(length=30),
            server_default="pending",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("feedback_submissions", "triage_state")
    op.drop_column("feedback_submissions", "spam_reasons")
    op.drop_column("feedback_submissions", "spam_score")
    op.drop_column("feedback_submissions", "challenge_result")
    op.drop_index(
        "ix_feedback_submissions_content_hash",
        table_name="feedback_submissions",
    )
    op.drop_column("feedback_submissions", "content_hash")
    op.drop_column("feedback_submissions", "source")
    op.drop_column("feedback_submissions", "lane")
    op.drop_column("feedback_submissions", "trust_level")
    op.drop_index(
        "ix_feedback_submissions_token_jti",
        table_name="feedback_submissions",
    )
    op.drop_column("feedback_submissions", "token_jti")
