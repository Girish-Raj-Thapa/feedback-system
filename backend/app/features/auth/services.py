"""
Business logic and transaction orchestration for authentication, identity, and RBAC authorization.
"""

import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.redis import get_redis, is_token_revoked, revoke_token
from app.core.security.jwt import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
)
from app.core.security.passwords import hash_password, verify_password
from app.features.auth.models import (
    AuditLog,
    Permission,
    Role,
    User,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
)
from app.features.auth.repositories import AuthRepository
from app.features.auth.schemas import (
    AcceptInviteRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    InviteJoinRequest,
    InvitePublicInfoRead,
    MemberOverrideUpdateRequest,
    MemberRoleUpdateRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    RoleCreateRequest,
    RoleRead,
    RoleUpdateRequest,
    TokenResponse,
    UserLoginRequest,
    UserMeRead,
    UserRegisterRequest,
    UserUpdateRequest,
    UserWorkspaceMembershipRead,
    VerifyEmailRequest,
    WorkspaceCreateRequest,
    WorkspaceInviteCreateRequest,
    WorkspaceInviteRead,
    WorkspaceMemberRead,
    WorkspaceRead,
    WorkspaceUpdateRequest,
)
from app.features.auth.tasks import (
    send_password_reset_email_task,
    send_verification_email_task,
    send_workspace_invite_email_task,
)
from app.features.feedback.services import FeedbackService

logger = get_logger("app.features.auth.services")

# ---------------------------------------------------------------------------
# Master Permissions Catalog
# ---------------------------------------------------------------------------

ALL_SYSTEM_PERMISSIONS = [
    # Workspace
    ("workspace:read", "View workspace settings and details", "workspace"),
    ("workspace:update", "Update workspace settings, logo, and timezone", "workspace"),
    ("workspace:delete", "Archive or delete the workspace", "workspace"),
    # Team & RBAC
    ("members:read", "View workspace team members and roles", "members"),
    ("members:invite", "Invite new teammates to the workspace", "members"),
    (
        "members:update_role",
        "Change a team member's role or permission overrides",
        "members",
    ),
    ("members:remove", "Remove a team member from the workspace", "members"),
    ("roles:manage", "Create, edit, or delete custom workspace roles", "roles"),
    # Forms & Ingestion
    ("forms:read", "View forms and embed widgets", "forms"),
    ("forms:create", "Create new feedback forms and widgets", "forms"),
    ("forms:update", "Edit form design, questions, pills, and outcomes", "forms"),
    ("forms:delete", "Archive or delete feedback forms", "forms"),
    ("api_keys:manage", "Generate and revoke API keys", "forms"),
    # Taxonomy
    ("taxonomy:read", "View locked theme buckets", "taxonomy"),
    ("taxonomy:manage", "Add, edit keywords, or reorder theme buckets", "taxonomy"),
    (
        "taxonomy:promote_topics",
        "Promote suggested topics to official theme buckets",
        "taxonomy",
    ),
    # Submissions & Triage
    ("submissions:read", "View customer feedback and customer profiles", "submissions"),
    (
        "submissions:triage",
        "Update feedback status and reclassify buckets",
        "submissions",
    ),
    ("submissions:reply", "Send email follow-ups to customers", "submissions"),
    ("submissions:delete", "Delete or archive feedback submissions", "submissions"),
    ("submissions:export", "Export feedback submissions to CSV", "submissions"),
    # Analytics & Decisions
    (
        "analytics:read",
        "View Score Driver metrics, impact tables, and executive bar",
        "analytics",
    ),
    ("decision_log:create", "Log business milestones and actions", "decision_log"),
    (
        "decision_log:update",
        "Edit or recalculate decision log impact markers",
        "decision_log",
    ),
    # Integrations & Billing
    (
        "webhooks:manage",
        "Configure Slack, Discord, and outbound JSON webhooks",
        "integrations",
    ),
    (
        "billing:manage",
        "View billing portal, manage plans, and payment methods",
        "billing",
    ),
]


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AuthRepository(session)

    # -----------------------------------------------------------------------
    # User Registration & Authentication
    # -----------------------------------------------------------------------

    async def register(self, payload: UserRegisterRequest) -> User:
        clean_email = payload.email.lower().strip()
        existing_user = await self.repo.get_by_email(clean_email)
        if existing_user is not None:
            raise ConflictError("User with this email already exists")

        hashed_password = await hash_password(payload.password)
        user = User(
            email=clean_email,
            password=hashed_password,
            full_name=payload.full_name.strip() if payload.full_name else None,
            is_active=True,
            is_verified=False,
            is_superuser=False,
        )

        try:
            created_user = await self.repo.create(user)
            await self.session.commit()
            await self.session.refresh(created_user)
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError("User with this email already exists") from exc

        verify_token = create_email_verification_token(
            subject=str(created_user.id),
            email=created_user.email,
        )
        try:
            await send_verification_email_task.kiq(
                email=created_user.email,
                token=verify_token,
            )
        except Exception as exc:
            logger.error(
                "auth.verification_email_dispatch_failed",
                error=str(exc),
                email=created_user.email,
            )

        return created_user

    async def login(self, payload: UserLoginRequest) -> TokenResponse:
        clean_email = payload.email.lower().strip()
        user = await self.repo.get_by_email(clean_email)
        if user is None:
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        is_valid = await verify_password(payload.password, user.password)
        if not is_valid:
            raise AuthenticationError("Invalid email or password")

        access_token = create_access_token(
            subject=str(user.id),
            extra_claims={
                "email": user.email,
                "is_superuser": user.is_superuser,
            },
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def refresh(self, payload: RefreshTokenRequest) -> TokenResponse:
        token_payload = decode_token(payload.refresh_token, expected_type="refresh")
        jti = token_payload.get("jti")
        if jti and await is_token_revoked(jti):
            raise AuthenticationError("Refresh token has been revoked")

        user_id_str = token_payload.get("sub")
        if not user_id_str:
            raise AuthenticationError("Invalid token payload")

        try:
            user_id = UUID(user_id_str)
        except ValueError as exc:
            raise AuthenticationError("Invalid token subject") from exc

        user = await self.repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User not found or inactive")

        if jti:
            exp = token_payload.get("exp", 0)
            await revoke_token(jti, exp)

        new_access_token = create_access_token(
            subject=str(user.id),
            extra_claims={
                "email": user.email,
                "is_superuser": user.is_superuser,
            },
        )
        new_refresh_token = create_refresh_token(subject=str(user.id))

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
        )

    async def logout(
        self,
        token_payload: dict[str, Any],
        refresh_token: str | None = None,
    ) -> None:
        access_jti = token_payload.get("jti")
        access_exp = token_payload.get("exp", 0)
        if access_jti and access_exp:
            await revoke_token(access_jti, access_exp)

        if refresh_token:
            try:
                ref_payload = decode_token(refresh_token, expected_type="refresh")
                ref_jti = ref_payload.get("jti")
                ref_exp = ref_payload.get("exp", 0)
                if ref_jti and ref_exp:
                    await revoke_token(ref_jti, ref_exp)
            except AuthenticationError:
                pass

    async def change_password(
        self,
        user: User,
        payload: ChangePasswordRequest,
    ) -> None:
        is_valid = await verify_password(payload.old_password, user.password)
        if not is_valid:
            raise AuthenticationError("Current password is incorrect")

        user.password = await hash_password(payload.new_password)
        await self.repo.update(user)
        await self.session.commit()

    async def request_password_reset(self, payload: ForgotPasswordRequest) -> None:
        clean_email = payload.email.lower().strip()
        user = await self.repo.get_by_email(clean_email)
        if user is None or not user.is_active:
            return

        reset_token = create_password_reset_token(subject=str(user.id))
        try:
            await send_password_reset_email_task.kiq(
                email=user.email,
                token=reset_token,
            )
        except Exception as exc:
            logger.error(
                "auth.password_reset_email_dispatch_failed",
                error=str(exc),
                email=user.email,
            )

    async def reset_password(self, payload: ResetPasswordRequest) -> None:
        token_payload = decode_token(payload.token, expected_type="reset_password")
        jti = token_payload.get("jti")
        if not jti or await is_token_revoked(jti):
            raise AuthenticationError("Reset token has already been used or expired")

        user_id_str = token_payload.get("sub")
        if not user_id_str:
            raise AuthenticationError("Invalid token subject")

        try:
            user_id = UUID(user_id_str)
        except ValueError as exc:
            raise AuthenticationError("Invalid user identifier in token") from exc

        user = await self.repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User not found or inactive")

        user.password = await hash_password(payload.new_password)
        await self.repo.update(user)

        exp = token_payload.get("exp", 0)
        await revoke_token(jti, exp)
        await self.session.commit()

    async def verify_email(self, payload: VerifyEmailRequest) -> None:
        token_payload = decode_token(payload.token, expected_type="verify_email")
        jti = token_payload.get("jti")
        if not jti or await is_token_revoked(jti):
            raise AuthenticationError(
                "Verification token has already been used or expired"
            )

        user_id_str = token_payload.get("sub")
        if not user_id_str:
            raise AuthenticationError("Invalid token subject")

        try:
            user_id = UUID(user_id_str)
        except ValueError as exc:
            raise AuthenticationError("Invalid user identifier in token") from exc

        user = await self.repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User not found or inactive")

        if not user.is_verified:
            user.is_verified = True
            await self.repo.update(user)
            await self.session.commit()

        exp = token_payload.get("exp", 0)
        await revoke_token(jti, exp)

    async def resend_verification_email(
        self,
        payload: ResendVerificationRequest,
    ) -> None:
        clean_email = payload.email.lower().strip()
        user = await self.repo.get_by_email(clean_email)
        if user is None or not user.is_active or user.is_verified:
            return

        verify_token = create_email_verification_token(
            subject=str(user.id),
            email=user.email,
        )
        try:
            await send_verification_email_task.kiq(
                email=user.email,
                token=verify_token,
            )
        except Exception as exc:
            logger.error(
                "auth.resend_verification_dispatch_failed",
                error=str(exc),
                email=user.email,
            )

    async def update_profile(
        self,
        user: User,
        payload: UserUpdateRequest,
    ) -> User:
        if payload.full_name is not None:
            user.full_name = payload.full_name.strip() or None

        await self.repo.update(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete_account(
        self,
        user: User,
        payload: DeleteAccountRequest,
        token_payload: dict[str, Any],
    ) -> None:
        is_valid = await verify_password(payload.password, user.password)
        if not is_valid:
            raise AuthenticationError("Password confirmation failed")

        user.is_active = False
        user.deleted_at = datetime.now(UTC)
        await self.repo.update(user)

        # Invalidate active access token
        access_jti = token_payload.get("jti")
        access_exp = token_payload.get("exp", 0)
        if access_jti and access_exp:
            await revoke_token(access_jti, access_exp)

        await self.session.commit()

    async def get_current_user(self, user_id: UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        if not user.is_active:
            raise AuthenticationError("User account is inactive")
        return user

    async def get_user_me(self, user: User) -> UserMeRead:
        memberships = await self.repo.list_memberships_for_user(user.id)
        workspace_items: list[UserWorkspaceMembershipRead] = []

        for m in memberships:
            role = await self.repo.get_role_by_id(m.role_id)
            if role is None:
                continue

            effective_perms = await self.get_effective_permissions(
                workspace_id=m.workspace_id,
                user_id=user.id,
            )

            ws = await self.repo.get_workspace_by_id(m.workspace_id)
            if ws is None or ws.deleted_at is not None:
                continue

            workspace_items.append(
                UserWorkspaceMembershipRead(
                    workspace_id=ws.id,
                    workspace_name=ws.name,
                    workspace_slug=ws.slug,
                    role_id=role.id,
                    role_name=role.name,
                    role_slug=role.slug,
                    effective_permissions=effective_perms,
                )
            )

        return UserMeRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            workspaces=workspace_items,
        )

    # -----------------------------------------------------------------------
    # Workspace Lifecycle Logic
    # -----------------------------------------------------------------------

    async def create_workspace(
        self,
        payload: WorkspaceCreateRequest,
        owner: User,
    ) -> WorkspaceRead:
        clean_name = payload.name.strip()
        slug_candidate = (
            payload.slug.lower().strip()
            if payload.slug
            else clean_name.lower().replace(" ", "-")
        )
        # Ensure alphanumeric and hyphens
        clean_slug = "".join(
            c for c in slug_candidate if c.isalnum() or c == "-"
        ).strip("-")
        if not clean_slug:
            clean_slug = f"ws-{secrets.token_hex(4)}"

        existing = await self.repo.get_workspace_by_slug(clean_slug)
        if existing is not None:
            clean_slug = f"{clean_slug}-{secrets.token_hex(3)}"

        workspace = Workspace(
            name=clean_name,
            slug=clean_slug,
            industry=payload.industry.strip() if payload.industry else None,
            business_type=payload.business_type.strip()
            if payload.business_type
            else None,
            timezone=payload.timezone.strip() if payload.timezone else "UTC",
            plan_tier="free",
            monthly_submission_limit=500,
            current_cycle_submissions_count=0,
            cycle_reset_at=datetime.now(UTC) + timedelta(days=30),
            ai_classification_enabled=True,
        )
        created_ws = await self.repo.create_workspace(workspace)

        # Automatically seed default roles (Owner, Admin, Editor, Viewer)
        owner_role, _, _, _ = await self.seed_default_workspace_roles(created_ws.id)

        # Add the creator as the WorkspaceMember with Owner role
        owner_member = WorkspaceMember(
            workspace_id=created_ws.id,
            user_id=owner.id,
            role_id=owner_role.id,
        )
        await self.repo.create_member(owner_member)

        # Automatically seed industry feedback categories
        feedback_service = FeedbackService(self.session)
        await feedback_service.seed_categories(
            workspace_id=created_ws.id,
            industry=created_ws.industry,
        )

        # Create audit log
        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=created_ws.id,
                actor_user_id=owner.id,
                action="workspace.created",
                resource_type="workspace",
                resource_id=str(created_ws.id),
                changes={
                    "name": created_ws.name,
                    "slug": created_ws.slug,
                    "owner_email": owner.email,
                },
            )
        )

        await self.session.commit()
        await self.session.refresh(created_ws)
        return WorkspaceRead.model_validate(created_ws)

    async def get_workspace(self, workspace_id: UUID) -> WorkspaceRead:
        ws = await self.repo.get_workspace_by_id(workspace_id)
        if ws is None or ws.deleted_at is not None:
            raise NotFoundError("Workspace not found")
        return WorkspaceRead.model_validate(ws)

    async def update_workspace(
        self,
        workspace_id: UUID,
        payload: WorkspaceUpdateRequest,
        actor_id: UUID,
    ) -> WorkspaceRead:
        ws = await self.repo.get_workspace_by_id(workspace_id)
        if ws is None or ws.deleted_at is not None:
            raise NotFoundError("Workspace not found")

        if payload.name is not None:
            ws.name = payload.name.strip()
        if payload.logo_url is not None:
            ws.logo_url = payload.logo_url.strip() or None
        if payload.industry is not None:
            ws.industry = payload.industry.strip() or None
        if payload.business_type is not None:
            ws.business_type = payload.business_type.strip() or None
        if payload.timezone is not None:
            ws.timezone = payload.timezone.strip()

        await self.repo.update_workspace(ws)
        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="workspace.updated",
                resource_type="workspace",
                resource_id=str(workspace_id),
                changes=payload.model_dump(exclude_unset=True),
            )
        )
        await self.session.commit()
        await self.session.refresh(ws)
        return WorkspaceRead.model_validate(ws)

    async def delete_workspace(
        self,
        workspace_id: UUID,
        actor_id: UUID,
    ) -> None:
        ws = await self.repo.get_workspace_by_id(workspace_id)
        if ws is None or ws.deleted_at is not None:
            raise NotFoundError("Workspace not found")

        ws.deleted_at = datetime.now(UTC)
        await self.repo.update_workspace(ws)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="workspace.deleted",
                resource_type="workspace",
                resource_id=str(workspace_id),
                changes={"deleted_at": str(ws.deleted_at)},
            )
        )
        await self.session.commit()

    # -----------------------------------------------------------------------
    # Authorization & RBAC Logic
    # -----------------------------------------------------------------------

    async def ensure_system_permissions(self) -> None:
        """
        Seeds master system permissions into the database if not present.
        """
        permissions = [
            Permission(
                id=p_id,
                name=p_id.replace(":", " ").replace("_", " ").title(),
                description=p_desc,
                category=p_cat,
            )
            for p_id, p_desc, p_cat in ALL_SYSTEM_PERMISSIONS
        ]
        await self.repo.seed_permissions_if_missing(permissions)
        await self.session.commit()

    async def seed_default_workspace_roles(
        self, workspace_id: UUID
    ) -> tuple[Role, Role, Role, Role]:
        """
        Initializes Owner, Admin, Editor, and Viewer roles with default permissions.
        """
        await self.ensure_system_permissions()

        # 1. Owner (all permissions, protected)
        owner_role = Role(
            workspace_id=workspace_id,
            name="Owner",
            slug="owner",
            description="Full control over workspace settings, members, and billing",
            is_system=True,
        )
        await self.repo.create_role(owner_role)
        all_perms = [p[0] for p in ALL_SYSTEM_PERMISSIONS]
        await self.repo.set_role_permissions(owner_role.id, all_perms)

        # 2. Admin (all permissions except workspace deletion)
        admin_role = Role(
            workspace_id=workspace_id,
            name="Admin",
            slug="admin",
            description="Manage forms, taxonomy, webhooks, and team members",
            is_system=True,
        )
        await self.repo.create_role(admin_role)
        admin_perms = [p for p in all_perms if p != "workspace:delete"]
        await self.repo.set_role_permissions(admin_role.id, admin_perms)

        # 3. Editor / Triage
        editor_role = Role(
            workspace_id=workspace_id,
            name="Editor / Triage",
            slug="editor",
            description="Edit forms, manage theme buckets, triage submissions, and reply",
            is_system=True,
        )
        await self.repo.create_role(editor_role)
        editor_perms = [
            "forms:read",
            "forms:create",
            "forms:update",
            "taxonomy:read",
            "taxonomy:manage",
            "taxonomy:promote_topics",
            "submissions:read",
            "submissions:triage",
            "submissions:reply",
            "submissions:export",
            "analytics:read",
            "decision_log:create",
            "decision_log:update",
        ]
        await self.repo.set_role_permissions(editor_role.id, editor_perms)

        # 4. Viewer (read-only)
        viewer_role = Role(
            workspace_id=workspace_id,
            name="Viewer",
            slug="viewer",
            description="View submissions, decision metrics, and analytics",
            is_system=True,
        )
        await self.repo.create_role(viewer_role)
        viewer_perms = [
            "workspace:read",
            "members:read",
            "forms:read",
            "taxonomy:read",
            "submissions:read",
            "analytics:read",
        ]
        await self.repo.set_role_permissions(viewer_role.id, viewer_perms)

        await self.session.commit()
        return owner_role, admin_role, editor_role, viewer_role

    async def get_effective_permissions(
        self, workspace_id: UUID, user_id: UUID
    ) -> list[str]:
        """
        Resolves effective permissions: (Role Permissions ∪ Granted) - Revoked.
        Cached in Redis with 15-minute TTL.
        """
        cache_key = f"auth:perms:{workspace_id}:{user_id}"
        redis = get_redis()

        try:
            cached_data = await redis.get(cache_key)
            if cached_data is not None:
                return json.loads(cached_data)
        except Exception:
            pass

        member = await self.repo.get_member(workspace_id=workspace_id, user_id=user_id)
        if member is None:
            return []

        # 1. Base permissions from assigned role
        role_perms = set(await self.repo.get_permissions_for_role(member.role_id))

        # 2. Member permission overrides
        overrides = await self.repo.get_overrides_for_member(member.id)
        for perm_id, is_granted in overrides.items():
            if is_granted:
                role_perms.add(perm_id)
            else:
                role_perms.discard(perm_id)

        effective_list = sorted(role_perms)

        try:
            await redis.set(cache_key, json.dumps(effective_list), ex=900)
        except Exception:
            pass

        return effective_list

    async def has_permission(
        self,
        workspace_id: UUID,
        user: User,
        required_permission: str,
    ) -> bool:
        """
        Check if user has a required permission in workspace.
        Superusers bypass all checks.
        """
        if user.is_superuser:
            return True

        permissions = await self.get_effective_permissions(
            workspace_id=workspace_id,
            user_id=user.id,
        )
        return required_permission in permissions

    async def invalidate_permission_cache(
        self, workspace_id: UUID, user_id: UUID | None = None
    ) -> None:
        redis = get_redis()
        try:
            if user_id:
                await redis.delete(f"auth:perms:{workspace_id}:{user_id}")
            else:
                # Invalidate all users in this workspace
                keys = await redis.keys(f"auth:perms:{workspace_id}:*")
                if keys:
                    await redis.delete(*keys)
        except Exception:
            pass

    # -----------------------------------------------------------------------
    # Workspace Roles & Membership Administration
    # -----------------------------------------------------------------------

    async def list_roles(self, workspace_id: UUID) -> list[RoleRead]:
        roles = await self.repo.list_roles_by_workspace(workspace_id)
        items: list[RoleRead] = []
        for r in roles:
            perms = await self.repo.get_permissions_for_role(r.id)
            items.append(
                RoleRead(
                    id=r.id,
                    workspace_id=r.workspace_id,
                    name=r.name,
                    slug=r.slug,
                    description=r.description,
                    is_system=r.is_system,
                    permissions=perms,
                    created_at=r.created_at,
                )
            )
        return items

    async def create_custom_role(
        self,
        workspace_id: UUID,
        payload: RoleCreateRequest,
        actor_id: UUID,
    ) -> RoleRead:
        clean_slug = payload.name.lower().strip().replace(" ", "-")
        existing = await self.repo.get_role_by_slug(workspace_id, clean_slug)
        if existing is not None:
            raise ConflictError(f"Role '{payload.name}' already exists in workspace")

        role = Role(
            workspace_id=workspace_id,
            name=payload.name.strip(),
            slug=clean_slug,
            description=payload.description.strip() if payload.description else None,
            is_system=False,
        )
        created_role = await self.repo.create_role(role)
        if payload.permission_ids:
            await self.repo.set_role_permissions(
                created_role.id, payload.permission_ids
            )

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="role.created",
                resource_type="role",
                resource_id=str(created_role.id),
                changes={
                    "name": created_role.name,
                    "permissions": payload.permission_ids,
                },
            )
        )
        await self.session.commit()
        await self.session.refresh(created_role)

        perms = await self.repo.get_permissions_for_role(created_role.id)
        return RoleRead(
            id=created_role.id,
            workspace_id=created_role.workspace_id,
            name=created_role.name,
            slug=created_role.slug,
            description=created_role.description,
            is_system=created_role.is_system,
            permissions=perms,
            created_at=created_role.created_at,
        )

    async def update_role(
        self,
        workspace_id: UUID,
        role_id: UUID,
        payload: RoleUpdateRequest,
        actor_id: UUID,
    ) -> RoleRead:
        role = await self.repo.get_role_by_id(role_id)
        if role is None or role.workspace_id != workspace_id:
            raise NotFoundError("Role not found")

        if payload.name is not None and not role.is_system:
            role.name = payload.name.strip()
            role.slug = payload.name.lower().strip().replace(" ", "-")

        if payload.description is not None:
            role.description = payload.description.strip() or None

        if payload.permission_ids is not None:
            if role.slug == "owner":
                raise ForbiddenError("Cannot alter permissions on the Owner role")
            await self.repo.set_role_permissions(role.id, payload.permission_ids)
            await self.invalidate_permission_cache(workspace_id=workspace_id)

        await self.repo.update_role(role)
        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="role.updated",
                resource_type="role",
                resource_id=str(role.id),
                changes=payload.model_dump(exclude_unset=True),
            )
        )
        await self.session.commit()
        await self.session.refresh(role)

        perms = await self.repo.get_permissions_for_role(role.id)
        return RoleRead(
            id=role.id,
            workspace_id=role.workspace_id,
            name=role.name,
            slug=role.slug,
            description=role.description,
            is_system=role.is_system,
            permissions=perms,
            created_at=role.created_at,
        )

    async def delete_role(
        self,
        workspace_id: UUID,
        role_id: UUID,
        actor_id: UUID,
    ) -> None:
        role = await self.repo.get_role_by_id(role_id)
        if role is None or role.workspace_id != workspace_id:
            raise NotFoundError("Role not found")

        if role.is_system:
            raise ForbiddenError("System roles cannot be deleted")

        # Check if members are assigned to this role
        members = await self.repo.list_members_by_workspace(workspace_id)
        if any(m.role_id == role_id for m in members):
            raise ConflictError(
                "Cannot delete role while members are assigned to it. Reassign members first."
            )

        await self.repo.delete_role(role)
        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="role.deleted",
                resource_type="role",
                resource_id=str(role_id),
                changes={"name": role.name},
            )
        )
        await self.session.commit()

    async def list_members(self, workspace_id: UUID) -> list[WorkspaceMemberRead]:
        members = await self.repo.list_members_by_workspace(workspace_id)
        items: list[WorkspaceMemberRead] = []

        for m in members:
            user = await self.repo.get_by_id(m.user_id)
            role = await self.repo.get_role_by_id(m.role_id)
            if user is None or role is None:
                continue

            overrides = await self.repo.get_overrides_for_member(m.id)
            effective_perms = await self.get_effective_permissions(
                workspace_id=workspace_id,
                user_id=user.id,
            )

            items.append(
                WorkspaceMemberRead(
                    id=m.id,
                    workspace_id=m.workspace_id,
                    user_id=user.id,
                    email=user.email,
                    full_name=user.full_name,
                    role_id=role.id,
                    role_name=role.name,
                    role_slug=role.slug,
                    overrides=overrides,
                    effective_permissions=effective_perms,
                    created_at=m.created_at,
                )
            )

        return items

    async def update_member_role(
        self,
        workspace_id: UUID,
        target_user_id: UUID,
        payload: MemberRoleUpdateRequest,
        actor_id: UUID,
    ) -> WorkspaceMemberRead:
        member = await self.repo.get_member(workspace_id, target_user_id)
        if member is None:
            raise NotFoundError("Workspace member not found")

        new_role = await self.repo.get_role_by_id(payload.role_id)
        if new_role is None or new_role.workspace_id != workspace_id:
            raise NotFoundError("Target role not found in this workspace")

        old_role_id = member.role_id
        member.role_id = new_role.id
        await self.repo.update_member(member)
        await self.invalidate_permission_cache(workspace_id, target_user_id)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="member.role_updated",
                resource_type="workspace_member",
                resource_id=str(member.id),
                changes={
                    "old_role_id": str(old_role_id),
                    "new_role_id": str(new_role.id),
                },
            )
        )
        await self.session.commit()
        await self.session.refresh(member)

        user = await self.repo.get_by_id(member.user_id)
        overrides = await self.repo.get_overrides_for_member(member.id)
        effective_perms = await self.get_effective_permissions(
            workspace_id=workspace_id,
            user_id=target_user_id,
        )

        return WorkspaceMemberRead(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            email=user.email if user else "",
            full_name=user.full_name if user else None,
            role_id=new_role.id,
            role_name=new_role.name,
            role_slug=new_role.slug,
            overrides=overrides,
            effective_permissions=effective_perms,
            created_at=member.created_at,
        )

    async def set_member_override(
        self,
        workspace_id: UUID,
        target_user_id: UUID,
        payload: MemberOverrideUpdateRequest,
        actor_id: UUID,
    ) -> WorkspaceMemberRead:
        member = await self.repo.get_member(workspace_id, target_user_id)
        if member is None:
            raise NotFoundError("Workspace member not found")

        perm = await self.repo.get_permission_by_id(payload.permission_id)
        if perm is None:
            raise NotFoundError(f"Permission '{payload.permission_id}' not found")

        await self.repo.upsert_member_override(
            workspace_member_id=member.id,
            permission_id=payload.permission_id,
            is_granted=payload.is_granted,
        )
        await self.invalidate_permission_cache(workspace_id, target_user_id)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="member.override_updated",
                resource_type="member_permission_override",
                resource_id=str(member.id),
                changes={
                    "permission_id": payload.permission_id,
                    "is_granted": payload.is_granted,
                },
            )
        )
        await self.session.commit()

        user = await self.repo.get_by_id(member.user_id)
        role = await self.repo.get_role_by_id(member.role_id)
        overrides = await self.repo.get_overrides_for_member(member.id)
        effective_perms = await self.get_effective_permissions(
            workspace_id=workspace_id,
            user_id=target_user_id,
        )

        return WorkspaceMemberRead(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            email=user.email if user else "",
            full_name=user.full_name if user else None,
            role_id=role.id if role else member.role_id,
            role_name=role.name if role else "",
            role_slug=role.slug if role else "",
            overrides=overrides,
            effective_permissions=effective_perms,
            created_at=member.created_at,
        )

    async def remove_member(
        self,
        workspace_id: UUID,
        target_user_id: UUID,
        actor_id: UUID,
    ) -> None:
        member = await self.repo.get_member(workspace_id, target_user_id)
        if member is None:
            raise NotFoundError("Workspace member not found")

        role = await self.repo.get_role_by_id(member.role_id)
        if role and role.slug == "owner":
            # Count total owners
            members = await self.repo.list_members_by_workspace(workspace_id)
            owner_count = sum(1 for m in members if m.role_id == role.id)
            if owner_count <= 1:
                raise ForbiddenError("Cannot remove the only Owner of the workspace")

        await self.repo.delete_member(member)
        await self.invalidate_permission_cache(workspace_id, target_user_id)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="member.removed",
                resource_type="workspace_member",
                resource_id=str(member.id),
                changes={"target_user_id": str(target_user_id)},
            )
        )
        await self.session.commit()

    async def invite_member(
        self,
        workspace_id: UUID,
        payload: WorkspaceInviteCreateRequest,
        inviter_id: UUID,
    ) -> WorkspaceInviteRead:
        clean_email = payload.email.lower().strip()

        # Check if already a member
        existing_user = await self.repo.get_by_email(clean_email)
        if existing_user is not None:
            member = await self.repo.get_member(workspace_id, existing_user.id)
            if member is not None:
                raise ConflictError("User is already a member of this workspace")

        role = await self.repo.get_role_by_id(payload.role_id)
        if role is None or role.workspace_id != workspace_id:
            raise NotFoundError("Role not found in this workspace")

        existing_invite = await self.repo.get_invite_by_email(workspace_id, clean_email)
        if existing_invite is not None:
            raise ConflictError("A pending invitation already exists for this email")

        token_raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token_raw.encode("utf-8")).hexdigest()

        invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=clean_email,
            role_id=role.id,
            token_hash=token_hash,
            status="pending",
            invited_by_user_id=inviter_id,
            expires_at=datetime.now(UTC)
            + timedelta(days=settings.WORKSPACE_INVITE_TOKEN_TTL_DAYS),
        )
        created_invite = await self.repo.create_invite(invite)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=inviter_id,
                action="invite.created",
                resource_type="workspace_invite",
                resource_id=str(created_invite.id),
                changes={"email": clean_email, "role": role.name},
            )
        )
        await self.session.commit()
        await self.session.refresh(created_invite)

        # Dispatch invitation email asynchronously via Taskiq worker
        inviter = await self.repo.get_by_id(inviter_id)
        ws = await self.repo.get_workspace_by_id(workspace_id)
        workspace_name = ws.name if ws else "Workspace"
        inviter_name = inviter.full_name or inviter.email if inviter else None

        try:
            await send_workspace_invite_email_task.kiq(
                email=clean_email,
                workspace_name=workspace_name,
                inviter_name=inviter_name,
                role_name=role.name,
                token=token_raw,
            )
        except Exception as exc:
            logger.error(
                "auth.workspace_invite_email_dispatch_failed",
                error=str(exc),
                email=clean_email,
            )

        read_invite = WorkspaceInviteRead.model_validate(created_invite)
        read_invite.invite_token = token_raw
        return read_invite

    async def accept_invite(
        self,
        payload: AcceptInviteRequest,
        current_user: User,
    ) -> WorkspaceMemberRead:
        # Token lookup
        token_hash = hashlib.sha256(payload.token.strip().encode("utf-8")).hexdigest()
        invite = await self.repo.get_invite_by_token_hash(token_hash)
        if invite is None:
            raise NotFoundError("Invalid or expired invitation token")

        if invite.expires_at < datetime.now(UTC):
            invite.status = "expired"
            await self.repo.update_invite(invite)
            await self.session.commit()
            raise ValidationError("This invitation has expired")

        # Check if already a member
        existing_member = await self.repo.get_member(
            invite.workspace_id, current_user.id
        )
        if existing_member is not None:
            invite.status = "accepted"
            await self.repo.update_invite(invite)
            await self.session.commit()
            raise ConflictError("You are already a member of this workspace")

        member = WorkspaceMember(
            workspace_id=invite.workspace_id,
            user_id=current_user.id,
            role_id=invite.role_id,
        )
        created_member = await self.repo.create_member(member)

        invite.status = "accepted"
        await self.repo.update_invite(invite)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=invite.workspace_id,
                actor_user_id=current_user.id,
                action="invite.accepted",
                resource_type="workspace_member",
                resource_id=str(created_member.id),
                changes={"email": current_user.email},
            )
        )
        await self.session.commit()
        await self.session.refresh(created_member)

        role = await self.repo.get_role_by_id(created_member.role_id)
        effective_perms = await self.get_effective_permissions(
            workspace_id=created_member.workspace_id,
            user_id=current_user.id,
        )

        return WorkspaceMemberRead(
            id=created_member.id,
            workspace_id=created_member.workspace_id,
            user_id=created_member.user_id,
            email=current_user.email,
            full_name=current_user.full_name,
            role_id=created_member.role_id,
            role_name=role.name if role else "",
            role_slug=role.slug if role else "",
            overrides={},
            effective_permissions=effective_perms,
            created_at=created_member.created_at,
        )

    async def list_invites(self, workspace_id: UUID) -> list[WorkspaceInviteRead]:
        invites = await self.repo.list_invites_by_workspace(workspace_id)
        return [WorkspaceInviteRead.model_validate(inv) for inv in invites]

    async def revoke_invite(
        self,
        workspace_id: UUID,
        invite_id: UUID,
        actor_id: UUID,
    ) -> None:
        invite = await self.repo.get_invite_by_id(invite_id)
        if invite is None or invite.workspace_id != workspace_id:
            raise NotFoundError("Invitation not found")

        invite.status = "revoked"
        await self.repo.update_invite(invite)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=workspace_id,
                actor_user_id=actor_id,
                action="invite.revoked",
                resource_type="workspace_invite",
                resource_id=str(invite_id),
                changes={"email": invite.email},
            )
        )
        await self.session.commit()

    async def get_invite_details(self, token: str) -> InvitePublicInfoRead:
        token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
        invite = await self.repo.get_invite_by_token_hash(token_hash)
        if invite is None:
            raise NotFoundError("Invalid or expired invitation token")

        if invite.expires_at < datetime.now(UTC):
            invite.status = "expired"
            await self.repo.update_invite(invite)
            await self.session.commit()
            raise ValidationError("This invitation has expired")

        ws = await self.repo.get_workspace_by_id(invite.workspace_id)
        role = await self.repo.get_role_by_id(invite.role_id)
        inviter = (
            await self.repo.get_by_id(invite.invited_by_user_id)
            if invite.invited_by_user_id
            else None
        )
        existing_user = await self.repo.get_by_email(invite.email)

        return InvitePublicInfoRead(
            token=token.strip(),
            email=invite.email,
            workspace_name=ws.name if ws else "Workspace",
            role_name=role.name if role else "Member",
            inviter_name=inviter.full_name or inviter.email if inviter else None,
            is_existing_user=existing_user is not None,
            expires_at=invite.expires_at,
        )

    async def join_via_invite(
        self,
        payload: InviteJoinRequest,
    ) -> tuple[TokenResponse, User]:
        token_hash = hashlib.sha256(payload.token.strip().encode("utf-8")).hexdigest()
        invite = await self.repo.get_invite_by_token_hash(token_hash)
        if invite is None:
            raise NotFoundError("Invalid or expired invitation token")

        if invite.expires_at < datetime.now(UTC):
            invite.status = "expired"
            await self.repo.update_invite(invite)
            await self.session.commit()
            raise ValidationError("This invitation has expired")

        user = await self.repo.get_by_email(invite.email)
        if user is not None:
            # Existing user must provide correct password
            is_valid = await verify_password(payload.password, user.password)
            if not is_valid:
                raise AuthenticationError("Invalid password for existing user account")
        else:
            # Create brand-new user with email verified
            hashed_pwd = await hash_password(payload.password)
            new_user = User(
                email=invite.email,
                password=hashed_pwd,
                full_name=payload.full_name.strip() if payload.full_name else None,
                is_active=True,
                is_verified=True,  # Proven via secret token delivered to inbox!
                is_superuser=False,
            )
            user = await self.repo.create(new_user)
            await self.session.flush()

        # Add member to workspace
        existing_member = await self.repo.get_member(invite.workspace_id, user.id)
        if existing_member is None:
            member = WorkspaceMember(
                workspace_id=invite.workspace_id,
                user_id=user.id,
                role_id=invite.role_id,
            )
            await self.repo.create_member(member)

        invite.status = "accepted"
        await self.repo.update_invite(invite)

        await self.repo.create_audit_log(
            AuditLog(
                workspace_id=invite.workspace_id,
                actor_user_id=user.id,
                action="invite.joined",
                resource_type="workspace_member",
                resource_id=str(user.id),
                changes={"email": user.email},
            )
        )
        await self.session.commit()
        await self.session.refresh(user)

        access_token = create_access_token(
            subject=str(user.id),
            extra_claims={"email": user.email, "is_superuser": user.is_superuser},
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        token_resp = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
        return token_resp, user
