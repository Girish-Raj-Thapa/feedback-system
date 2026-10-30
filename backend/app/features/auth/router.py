"""
Authentication, Identity lifecycle, and Workspace RBAC endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.core.config import settings
from app.features.auth.dependencies import (
    AuthServiceDep,
    CurrentTokenPayload,
    CurrentUser,
    require_permission,
)
from app.features.auth.models import User
from app.features.auth.schemas import (
    AcceptInviteRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    InviteJoinRequest,
    InvitePublicInfoRead,
    LogoutRequest,
    MemberOverrideUpdateRequest,
    MemberRoleUpdateRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    RoleCreateRequest,
    RoleRead,
    RoleUpdateRequest,
    TokenResponse,
    UserLoginRequest,
    UserMeRead,
    UserRead,
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

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Account Registration & Session Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserRegisterRequest,
    service: AuthServiceDep,
) -> UserRead:
    """
    Register a new user account.
    Dispatches an email verification task.
    """
    user: User = await service.register(payload)
    return UserRead.model_validate(user)


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
)
async def login(
    payload: UserLoginRequest,
    service: AuthServiceDep,
    response: Response,
) -> TokenResponse:
    """
    Authenticate user credentials.
    Returns access and refresh tokens, and sets secure HTTP-only session cookies.
    """
    tokens = await service.login(payload)

    # Set secure HTTP-only cookies for Next.js Server Components / Middleware
    cookie_max_age = settings.ACCESS_TOKEN_TTL_MINUTES * 60
    response.set_cookie(
        key="ff_session",
        value=tokens.access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=cookie_max_age,
        path="/",
    )
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=cookie_max_age,
        path="/",
    )

    return tokens


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    service: AuthServiceDep,
    response: Response,
) -> TokenResponse:
    """
    Rotate and refresh an access token using a valid refresh token.
    Updates the HTTP-only session cookies.
    """
    tokens = await service.refresh(payload)

    cookie_max_age = settings.ACCESS_TOKEN_TTL_MINUTES * 60
    response.set_cookie(
        key="ff_session",
        value=tokens.access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=cookie_max_age,
        path="/",
    )
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=cookie_max_age,
        path="/",
    )

    return tokens


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
async def logout(
    token_payload: CurrentTokenPayload,
    service: AuthServiceDep,
    response: Response,
    payload: LogoutRequest | None = None,
) -> MessageResponse:
    """
    Revoke current access token and optional refresh token.
    Clears HTTP-only session cookies.
    """
    refresh_token = payload.refresh_token if payload else None
    await service.logout(token_payload=token_payload, refresh_token=refresh_token)

    response.delete_cookie(key="ff_session", path="/")
    response.delete_cookie(key="access_token", path="/")

    return MessageResponse(message="Successfully logged out")


# ---------------------------------------------------------------------------
# Authenticated User Profile Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
)
async def get_me(
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> UserMeRead:
    """
    Retrieve authenticated user profile along with workspace memberships and effective permissions.
    """
    return await service.get_user_me(current_user)


@router.patch(
    "/me",
    status_code=status.HTTP_200_OK,
)
async def update_me(
    payload: UserUpdateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> UserRead:
    """
    Update authenticated user profile information.
    """
    updated_user = await service.update_profile(current_user, payload)
    return UserRead.model_validate(updated_user)


@router.delete(
    "/me",
    status_code=status.HTTP_200_OK,
)
async def delete_me(
    payload: DeleteAccountRequest,
    current_user: CurrentUser,
    token_payload: CurrentTokenPayload,
    service: AuthServiceDep,
    response: Response,
) -> MessageResponse:
    """
    Deactivate and soft-delete user account after password confirmation.
    Clears HTTP-only cookies and revokes active session.
    """
    await service.delete_account(
        user=current_user,
        payload=payload,
        token_payload=token_payload,
    )
    response.delete_cookie(key="ff_session", path="/")
    response.delete_cookie(key="access_token", path="/")
    return MessageResponse(message="Account has been successfully deleted")


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> MessageResponse:
    """
    Change password for the authenticated user.
    """
    await service.change_password(user=current_user, payload=payload)
    return MessageResponse(message="Password changed successfully")


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    service: AuthServiceDep,
) -> MessageResponse:
    """
    Request a password reset link.
    Always returns success to avoid user enumeration.
    """
    await service.request_password_reset(payload)
    return MessageResponse(
        message="If this email is registered, a password reset link has been sent."
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
)
async def reset_password(
    payload: ResetPasswordRequest,
    service: AuthServiceDep,
) -> MessageResponse:
    """
    Reset user password using a valid reset token.
    """
    await service.reset_password(payload)
    return MessageResponse(message="Password has been reset successfully")


@router.post(
    "/verify-email",
    status_code=status.HTTP_200_OK,
)
async def verify_email(
    payload: VerifyEmailRequest,
    service: AuthServiceDep,
) -> MessageResponse:
    """
    Verify email address using a valid verification token.
    """
    await service.verify_email(payload)
    return MessageResponse(message="Email verified successfully")


@router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
)
async def resend_verification(
    payload: ResendVerificationRequest,
    service: AuthServiceDep,
) -> MessageResponse:
    """
    Resend email verification token for an unverified account.
    """
    await service.resend_verification_email(payload)
    return MessageResponse(
        message="If this email is unverified, a verification link has been sent."
    )


# ---------------------------------------------------------------------------
# Workspace Lifecycle Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/workspaces",
    status_code=status.HTTP_200_OK,
)
async def list_user_workspaces(
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> list[UserWorkspaceMembershipRead]:
    """
    List all active workspaces that the current user belongs to,
    including their assigned role and effective permissions for each.
    """
    user_me = await service.get_user_me(current_user)
    return user_me.workspaces


@router.post(
    "/workspaces",
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace(
    payload: WorkspaceCreateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> WorkspaceRead:
    """
    Create a new workspace.
    Automatically initializes default roles (Owner, Admin, Editor, Viewer)
    and assigns the creator as WorkspaceMember with the Owner role.
    """
    return await service.create_workspace(payload=payload, owner=current_user)


@router.get(
    "/workspaces/{workspace_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("workspace:read"))],
)
async def get_workspace(
    workspace_id: UUID,
    service: AuthServiceDep,
) -> WorkspaceRead:
    """
    Retrieve workspace settings and metadata.
    """
    return await service.get_workspace(workspace_id)


@router.patch(
    "/workspaces/{workspace_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("workspace:update"))],
)
async def update_workspace(
    workspace_id: UUID,
    payload: WorkspaceUpdateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> WorkspaceRead:
    """
    Update workspace name, logo, industry, or timezone settings.
    """
    return await service.update_workspace(
        workspace_id=workspace_id,
        payload=payload,
        actor_id=current_user.id,
    )


@router.delete(
    "/workspaces/{workspace_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("workspace:delete"))],
)
async def delete_workspace(
    workspace_id: UUID,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> None:
    """
    Archive and soft-delete a workspace.
    """
    await service.delete_workspace(
        workspace_id=workspace_id,
        actor_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# Workspace Roles & RBAC Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/workspaces/{workspace_id}/roles",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("members:read"))],
)
async def list_workspace_roles(
    workspace_id: UUID,
    service: AuthServiceDep,
) -> list[RoleRead]:
    """
    List all standard and custom roles configured in the workspace.
    """
    return await service.list_roles(workspace_id)


@router.post(
    "/workspaces/{workspace_id}/roles",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("roles:manage"))],
)
async def create_workspace_role(
    workspace_id: UUID,
    payload: RoleCreateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> RoleRead:
    """
    Create a new custom role with specific permissions in the workspace.
    """
    return await service.create_custom_role(
        workspace_id=workspace_id,
        payload=payload,
        actor_id=current_user.id,
    )


@router.patch(
    "/workspaces/{workspace_id}/roles/{role_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("roles:manage"))],
)
async def update_workspace_role(
    workspace_id: UUID,
    role_id: UUID,
    payload: RoleUpdateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> RoleRead:
    """
    Update role permissions or description in the workspace.
    """
    return await service.update_role(
        workspace_id=workspace_id,
        role_id=role_id,
        payload=payload,
        actor_id=current_user.id,
    )


@router.delete(
    "/workspaces/{workspace_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("roles:manage"))],
)
async def delete_workspace_role(
    workspace_id: UUID,
    role_id: UUID,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> None:
    """
    Delete a custom role if no members are assigned to it. System roles cannot be deleted.
    """
    await service.delete_role(
        workspace_id=workspace_id,
        role_id=role_id,
        actor_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# Workspace Members & Permission Overrides Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/workspaces/{workspace_id}/members",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("members:read"))],
)
async def list_workspace_members(
    workspace_id: UUID,
    service: AuthServiceDep,
) -> list[WorkspaceMemberRead]:
    """
    List all team members in the workspace with their assigned role and effective permissions.
    """
    return await service.list_members(workspace_id)


@router.patch(
    "/workspaces/{workspace_id}/members/{user_id}/role",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("members:update_role"))],
)
async def update_member_role(
    workspace_id: UUID,
    user_id: UUID,
    payload: MemberRoleUpdateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> WorkspaceMemberRead:
    """
    Reassign a team member's role in the workspace.
    """
    return await service.update_member_role(
        workspace_id=workspace_id,
        target_user_id=user_id,
        payload=payload,
        actor_id=current_user.id,
    )


@router.put(
    "/workspaces/{workspace_id}/members/{user_id}/overrides",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("members:update_role"))],
)
async def set_member_permission_override(
    workspace_id: UUID,
    user_id: UUID,
    payload: MemberOverrideUpdateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> WorkspaceMemberRead:
    """
    Explicitly grant (+) or revoke (-) a single permission for an individual team member.
    """
    return await service.set_member_override(
        workspace_id=workspace_id,
        target_user_id=user_id,
        payload=payload,
        actor_id=current_user.id,
    )


@router.delete(
    "/workspaces/{workspace_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("members:remove"))],
)
async def remove_workspace_member(
    workspace_id: UUID,
    user_id: UUID,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> None:
    """
    Remove a team member from the workspace.
    """
    await service.remove_member(
        workspace_id=workspace_id,
        target_user_id=user_id,
        actor_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# Workspace Invites Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/workspaces/{workspace_id}/invites",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("members:invite"))],
)
async def invite_workspace_member(
    workspace_id: UUID,
    payload: WorkspaceInviteCreateRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> WorkspaceInviteRead:
    """
    Invite a new team member to the workspace via email with an assigned role.
    """
    return await service.invite_member(
        workspace_id=workspace_id,
        payload=payload,
        inviter_id=current_user.id,
    )


@router.get(
    "/workspaces/{workspace_id}/invites",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("members:read"))],
)
async def list_workspace_invites(
    workspace_id: UUID,
    service: AuthServiceDep,
) -> list[WorkspaceInviteRead]:
    """
    List all pending invitations for a workspace.
    """
    return await service.list_invites(workspace_id)


@router.delete(
    "/workspaces/{workspace_id}/invites/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("members:invite"))],
)
async def revoke_workspace_invite(
    workspace_id: UUID,
    invite_id: UUID,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> None:
    """
    Revoke a pending workspace invitation.
    """
    await service.revoke_invite(
        workspace_id=workspace_id,
        invite_id=invite_id,
        actor_id=current_user.id,
    )


@router.get(
    "/invites/{token}",
    status_code=status.HTTP_200_OK,
)
async def get_invite_details(
    token: str,
    service: AuthServiceDep,
) -> InvitePublicInfoRead:
    """
    Validate an invitation token and return workspace/inviter metadata for the acceptance page.
    Publicly accessible before authentication.
    """
    return await service.get_invite_details(token)


@router.post(
    "/invites/join",
    status_code=status.HTTP_200_OK,
)
async def join_workspace_via_invite(
    payload: InviteJoinRequest,
    service: AuthServiceDep,
    response: Response,
) -> TokenResponse:
    """
    Complete registration and workspace joining from an email invite.
    Automatically sets verified status, establishes session, and returns JWT tokens.
    """
    tokens, _ = await service.join_via_invite(payload)

    cookie_max_age = settings.ACCESS_TOKEN_TTL_MINUTES * 60
    response.set_cookie(
        key="ff_session",
        value=tokens.access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=cookie_max_age,
        path="/",
    )
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=cookie_max_age,
        path="/",
    )
    return tokens


@router.post(
    "/invites/accept",
    status_code=status.HTTP_200_OK,
)
async def accept_workspace_invite(
    payload: AcceptInviteRequest,
    current_user: CurrentUser,
    service: AuthServiceDep,
) -> WorkspaceMemberRead:
    """
    Accept an invitation token for an already authenticated user and join the workspace.
    """
    return await service.accept_invite(
        payload=payload,
        current_user=current_user,
    )
