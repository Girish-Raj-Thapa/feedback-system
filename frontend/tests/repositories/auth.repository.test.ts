import { authRepository } from "@/repositories/auth.repository";
import { apiClient } from "@/repositories/client";

jest.mock("@/repositories/client", () => ({
  apiClient: jest.fn(),
}));

describe("authRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication & User Lifecycle", () => {
    it("calls login endpoint with credentials", async () => {
      const mockResponse = { access_token: "jwt-token", token_type: "bearer" };
      (apiClient as jest.Mock).mockResolvedValue(mockResponse);

      const res = await authRepository.login({ email: "user@example.com", password: "Password123!" });
      expect(res).toEqual(mockResponse);
      expect(apiClient).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        body: { email: "user@example.com", password: "Password123!" },
      });
    });

    it("calls register endpoint with user payload", async () => {
      const payload = {
        email: "new@example.com",
        password: "Password123!",
        full_name: "New User",
      };
      const mockUser = { id: "u-1", email: payload.email, full_name: payload.full_name };
      (apiClient as jest.Mock).mockResolvedValue(mockUser);

      const res = await authRepository.register(payload);
      expect(res).toEqual(mockUser);
      expect(apiClient).toHaveBeenCalledWith("/auth/register", {
        method: "POST",
        body: payload,
      });
    });

    it("calls logout endpoint", async () => {
      (apiClient as jest.Mock).mockResolvedValue({ message: "Logged out" });
      const res = await authRepository.logout();
      expect(res).toEqual({ message: "Logged out" });
      expect(apiClient).toHaveBeenCalledWith("/auth/logout", {
        method: "POST",
      });
    });

    it("calls getMe endpoint", async () => {
      const mockMe = {
        id: "u-1",
        email: "user@example.com",
        full_name: "Test User",
        is_active: true,
        is_verified: true,
        workspaces: [],
      };
      (apiClient as jest.Mock).mockResolvedValue(mockMe);

      const res = await authRepository.getMe();
      expect(res).toEqual(mockMe);
      expect(apiClient).toHaveBeenCalledWith("/auth/me", { method: "GET" });
    });

    it("calls updateMe endpoint with PATCH", async () => {
      const payload = { full_name: "Updated Name" };
      (apiClient as jest.Mock).mockResolvedValue({ id: "u-1", full_name: "Updated Name" });

      const res = await authRepository.updateMe(payload);
      expect(res).toEqual({ id: "u-1", full_name: "Updated Name" });
      expect(apiClient).toHaveBeenCalledWith("/auth/me", {
        method: "PATCH",
        body: payload,
      });
    });

    it("calls deleteMe endpoint with DELETE and password", async () => {
      const payload = { password: "Password123!" };
      (apiClient as jest.Mock).mockResolvedValue({ message: "Account deleted" });

      const res = await authRepository.deleteMe(payload);
      expect(res).toEqual({ message: "Account deleted" });
      expect(apiClient).toHaveBeenCalledWith("/auth/me", {
        method: "DELETE",
        body: payload,
      });
    });

    it("calls changePassword endpoint", async () => {
      const payload = {
        current_password: "OldPassword1!",
        new_password: "NewPassword1!",
      };
      (apiClient as jest.Mock).mockResolvedValue({ message: "Password changed successfully" });

      const res = await authRepository.changePassword(payload);
      expect(res).toEqual({ message: "Password changed successfully" });
      expect(apiClient).toHaveBeenCalledWith("/auth/change-password", {
        method: "POST",
        body: payload,
      });
    });

    it("calls forgotPassword and resetPassword endpoints", async () => {
      (apiClient as jest.Mock).mockResolvedValue({ message: "Email sent" });
      await authRepository.forgotPassword({ email: "test@example.com" });
      expect(apiClient).toHaveBeenCalledWith("/auth/forgot-password", {
        method: "POST",
        body: { email: "test@example.com" },
      });

      (apiClient as jest.Mock).mockResolvedValue({ message: "Password reset" });
      await authRepository.resetPassword({ token: "tok123", new_password: "NewPassword1!" });
      expect(apiClient).toHaveBeenCalledWith("/auth/reset-password", {
        method: "POST",
        body: { token: "tok123", new_password: "NewPassword1!" },
      });
    });
  });

  describe("Workspace Operations", () => {
    const wsId = "ws-123";

    it("calls getWorkspaces", async () => {
      const mockWs = [{ workspace_id: wsId, workspace_name: "Workspace 1" }];
      (apiClient as jest.Mock).mockResolvedValue(mockWs);

      const res = await authRepository.getWorkspaces();
      expect(res).toEqual(mockWs);
      expect(apiClient).toHaveBeenCalledWith("/auth/workspaces", { method: "GET" });
    });

    it("calls getWorkspace with workspaceId header", async () => {
      (apiClient as jest.Mock).mockResolvedValue({ id: wsId, name: "Workspace 1" });

      const res = await authRepository.getWorkspace(wsId);
      expect(res).toEqual({ id: wsId, name: "Workspace 1" });
      expect(apiClient).toHaveBeenCalledWith(`/auth/workspaces/${wsId}`, {
        method: "GET",
        workspaceId: wsId,
      });
    });

    it("calls createWorkspace with POST", async () => {
      const payload = { name: "New Ws", slug: "new-ws", industry: "SaaS" };
      (apiClient as jest.Mock).mockResolvedValue({ id: wsId, ...payload });

      const res = await authRepository.createWorkspace(payload);
      expect(res).toEqual({ id: wsId, ...payload });
      expect(apiClient).toHaveBeenCalledWith("/auth/workspaces", {
        method: "POST",
        body: payload,
      });
    });

    it("calls updateWorkspace with PATCH and workspaceId", async () => {
      const payload = { name: "Updated Ws" };
      (apiClient as jest.Mock).mockResolvedValue({ id: wsId, name: "Updated Ws" });

      const res = await authRepository.updateWorkspace(wsId, payload);
      expect(res).toEqual({ id: wsId, name: "Updated Ws" });
      expect(apiClient).toHaveBeenCalledWith(`/auth/workspaces/${wsId}`, {
        method: "PATCH",
        workspaceId: wsId,
        body: payload,
      });
    });

    it("calls deleteWorkspace with DELETE and workspaceId", async () => {
      (apiClient as jest.Mock).mockResolvedValue(undefined);

      await authRepository.deleteWorkspace(wsId);
      expect(apiClient).toHaveBeenCalledWith(`/auth/workspaces/${wsId}`, {
        method: "DELETE",
        workspaceId: wsId,
      });
    });

    it("calls listWorkspaceMembers", async () => {
      (apiClient as jest.Mock).mockResolvedValue([]);
      await authRepository.listWorkspaceMembers(wsId);
      expect(apiClient).toHaveBeenCalledWith(`/auth/workspaces/${wsId}/members`, {
        method: "GET",
        workspaceId: wsId,
      });
    });
  });
});

