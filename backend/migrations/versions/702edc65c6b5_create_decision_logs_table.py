"""create_decision_logs_table

Revision ID: 702edc65c6b5
Revises: c3d4e5f6a7b8
Create Date: 2026-11-10 14:18:11.044445

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "702edc65c6b5"
down_revision: str | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "decision_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("decision_date", sa.Date(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
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
            ["category_id"],
            ["feedback_categories.id"],
            name=op.f("fk_decision_logs_category_id_feedback_categories"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name=op.f("fk_decision_logs_created_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_decision_logs_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_decision_logs")),
    )
    op.create_index(
        op.f("ix_decision_logs_category_id"),
        "decision_logs",
        ["category_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_decision_logs_decision_date"),
        "decision_logs",
        ["decision_date"],
        unique=False,
    )
    op.create_index(
        "ix_decision_logs_workspace_date",
        "decision_logs",
        ["workspace_id", sa.literal_column("decision_date DESC")],
        unique=False,
    )
    op.create_index(
        op.f("ix_decision_logs_workspace_id"),
        "decision_logs",
        ["workspace_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_decision_logs_workspace_id"), table_name="decision_logs")
    op.drop_index("ix_decision_logs_workspace_date", table_name="decision_logs")
    op.drop_index(op.f("ix_decision_logs_decision_date"), table_name="decision_logs")
    op.drop_index(op.f("ix_decision_logs_category_id"), table_name="decision_logs")
    op.drop_table("decision_logs")
