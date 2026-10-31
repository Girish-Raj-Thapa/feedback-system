/**
 * TypeScript definitions strictly mirroring backend Pydantic schemas in
 * backend/app/features/auth/schemas.py
 */

export interface UserRead {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface UserWorkspaceMembershipRead {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  role_id: string;
  role_name: string;
  role_slug: string;
  effective_permissions: string[];
}

export interface UserMeRead extends UserRead {
  workspaces: UserWorkspaceMembershipRead[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}

export interface PermissionRead {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

export interface RoleRead {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export interface WorkspaceMemberRead {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role_id: string;
  role_name: string;
  role_slug: string;
  overrides: Record<string, boolean>;
  effective_permissions: string[];
  created_at: string;
}

export interface WorkspaceInviteRead {
  id: string;
  workspace_id: string;
  email: string;
  role_id: string;
  status: string;
  invite_token?: string | null;
  expires_at: string;
  created_at: string;
}

export interface InvitePublicInfoRead {
  token: string;
  email: string;
  workspace_name: string;
  role_name: string;
  inviter_name: string | null;
  is_existing_user: boolean;
  expires_at: string;
}

export interface WorkspaceRead {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  business_type: string | null;
  timezone: string;
  plan_tier: string;
  monthly_submission_limit: number;
  current_cycle_submissions_count: number;
  ai_classification_enabled: boolean;
  created_at: string;
}

// Request DTOs
export interface UserRegisterRequest {
  email: string;
  password: string;
  full_name?: string | null;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface InviteJoinRequest {
  token: string;
  password: string;
  full_name?: string | null;
}

export interface AcceptInviteRequest {
  token: string;
}

export interface WorkspaceCreateRequest {
  name: string;
  slug?: string | null;
  industry?: string | null;
  business_type?: string | null;
  timezone?: string;
}

export interface WorkspaceInviteCreateRequest {
  email: string;
  role_id: string;
}

export interface UserUpdateRequest {
  full_name?: string | null;
}

export interface DeleteAccountRequest {
  password: string;
}

export interface WorkspaceUpdateRequest {
  name?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  business_type?: string | null;
  timezone?: string | null;
}

export interface MemberRoleUpdateRequest {
  role_id: string;
}
