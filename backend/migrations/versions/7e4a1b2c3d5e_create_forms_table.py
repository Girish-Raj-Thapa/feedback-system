"""create_forms_table

Revision ID: 7e4a1b2c3d5e
Revises: 8b0ff5ecbb55
Create Date: 2026-11-01 09:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "7e4a1b2c3d5e"
down_revision: str | Sequence[str] | None = "8b0ff5ecbb55"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema to add forms table."""
    op.create_table(
        "forms",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column("template_type", sa.String(length=50), nullable=True),
        sa.Column(
            "title",
            sa.String(length=255),
            server_default="How was your experience today?",
            nullable=False,
        ),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column(
            "rating_scale_type",
            sa.String(length=30),
            server_default="5_star",
            nullable=False,
        ),
        sa.Column(
            "rating_required",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "category_pills",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "custom_questions",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "open_feedback_prompt",
            sa.String(length=255),
            server_default="What could we improve?",
            nullable=False,
        ),
        sa.Column("open_feedback_placeholder", sa.Text(), nullable=True),
        sa.Column(
            "contact_field_mode",
            sa.String(length=20),
            server_default="optional",
            nullable=False,
        ),
        sa.Column(
            "theme_config",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "outcome_screen",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "widget_settings",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "allowed_domains",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "idx_forms_ws_slug_active",
        "forms",
        ["workspace_id", sa.text("lower(slug)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "idx_forms_ws_active",
        "forms",
        ["workspace_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "idx_forms_ws_active",
        table_name="forms",
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.drop_index(
        "idx_forms_ws_slug_active",
        table_name="forms",
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.drop_table("forms")
