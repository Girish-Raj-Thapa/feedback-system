import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceSettingsPage from "@/app/workspace/[workspaceSlug]/settings/page";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useAuthStore } from "@/store/auth.store";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
    listWorkspaceMembers: vi.fn(),
    listWorkspaceRoles: vi.fn(),
    listWorkspaceInvites: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    createWorkspaceInvite: vi.fn(),
    revokeWorkspaceInvite: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
}));

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    listCategories: vi.fn(),
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
      role_id: "role-1",
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
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ workspaceSlug: wsSlug });
    (useSearchParams as any).mockReturnValue(new URLSearchParams({ tab: "general" }));

    useAuthStore.getState().setUser({
      id: "u-owner",
      email: "owner@acme.com",
      full_name: "Owner User",
      is_active: true,
      is_verified: true,
      is_superuser: false,
      workspaces: [],
      created_at: "2024-01-01T00:00:00Z",
    });
    useWorkspaceStore.getState().setWorkspaces(mockWorkspaces);

    (authRepository.getWorkspaces as any).mockResolvedValue(mockWorkspaces);
    (authRepository.getWorkspace as any).mockResolvedValue(mockWorkspaceDetails);
    (authRepository.listWorkspaceMembers as any).mockResolvedValue(mockMembers);
    (authRepository.listWorkspaceRoles as any).mockResolvedValue(mockRoles);
    (authRepository.listWorkspaceInvites as any).mockResolvedValue(mockInvites);
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
    (authRepository.updateWorkspace as any).mockResolvedValue({
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
    (useSearchParams as any).mockReturnValue(new URLSearchParams({ tab: "members" }));

    render(<WorkspaceSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Owner User")).toBeInTheDocument();
      expect(screen.getByText("Colleague User")).toBeInTheDocument();
    });
  });

  it("switches to Invitations tab and revokes a pending invite on click", async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams({ tab: "invitations" }));
    (authRepository.revokeWorkspaceInvite as any).mockResolvedValue({
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

  it("switches to My Profile & Security tab and displays personal profile controls", async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams({ tab: "account" }));

    render(<WorkspaceSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Personal Profile")).toBeInTheDocument();
      expect(screen.getByText("Password & Security")).toBeInTheDocument();
    });
  });

  it("switches to Categories tab and displays feedback categories", async () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams({ tab: "categories" }));
    (feedbackRepository.listCategories as any).mockResolvedValue([
      {
        id: "cat-1",
        workspace_id: wsId,
        name: "Bug Reports",
        slug: "bug-reports",
        description: "Bugs and fixes",
        color: "#EF4444",
        icon: null,
        keywords: ["bug"],
        is_uncategorized: false,
        is_active: true,
        display_order: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "cat-default",
        workspace_id: wsId,
        name: "Other / Uncategorized",
        slug: "other-uncategorized",
        description: "Fallback bucket",
        color: "#64748B",
        icon: null,
        keywords: [],
        is_uncategorized: true,
        is_active: true,
        display_order: 2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]);

    render(<WorkspaceSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Feedback Categories")).toBeInTheDocument();
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
      expect(screen.getAllByText("Other / Uncategorized").length).toBeGreaterThan(0);
    });
  });
});
