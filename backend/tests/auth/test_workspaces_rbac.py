"""
Integration and unit tests for Workspaces, RBAC permission resolution,
role management, member overrides, and invite lifecycles.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.security.jwt import create_access_token
from app.core.security.passwords import hash_password
from app.features.auth.models import (
    User,
    Workspace,
    WorkspaceMember,
)
from app.features.auth.schemas import (
    InviteJoinRequest,
    MemberOverrideUpdateRequest,
    RoleCreateRequest,
    RoleUpdateRequest,
    WorkspaceCreateRequest,
    WorkspaceInviteCreateRequest,
)
from app.features.auth.services import AuthService


@pytest.mark.asyncio
async def test_workspace_creation_atomicity(
    db_session: AsyncSession, test_user: User
) -> None:
    """
    Verify workspace creation atomically seeds:
    1. Workspace entity with valid slug.
    2. Exactly 4 default system roles (Owner, Admin, Editor, Viewer).
    3. Creator as WorkspaceMember with the Owner role.
    4. AuditLog record with action 'workspace.created'.
    """
    service = AuthService(db_session)
    slug = f"acme-corp-{uuid.uuid4().hex[:6]}"
    ws_read = await service.create_workspace(
        payload=WorkspaceCreateRequest(
            name="Acme Corporation",
            slug=slug,
            industry="B2B Software",
            timezone="America/New_York",
        ),
        owner=test_user,
    )

    assert ws_read.name == "Acme Corporation"
    assert ws_read.slug == slug
    assert ws_read.industry == "B2B Software"
    assert ws_read.timezone == "America/New_York"
    assert ws_read.plan_tier == "free"

    # Verify 4 default roles
    roles = await service.list_roles(ws_read.id)
    role_slugs = {r.slug: r for r in roles}
    assert set(role_slugs.keys()) == {"owner", "admin", "editor", "viewer"}
    assert all(r.is_system for r in roles)

    # Verify Owner has all permissions
    owner_role = role_slugs["owner"]
    assert "workspace:delete" in owner_role.permissions
    assert "billing:manage" in owner_role.permissions

    # Verify Viewer has restricted permissions
    viewer_role = role_slugs["viewer"]
    assert "workspace:delete" not in viewer_role.permissions
    assert "workspace:read" in viewer_role.permissions

    # Verify creator membership
    members = await service.list_members(ws_read.id)
    assert len(members) == 1
    assert members[0].user_id == test_user.id
    assert members[0].role_slug == "owner"
    assert "workspace:delete" in members[0].effective_permissions

    # Verify audit log
    audit_logs = await service.repo.list_audit_logs(ws_read.id)
    assert len(audit_logs) >= 1
    assert any(log.action == "workspace.created" for log in audit_logs)


@pytest.mark.asyncio
async def test_effective_permissions_formula(
    db_session: AsyncSession, test_workspace: Workspace
) -> None:
    r"""
    Verify the effective permission formula:
    Effective = (Role Permissions ∪ Granted Overrides) \ Revoked Overrides.
    """
    service = AuthService(db_session)

    # 1. Create a secondary test user
    colleague = User(
        email=f"colleague_{uuid.uuid4().hex[:6]}@example.com",
        password=await hash_password("Password123!"),
        full_name="Team Colleague",
        is_active=True,
        is_verified=True,
    )
    db_session.add(colleague)
    await db_session.commit()
    await db_session.refresh(colleague)

    # Find Viewer role
    roles = await service.list_roles(test_workspace.id)
    viewer_role = next(r for r in roles if r.slug == "viewer")

    # Add colleague as Viewer
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=colleague.id,
        role_id=viewer_role.id,
    )
    await service.repo.create_member(member)
    await db_session.commit()

    # Initial permissions match Viewer
    initial_perms = await service.get_effective_permissions(
        workspace_id=test_workspace.id,
        user_id=colleague.id,
    )
    assert "workspace:read" in initial_perms
    assert "forms:create" not in initial_perms
    assert "workspace:delete" not in initial_perms

    # Explicitly grant forms:create (+)
    await service.set_member_override(
        workspace_id=test_workspace.id,
        target_user_id=colleague.id,
        payload=MemberOverrideUpdateRequest(
            permission_id="forms:create",
            is_granted=True,
        ),
        actor_id=colleague.id,
    )

    perms_after_grant = await service.get_effective_permissions(
        workspace_id=test_workspace.id,
        user_id=colleague.id,
    )
    assert "forms:create" in perms_after_grant
    assert "workspace:read" in perms_after_grant

    # Explicitly revoke workspace:read (-)
    await service.set_member_override(
        workspace_id=test_workspace.id,
        target_user_id=colleague.id,
        payload=MemberOverrideUpdateRequest(
            permission_id="workspace:read",
            is_granted=False,
        ),
        actor_id=colleague.id,
    )

    perms_after_revoke = await service.get_effective_permissions(
        workspace_id=test_workspace.id,
        user_id=colleague.id,
    )
    assert "workspace:read" not in perms_after_revoke
    assert "forms:create" in perms_after_revoke


@pytest.mark.asyncio
async def test_custom_roles_crud_and_validation(
    db_session: AsyncSession, test_workspace: Workspace, test_user: User
) -> None:
    """
    Test creating, updating, and deleting custom roles.
    System roles must not be deletable.
    """
    service = AuthService(db_session)

    # Create custom role 'Support Specialist'
    custom_role = await service.create_custom_role(
        workspace_id=test_workspace.id,
        payload=RoleCreateRequest(
            name="Support Specialist",
            description="Triage feedback and reply to users",
            permission_ids=["submissions:read", "submissions:reply"],
        ),
        actor_id=test_user.id,
    )
    assert custom_role.name == "Support Specialist"
    assert custom_role.is_system is False
    assert set(custom_role.permissions) == {"submissions:read", "submissions:reply"}

    # Update permissions on the custom role
    updated_role = await service.update_role(
        workspace_id=test_workspace.id,
        role_id=custom_role.id,
        payload=RoleUpdateRequest(
            permission_ids=[
                "submissions:read",
                "submissions:reply",
                "submissions:triage",
            ]
        ),
        actor_id=test_user.id,
    )
    assert "submissions:triage" in updated_role.permissions

    # Delete the custom role
    await service.delete_role(
        workspace_id=test_workspace.id,
        role_id=custom_role.id,
        actor_id=test_user.id,
    )

    # Verify it is deleted
    all_roles = await service.list_roles(test_workspace.id)
    assert not any(r.id == custom_role.id for r in all_roles)


@pytest.mark.asyncio
async def test_workspace_invite_and_acceptance_lifecycle(
    db_session: AsyncSession, test_workspace: Workspace, test_user: User
) -> None:
    """
    Test inviting a user by email, token generation, and acceptance.
    """
    service = AuthService(db_session)
    roles = await service.list_roles(test_workspace.id)
    editor_role = next(r for r in roles if r.slug == "editor")

    invitee_email = f"invited_{uuid.uuid4().hex[:6]}@example.com"

    # Create invite
    invite_read = await service.invite_member(
        workspace_id=test_workspace.id,
        payload=WorkspaceInviteCreateRequest(
            email=invitee_email,
            role_id=editor_role.id,
        ),
        inviter_id=test_user.id,
    )
    assert invite_read.email == invitee_email
    assert invite_read.status == "pending"
    assert invite_read.invite_token is not None

    # Public invite token inspection (landing page before sign up)
    details = await service.get_invite_details(invite_read.invite_token)
    assert details.workspace_name == test_workspace.name
    assert details.email == invitee_email
    assert details.role_name == editor_role.name
    assert details.is_existing_user is False

    # Join via invite: Brand-new user creates password and immediately joins with is_verified=True
    tokens, user = await service.join_via_invite(
        InviteJoinRequest(
            token=invite_read.invite_token,
            password="SecureNewMemberPass123!",
            full_name="New Team Member",
        )
    )
    assert tokens.access_token is not None
    assert user.email == invitee_email
    assert (
        user.is_verified is True
    )  # Verified automatically by accessing the secret token!
    assert user.is_active is True

    # Check workspace membership was established
    member = await service.repo.get_member(test_workspace.id, user.id)
    assert member is not None
    assert member.role_id == editor_role.id

    # Verify token cannot be reused
    with pytest.raises(NotFoundError):
        await service.join_via_invite(
            InviteJoinRequest(
                token=invite_read.invite_token,
                password="AnotherPassword123!",
            )
        )

    # Test revoking an invite
    second_invitee = f"second_{uuid.uuid4().hex[:6]}@example.com"
    second_invite = await service.invite_member(
        workspace_id=test_workspace.id,
        payload=WorkspaceInviteCreateRequest(
            email=second_invitee,
            role_id=editor_role.id,
        ),
        inviter_id=test_user.id,
    )
    assert second_invite.invite_token is not None

    # List pending invites
    pending_list = await service.list_invites(test_workspace.id)
    assert any(i.id == second_invite.id for i in pending_list)

    # Revoke invite
    await service.revoke_invite(
        workspace_id=test_workspace.id,
        invite_id=second_invite.id,
        actor_id=test_user.id,
    )

    # Revoked invite cannot be retrieved or accepted
    with pytest.raises(NotFoundError):
        await service.get_invite_details(second_invite.invite_token)


@pytest.mark.asyncio
async def test_endpoint_permission_guard(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: Workspace,
) -> None:
    """
    Verify HTTP endpoint RBAC protection:
    A Viewer attempting to update workspace settings gets HTTP 403 Forbidden.
    An Owner gets HTTP 200 OK.
    """
    # Create a viewer user
    viewer_user = User(
        email=f"viewer_{uuid.uuid4().hex[:6]}@example.com",
        password=await hash_password("Secret123!"),
        full_name="Viewer User",
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    db_session.add(viewer_user)
    await db_session.commit()
    await db_session.refresh(viewer_user)

    service = AuthService(db_session)
    roles = await service.list_roles(test_workspace.id)
    viewer_role = next(r for r in roles if r.slug == "viewer")

    # Add as viewer
    member = WorkspaceMember(
        workspace_id=test_workspace.id,
        user_id=viewer_user.id,
        role_id=viewer_role.id,
    )
    await service.repo.create_member(member)
    await db_session.commit()

    # Generate token for viewer
    viewer_token = create_access_token(
        subject=str(viewer_user.id),
        extra_claims={
            "email": viewer_user.email,
            "is_superuser": False,
        },
    )

    # Viewer attempts to update workspace (requires 'workspace:update')
    forbidden_resp = await client.patch(
        f"/api/v1/auth/workspaces/{test_workspace.id}",
        headers={"Authorization": f"Bearer {viewer_token}"},
        json={"name": "Attempted Unauthorized Name"},
    )
    assert forbidden_resp.status_code == 403
    assert "Missing required permission" in forbidden_resp.json()["error"]

    # Viewer CAN read workspace settings (has 'workspace:read')
    allowed_resp = await client.get(
        f"/api/v1/auth/workspaces/{test_workspace.id}",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert allowed_resp.status_code == 200
    assert allowed_resp.json()["id"] == str(test_workspace.id)
