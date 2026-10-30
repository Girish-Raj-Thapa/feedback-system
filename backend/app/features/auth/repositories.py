"""
Database queries for authentication, users, and RBAC models.
"""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import (
    AuditLog,
    MemberPermissionOverride,
    Permission,
    Role,
    RolePermission,
    User,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
)


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # -----------------------------------------------------------------------
    # User Queries
    # -----------------------------------------------------------------------

    async def get_by_id(self, user_id: UUID) -> User | None:
        query = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        clean_email = email.lower().strip()
        query = select(User).where(
            func.lower(User.email) == clean_email,
            User.deleted_at.is_(None),
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: User) -> User:
        await self.session.flush()
        return user

    # -----------------------------------------------------------------------
    # Workspace Queries
    # -----------------------------------------------------------------------

    async def get_workspace_by_id(self, workspace_id: UUID) -> Workspace | None:
        query = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_workspace_by_slug(self, slug: str) -> Workspace | None:
        clean_slug = slug.lower().strip()
        query = select(Workspace).where(
            func.lower(Workspace.slug) == clean_slug,
            Workspace.deleted_at.is_(None),
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_workspace(self, workspace: Workspace) -> Workspace:
        self.session.add(workspace)
        await self.session.flush()
        return workspace

    async def update_workspace(self, workspace: Workspace) -> Workspace:
        await self.session.flush()
        return workspace

    # -----------------------------------------------------------------------
    # Permission Queries
    # -----------------------------------------------------------------------

    async def list_permissions(self) -> Sequence[Permission]:
        query = select(Permission).order_by(Permission.category, Permission.id)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_permission_by_id(self, permission_id: str) -> Permission | None:
        return await self.session.get(Permission, permission_id)

    async def get_permissions_by_ids(
        self, permission_ids: list[str]
    ) -> Sequence[Permission]:
        if not permission_ids:
            return []
        query = select(Permission).where(Permission.id.in_(permission_ids))
        result = await self.session.execute(query)
        return result.scalars().all()

    async def seed_permissions_if_missing(self, permissions: list[Permission]) -> None:
        for perm in permissions:
            existing = await self.get_permission_by_id(perm.id)
            if existing is None:
                self.session.add(perm)
        await self.session.flush()

    # -----------------------------------------------------------------------
    # Role Queries
    # -----------------------------------------------------------------------

    async def get_role_by_id(self, role_id: UUID) -> Role | None:
        return await self.session.get(Role, role_id)

    async def get_role_by_slug(self, workspace_id: UUID, slug: str) -> Role | None:
        query = select(Role).where(
            Role.workspace_id == workspace_id,
            func.lower(Role.slug) == slug.lower().strip(),
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_roles_by_workspace(self, workspace_id: UUID) -> Sequence[Role]:
        query = (
            select(Role)
            .where(Role.workspace_id == workspace_id)
            .order_by(Role.created_at.asc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create_role(self, role: Role) -> Role:
        self.session.add(role)
        await self.session.flush()
        return role

    async def update_role(self, role: Role) -> Role:
        await self.session.flush()
        return role

    async def delete_role(self, role: Role) -> None:
        await self.session.delete(role)
        await self.session.flush()

    # -----------------------------------------------------------------------
    # RolePermission Queries
    # -----------------------------------------------------------------------

    async def get_permissions_for_role(self, role_id: UUID) -> list[str]:
        query = select(RolePermission.permission_id).where(
            RolePermission.role_id == role_id
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def set_role_permissions(
        self, role_id: UUID, permission_ids: list[str]
    ) -> None:
        # Delete existing mappings
        delete_stmt = delete(RolePermission).where(RolePermission.role_id == role_id)
        await self.session.execute(delete_stmt)

        # Add new mappings
        for pid in permission_ids:
            self.session.add(RolePermission(role_id=role_id, permission_id=pid))
        await self.session.flush()

    # -----------------------------------------------------------------------
    # WorkspaceMember Queries
    # -----------------------------------------------------------------------

    async def get_member(
        self, workspace_id: UUID, user_id: UUID
    ) -> WorkspaceMember | None:
        query = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_member_by_id(self, member_id: UUID) -> WorkspaceMember | None:
        return await self.session.get(WorkspaceMember, member_id)

    async def list_members_by_workspace(
        self, workspace_id: UUID
    ) -> Sequence[WorkspaceMember]:
        query = (
            select(WorkspaceMember)
            .where(WorkspaceMember.workspace_id == workspace_id)
            .order_by(WorkspaceMember.created_at.asc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def list_memberships_for_user(
        self, user_id: UUID
    ) -> Sequence[WorkspaceMember]:
        query = (
            select(WorkspaceMember)
            .where(WorkspaceMember.user_id == user_id)
            .order_by(WorkspaceMember.created_at.asc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create_member(self, member: WorkspaceMember) -> WorkspaceMember:
        self.session.add(member)
        await self.session.flush()
        return member

    async def update_member(self, member: WorkspaceMember) -> WorkspaceMember:
        await self.session.flush()
        return member

    async def delete_member(self, member: WorkspaceMember) -> None:
        await self.session.delete(member)
        await self.session.flush()

    # -----------------------------------------------------------------------
    # MemberPermissionOverride Queries
    # -----------------------------------------------------------------------

    async def get_overrides_for_member(
        self, workspace_member_id: UUID
    ) -> dict[str, bool]:
        query = select(
            MemberPermissionOverride.permission_id,
            MemberPermissionOverride.is_granted,
        ).where(MemberPermissionOverride.workspace_member_id == workspace_member_id)
        result = await self.session.execute(query)
        return {row[0]: row[1] for row in result.all()}

    async def upsert_member_override(
        self,
        workspace_member_id: UUID,
        permission_id: str,
        is_granted: bool,
    ) -> MemberPermissionOverride:
        query = select(MemberPermissionOverride).where(
            MemberPermissionOverride.workspace_member_id == workspace_member_id,
            MemberPermissionOverride.permission_id == permission_id,
        )
        result = await self.session.execute(query)
        override = result.scalar_one_or_none()

        if override is not None:
            override.is_granted = is_granted
        else:
            override = MemberPermissionOverride(
                workspace_member_id=workspace_member_id,
                permission_id=permission_id,
                is_granted=is_granted,
            )
            self.session.add(override)

        await self.session.flush()
        return override

    async def delete_member_override(
        self, workspace_member_id: UUID, permission_id: str
    ) -> None:
        stmt = delete(MemberPermissionOverride).where(
            MemberPermissionOverride.workspace_member_id == workspace_member_id,
            MemberPermissionOverride.permission_id == permission_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    # -----------------------------------------------------------------------
    # WorkspaceInvite Queries
    # -----------------------------------------------------------------------

    async def get_invite_by_token_hash(self, token_hash: str) -> WorkspaceInvite | None:
        query = select(WorkspaceInvite).where(
            WorkspaceInvite.token_hash == token_hash,
            WorkspaceInvite.status == "pending",
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_invite_by_email(
        self, workspace_id: UUID, email: str
    ) -> WorkspaceInvite | None:
        query = select(WorkspaceInvite).where(
            WorkspaceInvite.workspace_id == workspace_id,
            func.lower(WorkspaceInvite.email) == email.lower().strip(),
            WorkspaceInvite.status == "pending",
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_invites_by_workspace(
        self, workspace_id: UUID
    ) -> Sequence[WorkspaceInvite]:
        query = (
            select(WorkspaceInvite)
            .where(
                WorkspaceInvite.workspace_id == workspace_id,
                WorkspaceInvite.status == "pending",
            )
            .order_by(WorkspaceInvite.created_at.desc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create_invite(self, invite: WorkspaceInvite) -> WorkspaceInvite:
        self.session.add(invite)
        await self.session.flush()
        return invite

    async def update_invite(self, invite: WorkspaceInvite) -> WorkspaceInvite:
        await self.session.flush()
        return invite

    async def get_invite_by_id(self, invite_id: UUID) -> WorkspaceInvite | None:
        query = select(WorkspaceInvite).where(WorkspaceInvite.id == invite_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def delete_invite(self, invite: WorkspaceInvite) -> None:
        await self.session.delete(invite)
        await self.session.flush()

    # -----------------------------------------------------------------------
    # AuditLog Queries
    # -----------------------------------------------------------------------

    async def create_audit_log(self, log: AuditLog) -> AuditLog:
        self.session.add(log)
        await self.session.flush()
        return log

    async def list_audit_logs(self, workspace_id: UUID) -> Sequence[AuditLog]:
        query = (
            select(AuditLog)
            .where(AuditLog.workspace_id == workspace_id)
            .order_by(AuditLog.created_at.desc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()
