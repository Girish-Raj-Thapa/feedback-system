"""create_feedback_submissions_table

Revision ID: 9f5b2c3d4e6f
Revises: 7e4a1b2c3d5e
Create Date: 2026-11-01 20:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "9f5b2c3d4e6f"
down_revision: str | Sequence[str] | None = "7e4a1b2c3d5e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema to add feedback_submissions table."""
    op.create_table(
        "feedback_submissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("form_id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=True),
        sa.Column("category_pill_label", sa.String(length=100), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column(
            "rating_scale_type",
            sa.String(length=50),
            server_default=sa.text("'5_star'"),
            nullable=False,
        ),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "custom_answers",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("customer_email", sa.String(length=255), nullable=True),
        sa.Column("customer_name", sa.String(length=255), nullable=True),
        sa.Column(
            "customer_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            server_default=sa.text("'new'"),
            nullable=False,
        ),
        sa.Column("sentiment", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_feedback_submissions_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["form_id"],
            ["forms.id"],
            name=op.f("fk_feedback_submissions_form_id_forms"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["feedback_categories.id"],
            name=op.f("fk_feedback_submissions_category_id_feedback_categories"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feedback_submissions")),
    )

    op.create_index(
        op.f("ix_feedback_submissions_workspace_id"),
        "feedback_submissions",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_feedback_submissions_form_id"),
        "feedback_submissions",
        ["form_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_feedback_submissions_category_id"),
        "feedback_submissions",
        ["category_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_feedback_submissions_customer_email"),
        "feedback_submissions",
        ["customer_email"],
        unique=False,
    )
    op.create_index(
        "ix_feedback_submissions_workspace_created",
        "feedback_submissions",
        ["workspace_id", sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_feedback_submissions_workspace_customer",
        "feedback_submissions",
        ["workspace_id", "customer_email"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema to drop feedback_submissions table."""
    op.drop_index(
        "ix_feedback_submissions_workspace_customer",
        table_name="feedback_submissions",
    )
    op.drop_index(
        "ix_feedback_submissions_workspace_created",
        table_name="feedback_submissions",
    )
    op.drop_index(
        op.f("ix_feedback_submissions_customer_email"),
        table_name="feedback_submissions",
    )
    op.drop_index(
        op.f("ix_feedback_submissions_category_id"),
        table_name="feedback_submissions",
    )
    op.drop_index(
        op.f("ix_feedback_submissions_form_id"),
        table_name="feedback_submissions",
    )
    op.drop_index(
        op.f("ix_feedback_submissions_workspace_id"),
        table_name="feedback_submissions",
    )
    op.drop_table("feedback_submissions")
