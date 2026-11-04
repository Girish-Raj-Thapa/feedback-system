import { render, screen, waitFor } from "@testing-library/react";
import RootHomePage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import WorkspaceDashboardSubPage from "@/app/workspace/[workspaceSlug]/dashboard/page";
import { ThemeProvider } from "@/components/theme-provider";
import { authRepository } from "@/repositories/auth.repository";
import { useRouter } from "next/navigation";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: vi.fn(),
  },
}));

describe("RootHomePage and Dashboard Pages", () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      replace: mockReplace,
    });
  });

  describe("RootHomePage Landing Page", () => {
    it("renders landing page with headline and navigation for guests", async () => {
      (authRepository.getMe as any).mockRejectedValue(new Error("Unauthorized"));

      render(
        <ThemeProvider>
          <RootHomePage />
        </ThemeProvider>
      );

      expect(
        screen.getByRole("heading", {
          name: /turn raw customer feedback into high-impact product decisions\./i,
        })
      ).toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: /features/i })[0]).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /live demo/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /start free trial/i })).toBeInTheDocument();

      // For unauthenticated visitors, header shows Sign In and Get Started Free
      await waitFor(() => {
        expect(
          screen.getAllByRole("link", { name: /sign in/i })[0]
        ).toBeInTheDocument();
        expect(
          screen.getAllByRole("link", { name: /get started/i })[0]
        ).toBeInTheDocument();
      });
    });

    it("renders Dashboard link when user is authenticated with workspaces", async () => {
      (authRepository.getMe as any).mockResolvedValue({
        id: "u-1",
        email: "user@example.com",
        workspaces: [{ workspace_id: "ws-1", workspace_slug: "acme" }],
      });

      render(
        <ThemeProvider>
          <RootHomePage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe("DashboardPage and WorkspaceDashboardPage rendering", () => {
    it("renders DashboardPage", () => {
      render(<DashboardPage />);
      expect(screen.getByRole("heading", { name: "Welcome to dashboard" })).toBeInTheDocument();
    });

    it("renders WorkspaceDashboardSubPage", () => {
      render(<WorkspaceDashboardSubPage />);
      expect(screen.getByRole("heading", { name: "Welcome to dashboard" })).toBeInTheDocument();
    });
  });
});

