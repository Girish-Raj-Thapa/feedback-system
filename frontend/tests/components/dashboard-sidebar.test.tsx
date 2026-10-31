import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

describe("DashboardSidebar", () => {
  const defaultProps = {
    isSidebarOpen: false,
    setIsSidebarOpen: vi.fn(),
    pathname: "/dashboard/workspaces",
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders Feedback System brand header", () => {
    render(<DashboardSidebar {...defaultProps} />);
    expect(screen.getByText("Feedback System")).toBeInTheDocument();
  });

  it("renders all platform navigation links", () => {
    render(<DashboardSidebar {...defaultProps} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Workspaces")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights Workspaces link when on /dashboard/workspaces", () => {
    render(<DashboardSidebar {...defaultProps} pathname="/dashboard/workspaces" />);
    const workspacesLink = screen.getByText("Workspaces").closest("a");
    expect(workspacesLink).toHaveAttribute("href", "/dashboard/workspaces");
    expect(workspacesLink?.className).toContain("font-semibold");
    expect(workspacesLink?.className).toContain("text-[#363BA6]");
  });

  it("highlights Settings link when on /dashboard/account", () => {
    render(<DashboardSidebar {...defaultProps} pathname="/dashboard/account" />);
    const settingsLink = screen.getByText("Settings").closest("a");
    expect(settingsLink).toHaveAttribute("href", "/dashboard/account");
    expect(settingsLink?.className).toContain("font-semibold");
  });

  it("calls setIsSidebarOpen(false) when a navigation link is clicked", () => {
    const setIsSidebarOpen = vi.fn();
    render(<DashboardSidebar {...defaultProps} setIsSidebarOpen={setIsSidebarOpen} />);
    
    fireEvent.click(screen.getByText("Workspaces"));
    expect(setIsSidebarOpen).toHaveBeenCalledWith(false);
  });
});

