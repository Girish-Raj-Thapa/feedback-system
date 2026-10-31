import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceLayout from "@/app/workspace/[workspaceSlug]/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: vi.fn(),
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("WorkspaceLayout", () => {
  const wsSlug = "test-ws";
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  const mockUser = {
    id: "u-1",
    email: "user@example.com",
    full_name: "Alice Smith",
    is_active: true,
    is_verified: true,
    is_superuser: false,
    workspaces: [],
    created_at: "2024-01-01T00:00:00Z",
  };

  const mockWorkspaces = [
    {
      workspace_id: "ws-1",
      workspace_name: "Test Workspace",
      workspace_slug: wsSlug,
      role_id: "role-owner",
      role_slug: "owner",
      role_name: "Owner",
      effective_permissions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ workspaceSlug: wsSlug });
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    useAuthStore.getState().setUser(mockUser);
    useWorkspaceStore.getState().setWorkspaces(mockWorkspaces);

    (authRepository.getMe as any).mockResolvedValue(mockUser);
    (authRepository.getWorkspaces as any).mockResolvedValue(mockWorkspaces);
    (authRepository.getWorkspace as any).mockResolvedValue({
      id: "ws-1",
      name: "Test Workspace",
      slug: wsSlug,
    });
  });

  it("renders workspace layout with breadcrumbs and children", async () => {
    render(
      <ThemeProvider>
        <WorkspaceLayout>
          <div data-testid="child-content">Workspace Content</div>
        </WorkspaceLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getAllByText("Test Workspace").length).toBeGreaterThan(0);
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
  });

  it("opens account dropdown and logs out when clicked", async () => {
    (authRepository.logout as any).mockResolvedValue({ message: "Logged out" });

    render(
      <ThemeProvider>
        <WorkspaceLayout>
          <div>Content</div>
        </WorkspaceLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    // Click account button to open dropdown
    const accountBtn = screen.getByRole("button", { name: /alice smith/i });
    fireEvent.click(accountBtn);

    // Dropdown contains account settings and log out
    expect(screen.getByText("Account settings")).toBeInTheDocument();
    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(authRepository.logout).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Logged out successfully");
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
