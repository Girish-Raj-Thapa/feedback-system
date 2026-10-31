import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardWorkspacesPage from "@/app/dashboard/workspaces/page";
import { authRepository } from "@/repositories/auth.repository";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
    listWorkspaceMembers: vi.fn(),
  },
}));

describe("DashboardWorkspacesPage", () => {
  const mockWorkspaces = [
    {
      workspace_id: "ws-1",
      workspace_name: "Acme SaaS",
      workspace_slug: "acme-saas",
      role_slug: "owner",
      role_name: "Owner",
      effective_permissions: [],
    },
    {
      workspace_id: "ws-2",
      workspace_name: "Beta Commerce",
      workspace_slug: "beta-commerce",
      role_slug: "member",
      role_name: "Member",
      effective_permissions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (authRepository.getWorkspaces as any).mockResolvedValue(mockWorkspaces);
    (authRepository.getWorkspace as any).mockImplementation((id: string) => {
      if (id === "ws-1") {
        return Promise.resolve({ id: "ws-1", name: "Acme SaaS", industry: "SaaS and software" });
      }
      return Promise.resolve({ id: "ws-2", name: "Beta Commerce", industry: "E-Commerce" });
    });
    (authRepository.listWorkspaceMembers as any).mockImplementation((id: string) => {
      if (id === "ws-1") {
        return Promise.resolve([{ user_id: "u-1" }, { user_id: "u-2" }]);
      }
      return Promise.resolve([{ user_id: "u-3" }]);
    });
  });

  it("renders loading state initially and then shows workspaces", async () => {
    render(<DashboardWorkspacesPage />);

    expect(screen.getByText("Loading workspaces…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("2 workspaces. You own 1 of them.")).toBeInTheDocument();
      expect(screen.getAllByText("Acme SaaS").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Beta Commerce").length).toBeGreaterThan(0);
    });
  });

  it("filters workspaces by search query", async () => {
    render(<DashboardWorkspacesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Acme SaaS").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText("Search workspaces");
    fireEvent.change(searchInput, { target: { value: "Beta" } });

    expect(screen.getAllByText("Beta Commerce").length).toBeGreaterThan(0);
    expect(screen.queryByText("Acme SaaS")).not.toBeInTheDocument();
  });

  it("shows empty state when search matches no workspaces and allows clearing search", async () => {
    render(<DashboardWorkspacesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Acme SaaS").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText("Search workspaces");
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    expect(screen.getByText("No workspaces match")).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    fireEvent.click(clearButton);

    expect(screen.getAllByText("Acme SaaS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta Commerce").length).toBeGreaterThan(0);
  });

  it("filters workspaces by role (owned vs shared)", async () => {
    render(<DashboardWorkspacesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Acme SaaS").length).toBeGreaterThan(0);
    });

    // Open filter dropdown
    const filterBtn = screen.getByRole("button", { name: /all workspaces/i });
    fireEvent.click(filterBtn);

    // Select "Owned by me"
    const ownedOption = screen.getByText("Owned by me");
    fireEvent.click(ownedOption);

    // Only Acme SaaS should be visible
    expect(screen.getAllByText("Acme SaaS").length).toBeGreaterThan(0);
    expect(screen.queryByText("Beta Commerce")).not.toBeInTheDocument();
  });
});

