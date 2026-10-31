import { apiClient } from "@/repositories/client";
import type {
  AcceptInviteRequest,
  ChangePasswordRequest,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  InviteJoinRequest,
  InvitePublicInfoRead,
  MemberRoleUpdateRequest,
  MessageResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  RoleRead,
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
} from "@/types/auth";

export const authRepository = {
  // Identity & Auth Lifecycle
  login(payload: UserLoginRequest): Promise<TokenResponse> {
    return apiClient<TokenResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  register(payload: UserRegisterRequest): Promise<UserRead> {
    return apiClient<UserRead>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  logout(): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/logout", {
      method: "POST",
    });
  },

  getMe(): Promise<UserMeRead> {
    return apiClient<UserMeRead>("/auth/me", {
      method: "GET",
    });
  },

  updateMe(payload: UserUpdateRequest): Promise<UserRead> {
    return apiClient<UserRead>("/auth/me", {
      method: "PATCH",
      body: payload,
    });
  },

  deleteMe(payload: DeleteAccountRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/me", {
      method: "DELETE",
      body: payload,
    });
  },

  verifyEmail(payload: VerifyEmailRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/verify-email", {
      method: "POST",
      body: payload,
    });
  },

  resendVerification(payload: ResendVerificationRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/resend-verification", {
      method: "POST",
      body: payload,
    });
  },

  forgotPassword(payload: ForgotPasswordRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    });
  },

  resetPassword(payload: ResetPasswordRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/reset-password", {
      method: "POST",
      body: payload,
    });
  },

  changePassword(payload: ChangePasswordRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/change-password", {
      method: "POST",
      body: payload,
    });
  },

  // Workspaces
  getWorkspaces(): Promise<UserWorkspaceMembershipRead[]> {
    return apiClient<UserWorkspaceMembershipRead[]>("/auth/workspaces", {
      method: "GET",
    });
  },

  getWorkspace(workspaceId: string): Promise<WorkspaceRead> {
    return apiClient<WorkspaceRead>(`/auth/workspaces/${workspaceId}`, {
      method: "GET",
      workspaceId,
    });
  },

  createWorkspace(payload: WorkspaceCreateRequest): Promise<WorkspaceRead> {
    return apiClient<WorkspaceRead>("/auth/workspaces", {
      method: "POST",
      body: payload,
    });
  },

  updateWorkspace(
    workspaceId: string,
    payload: WorkspaceUpdateRequest
  ): Promise<WorkspaceRead> {
    return apiClient<WorkspaceRead>(`/auth/workspaces/${workspaceId}`, {
      method: "PATCH",
      workspaceId,
      body: payload,
    });
  },

  deleteWorkspace(workspaceId: string): Promise<void> {
    return apiClient<void>(`/auth/workspaces/${workspaceId}`, {
      method: "DELETE",
      workspaceId,
    });
  },

  listWorkspaceRoles(workspaceId: string): Promise<RoleRead[]> {
    return apiClient<RoleRead[]>(`/auth/workspaces/${workspaceId}/roles`, {
      method: "GET",
      workspaceId,
    });
  },

  listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRead[]> {
    return apiClient<WorkspaceMemberRead[]>(
      `/auth/workspaces/${workspaceId}/members`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  updateMemberRole(
    workspaceId: string,
    userId: string,
    payload: MemberRoleUpdateRequest
  ): Promise<WorkspaceMemberRead> {
    return apiClient<WorkspaceMemberRead>(
      `/auth/workspaces/${workspaceId}/members/${userId}/role`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  },

  removeMember(workspaceId: string, userId: string): Promise<void> {
    return apiClient<void>(`/auth/workspaces/${workspaceId}/members/${userId}`, {
      method: "DELETE",
      workspaceId,
    });
  },

  // Workspace Invitations
  getInviteByToken(token: string): Promise<InvitePublicInfoRead> {
    return apiClient<InvitePublicInfoRead>(`/auth/invites/${token}`, {
      method: "GET",
    });
  },

  joinInvite(payload: InviteJoinRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/invites/join", {
      method: "POST",
      body: payload,
    });
  },

  acceptInvite(payload: AcceptInviteRequest): Promise<MessageResponse> {
    return apiClient<MessageResponse>("/auth/invites/accept", {
      method: "POST",
      body: payload,
    });
  },

  listWorkspaceInvites(workspaceId: string): Promise<WorkspaceInviteRead[]> {
    return apiClient<WorkspaceInviteRead[]>(
      `/auth/workspaces/${workspaceId}/invites`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  createWorkspaceInvite(
    workspaceId: string,
    payload: WorkspaceInviteCreateRequest
  ): Promise<WorkspaceInviteRead> {
    return apiClient<WorkspaceInviteRead>(
      `/auth/workspaces/${workspaceId}/invites`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  revokeWorkspaceInvite(
    workspaceId: string,
    inviteId: string
  ): Promise<MessageResponse> {
    return apiClient<MessageResponse>(
      `/auth/workspaces/${workspaceId}/invites/${inviteId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  },
};

