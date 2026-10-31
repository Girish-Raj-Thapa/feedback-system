import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceLayout from "@/app/workspace/[workspaceSlug]/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: jest.fn(),
    getWorkspaces: jest.fn(),
    getWorkspace: jest.fn(),
    logout: jest.fn(),
  },
}));

describe("WorkspaceLayout", () => {
  const wsSlug = "test-ws";
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  const mockUser = {
    id: "u-1",
    email: "user@example.com",
    full_name: "Alice Smith",
    is_active: true,
    is_verified: true,
  };

  const mockWorkspaces = [
    {
      workspace_id: "ws-1",
      workspace_name: "Test Workspace",
      workspace_slug: wsSlug,
      role_slug: "owner",
      role_name: "Owner",
      effective_permissions: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ workspaceSlug: wsSlug });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    useAuthStore.getState().setUser(mockUser);
    useWorkspaceStore.getState().setWorkspaces(mockWorkspaces);

    (authRepository.getMe as jest.Mock).mockResolvedValue(mockUser);
    (authRepository.getWorkspaces as jest.Mock).mockResolvedValue(mockWorkspaces);
    (authRepository.getWorkspace as jest.Mock).mockResolvedValue({
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
    (authRepository.logout as jest.Mock).mockResolvedValue({ message: "Logged out" });

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
