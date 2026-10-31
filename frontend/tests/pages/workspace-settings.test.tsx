import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceSettingsPage from "@/app/workspace/[workspaceSlug]/settings/page";
import { authRepository } from "@/repositories/auth.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useAuthStore } from "@/store/auth.store";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: jest.fn(),
    getWorkspace: jest.fn(),
    listWorkspaceMembers: jest.fn(),
    listWorkspaceRoles: jest.fn(),
    listWorkspaceInvites: jest.fn(),
    updateWorkspace: jest.fn(),
    deleteWorkspace: jest.fn(),
    createWorkspaceInvite: jest.fn(),
    revokeWorkspaceInvite: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
  },
}));

describe("WorkspaceSettingsPage", () => {
  const wsSlug = "acme-corp";
  const wsId = "ws-123";

  const mockWorkspaces = [
    {
      workspace_id: wsId,
      workspace_name: "Acme Corp",
      workspace_slug: wsSlug,
      role_slug: "owner",
      role_name: "Owner",
      effective_permissions: [],
    },
  ];

  const mockWorkspaceDetails = {
    id: wsId,
    name: "Acme Corp",
    slug: wsSlug,
    industry: "SaaS and software",
    timezone: "Asia/Kathmandu",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockRoles = [
    { id: "role-1", name: "Admin", slug: "admin" },
    { id: "role-2", name: "Member", slug: "member" },
    { id: "role-3", name: "Viewer", slug: "viewer" },
  ];

  const mockMembers = [
    {
      id: "mem-1",
      user_id: "u-owner",
      email: "owner@acme.com",
      full_name: "Owner User",
      role_id: "role-1",
      role_name: "Owner",
      role_slug: "owner",
      joined_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "mem-2",
      user_id: "u-member",
      email: "colleague@acme.com",
      full_name: "Colleague User",
      role_id: "role-2",
      role_name: "Member",
      role_slug: "member",
      joined_at: "2024-01-10T00:00:00Z",
    },
  ];

  const mockInvites = [
    {
      id: "inv-1",
      email: "pending@acme.com",
      role_id: "role-2",
      role_name: "Member",
      role_slug: "member",
      invite_token: "tok-abc",
      status: "pending",
      expires_at: "2026-12-31T00:00:00Z",
      created_at: "2026-10-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ workspaceSlug: wsSlug });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ tab: "general" }));

    useAuthStore.getState().setUser({
      id: "u-owner",
      email: "owner@acme.com",
      full_name: "Owner User",
      is_active: true,
      is_verified: true,
    });
    useWorkspaceStore.getState().setWorkspaces(mockWorkspaces);

    (authRepository.getWorkspaces as jest.Mock).mockResolvedValue(mockWorkspaces);
    (authRepository.getWorkspace as jest.Mock).mockResolvedValue(mockWorkspaceDetails);
    (authRepository.listWorkspaceMembers as jest.Mock).mockResolvedValue(mockMembers);
    (authRepository.listWorkspaceRoles as jest.Mock).mockResolvedValue(mockRoles);
    (authRepository.listWorkspaceInvites as jest.Mock).mockResolvedValue(mockInvites);
  });

  it("renders General settings tab with workspace data", async () => {
    render(<WorkspaceSettingsPage />);

    expect(screen.getByText("Loading workspace settings…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
      expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("acme-corp")).toBeInTheDocument();
    });
  });

  it("updates general settings when workspace name is changed", async () => {
    (authRepository.updateWorkspace as jest.Mock).mockResolvedValue({
      ...mockWorkspaceDetails,
      name: "Acme Global",
    });

    render(<WorkspaceSettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Acme Corp");
    fireEvent.change(nameInput, { target: { value: "Acme Global" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authRepository.updateWorkspace).toHaveBeenCalledWith(wsId, {
        name: "Acme Global",
        industry: "SaaS and software",
        timezone: "Asia/Kathmandu",
      });
      expect(toast.success).toHaveBeenCalledWith("Workspace profile updated successfully");
    });
  });

  it("switches to Members tab and displays member list", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ tab: "members" }));

    render(<WorkspaceSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Owner User")).toBeInTheDocument();
      expect(screen.getByText("Colleague User")).toBeInTheDocument();
    });
  });

  it("switches to Invitations tab and revokes a pending invite on click", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({ tab: "invitations" }));
    (authRepository.revokeWorkspaceInvite as jest.Mock).mockResolvedValue({
      message: "Invitation revoked",
    });

    render(<WorkspaceSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("pending@acme.com")).toBeInTheDocument();
    });

    const revokeBtn = screen.getByTitle("Revoke invite");
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(authRepository.revokeWorkspaceInvite).toHaveBeenCalledWith(wsId, "inv-1");
      expect(toast.success).toHaveBeenCalledWith("Invitation revoked");
    });
  });
});
