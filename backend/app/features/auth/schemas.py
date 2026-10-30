"""
Pydantic schemas for authentication, identity, and RBAC authorization.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ---------------------------------------------------------------------------
# Identity & Account Lifecycle Schemas
# ---------------------------------------------------------------------------


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str | None
    is_active: bool
    is_verified: bool
    is_superuser: bool
    created_at: datetime


class UserWorkspaceMembershipRead(BaseModel):
    workspace_id: UUID
    workspace_name: str
    workspace_slug: str
    role_id: UUID
    role_name: str
    role_slug: str
    effective_permissions: list[str] = Field(default_factory=list)


class UserMeRead(UserRead):
    workspaces: list[UserWorkspaceMembershipRead] = Field(default_factory=list)


class MessageResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# RBAC & Permissions Schemas
# ---------------------------------------------------------------------------


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    category: str
    created_at: datetime


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    name: str
    slug: str
    description: str | None
    is_system: bool
    permissions: list[str] = Field(default_factory=list)
    created_at: datetime


class RoleCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permission_ids: list[str] = Field(default_factory=list)


class RoleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    permission_ids: list[str] | None = None


class WorkspaceMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    user_id: UUID
    email: EmailStr
    full_name: str | None
    role_id: UUID
    role_name: str
    role_slug: str
    overrides: dict[str, bool] = Field(default_factory=dict)
    effective_permissions: list[str] = Field(default_factory=list)
    created_at: datetime


class MemberRoleUpdateRequest(BaseModel):
    role_id: UUID


class MemberOverrideUpdateRequest(BaseModel):
    permission_id: str = Field(min_length=1, max_length=100)
    is_granted: bool


class WorkspaceInviteCreateRequest(BaseModel):
    email: EmailStr
    role_id: UUID


class WorkspaceInviteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    email: EmailStr
    role_id: UUID
    status: str
    invite_token: str | None = None
    expires_at: datetime
    created_at: datetime


class AcceptInviteRequest(BaseModel):
    token: str = Field(min_length=1)


class InvitePublicInfoRead(BaseModel):
    token: str
    email: EmailStr
    workspace_name: str
    role_name: str
    inviter_name: str | None
    is_existing_user: bool
    expires_at: datetime


class InviteJoinRequest(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# ---------------------------------------------------------------------------
# Workspace Schemas
# ---------------------------------------------------------------------------


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=50)
    timezone: str = Field(default="UTC", max_length=50)


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    logo_url: str | None = None
    industry: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=50)
    timezone: str | None = Field(default=None, max_length=50)


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    logo_url: str | None
    industry: str | None
    business_type: str | None
    timezone: str
    plan_tier: str
    monthly_submission_limit: int
    current_cycle_submissions_count: int
    ai_classification_enabled: bool
    created_at: datetime
