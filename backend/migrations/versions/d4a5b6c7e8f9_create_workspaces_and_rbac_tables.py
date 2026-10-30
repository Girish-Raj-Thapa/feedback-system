"""create_workspaces_and_rbac_tables

Revision ID: d4a5b6c7e8f9
Revises: c64d9296215c
Create Date: 2026-10-20 17:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d4a5b6c7e8f9"
down_revision: str | Sequence[str] | None = "c64d9296215c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # 1. Update users table
    # -----------------------------------------------------------------------
    op.add_column(
        "users",
        sa.Column(
            "is_superuser",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Drop legacy role column if present
    op.drop_column("users", "role")

    # Replace old email index with partial unique index (LOWER(email) WHERE deleted_at IS NULL)
    op.drop_index("ix_users_email", table_name="users")
    op.create_index(
        "idx_users_email_active",
        "users",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # -----------------------------------------------------------------------
    # 2. Create workspaces table
    # -----------------------------------------------------------------------
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("industry", sa.String(length=50), nullable=True),
        sa.Column("business_type", sa.String(length=50), nullable=True),
        sa.Column(
            "timezone",
            sa.String(length=50),
            server_default="UTC",
            nullable=False,
        ),
        sa.Column(
            "plan_tier",
            sa.String(length=50),
            server_default="free",
            nullable=False,
        ),
        sa.Column(
            "monthly_submission_limit",
            sa.Integer(),
            server_default="500",
            nullable=False,
        ),
        sa.Column(
            "current_cycle_submissions_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column("cycle_reset_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "ai_classification_enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspaces")),
    )
    op.create_index(
        "idx_workspaces_slug_active",
        "workspaces",
        [sa.text("lower(slug)")],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # -----------------------------------------------------------------------
    # 3. Create permissions table
    # -----------------------------------------------------------------------
    op.create_table(
        "permissions",
        sa.Column("id", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_permissions")),
    )

    # -----------------------------------------------------------------------
    # 4. Create roles table
    # -----------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "is_system",
            sa.Boolean(),
            server_default=sa.text("false"),
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
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_roles_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roles")),
    )
    op.create_index(op.f("ix_roles_workspace_id"), "roles", ["workspace_id"])
    op.create_index(
        "idx_roles_ws_slug",
        "roles",
        ["workspace_id", sa.text("lower(slug)")],
        unique=True,
    )

    # -----------------------------------------------------------------------
    # 5. Create role_permissions table
    # -----------------------------------------------------------------------
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("permission_id", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            name=op.f("fk_role_permissions_permission_id_permissions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            name=op.f("fk_role_permissions_role_id_roles"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_role_permissions")),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )
    op.create_index(
        op.f("ix_role_permissions_permission_id"),
        "role_permissions",
        ["permission_id"],
    )
    op.create_index(
        op.f("ix_role_permissions_role_id"),
        "role_permissions",
        ["role_id"],
    )

    # -----------------------------------------------------------------------
    # 6. Create workspace_members table
    # -----------------------------------------------------------------------
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
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
            ["role_id"],
            ["roles.id"],
            name=op.f("fk_workspace_members_role_id_roles"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_workspace_members_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_workspace_members_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspace_members")),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )
    op.create_index(
        op.f("ix_workspace_members_role_id"),
        "workspace_members",
        ["role_id"],
    )
    op.create_index(
        op.f("ix_workspace_members_user_id"),
        "workspace_members",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_workspace_members_workspace_id"),
        "workspace_members",
        ["workspace_id"],
    )

    # -----------------------------------------------------------------------
    # 7. Create member_permission_overrides table
    # -----------------------------------------------------------------------
    op.create_table(
        "member_permission_overrides",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_member_id", sa.Uuid(), nullable=False),
        sa.Column("permission_id", sa.String(length=100), nullable=False),
        sa.Column("is_granted", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            name=op.f("fk_member_permission_overrides_permission_id_permissions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_member_id"],
            ["workspace_members.id"],
            name=op.f(
                "fk_member_permission_overrides_workspace_member_id_workspace_members"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_member_permission_overrides")),
        sa.UniqueConstraint(
            "workspace_member_id",
            "permission_id",
            name="uq_member_override",
        ),
    )
    op.create_index(
        op.f("ix_member_permission_overrides_permission_id"),
        "member_permission_overrides",
        ["permission_id"],
    )
    op.create_index(
        op.f("ix_member_permission_overrides_workspace_member_id"),
        "member_permission_overrides",
        ["workspace_member_id"],
    )

    # -----------------------------------------------------------------------
    # 8. Create workspace_invites table
    # -----------------------------------------------------------------------
    op.create_table(
        "workspace_invites",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "status",
            sa.String(length=30),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("invited_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_user_id"],
            ["users.id"],
            name=op.f("fk_workspace_invites_invited_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            name=op.f("fk_workspace_invites_role_id_roles"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_workspace_invites_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspace_invites")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_workspace_invites_token_hash")),
    )
    op.create_index(
        op.f("ix_workspace_invites_email"),
        "workspace_invites",
        ["email"],
    )
    op.create_index(
        op.f("ix_workspace_invites_workspace_id"),
        "workspace_invites",
        ["workspace_id"],
    )

    # -----------------------------------------------------------------------
    # 9. Create audit_logs table
    # -----------------------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", sa.String(length=255), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "changes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_actor_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_audit_logs_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
    )
    op.create_index(
        op.f("ix_audit_logs_action"),
        "audit_logs",
        ["action"],
    )
    op.create_index(
        op.f("ix_audit_logs_actor_user_id"),
        "audit_logs",
        ["actor_user_id"],
    )
    op.create_index(
        op.f("ix_audit_logs_created_at"),
        "audit_logs",
        ["created_at"],
    )
    op.create_index(
        op.f("ix_audit_logs_workspace_id"),
        "audit_logs",
        ["workspace_id"],
    )


def downgrade() -> None:
    # -----------------------------------------------------------------------
    # Revert tables in reverse dependency order
    # -----------------------------------------------------------------------
    op.drop_table("audit_logs")
    op.drop_table("workspace_invites")
    op.drop_table("member_permission_overrides")
    op.drop_table("workspace_members")
    op.drop_table("role_permissions")
    op.drop_table("roles")
    op.drop_table("permissions")
    op.drop_table("workspaces")

    # -----------------------------------------------------------------------
    # Revert users table changes
    # -----------------------------------------------------------------------
    op.drop_index("idx_users_email_active", table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=50),
            server_default="member",
            nullable=False,
        ),
    )
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "is_superuser")
