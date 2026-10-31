import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";

describe("WorkspaceSidebar", () => {
  const defaultProps = {
    isSidebarOpen: false,
    setIsSidebarOpen: jest.fn(),
    pathname: "/workspace/acme",
    workspaceSlug: "acme",
    activeWs: {
      workspace_id: "ws-1",
      workspace_name: "Acme Corp",
      workspace_slug: "acme",
      role_slug: "owner",
      role_name: "Owner",
      effective_permissions: [],
    },
    workspaceDetails: null,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders workspace name and role badge", () => {
    render(<WorkspaceSidebar {...defaultProps} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders workspace initials monogram badge when no logo is set", () => {
    render(<WorkspaceSidebar {...defaultProps} />);
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  it("renders workspace-scoped Dashboard and Settings links", () => {
    render(<WorkspaceSidebar {...defaultProps} />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const settingsLink = screen.getByText("Settings").closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/workspace/acme");
    expect(settingsLink).toHaveAttribute("href", "/workspace/acme/settings");
  });

  it("does NOT contain 'Workspaces' hub link in the workspace sidebar", () => {
    render(<WorkspaceSidebar {...defaultProps} />);
    expect(screen.queryByText("Workspaces")).not.toBeInTheDocument();
  });

  it("highlights Settings when pathname is /workspace/acme/settings", () => {
    render(
      <WorkspaceSidebar
        {...defaultProps}
        pathname="/workspace/acme/settings"
      />
    );
    const settingsLink = screen.getByText("Settings").closest("a");
    expect(settingsLink?.className).toContain("font-semibold");
    expect(settingsLink?.className).toContain("text-[#363BA6]");
  });

  it("calls setIsSidebarOpen(false) when a link is clicked", () => {
    const setIsSidebarOpen = jest.fn();
    render(<WorkspaceSidebar {...defaultProps} setIsSidebarOpen={setIsSidebarOpen} />);
    
    fireEvent.click(screen.getByText("Dashboard"));
    expect(setIsSidebarOpen).toHaveBeenCalledWith(false);
  });
});

