import { render, screen, waitFor } from "@testing-library/react";
import RootHomePage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import WorkspaceDashboardPage from "@/app/workspace/[workspaceSlug]/page";
import { authRepository } from "@/repositories/auth.repository";
import { useRouter } from "next/navigation";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: jest.fn(),
  },
}));

describe("RootHomePage and Dashboard Pages", () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
  });

  describe("RootHomePage redirection logic", () => {
    it("redirects to /login if unauthenticated", async () => {
      (authRepository.getMe as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

      render(<RootHomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/login");
      });
    });

    it("redirects to /create-workspace if authenticated but has no workspaces", async () => {
      (authRepository.getMe as jest.Mock).mockResolvedValue({
        id: "u-1",
        email: "user@example.com",
        workspaces: [],
      });

      render(<RootHomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/create-workspace");
      });
    });

    it("redirects to /dashboard if authenticated and has workspaces", async () => {
      (authRepository.getMe as jest.Mock).mockResolvedValue({
        id: "u-1",
        email: "user@example.com",
        workspaces: [{ workspace_id: "ws-1", workspace_slug: "acme" }],
      });

      render(<RootHomePage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("DashboardPage and WorkspaceDashboardPage rendering", () => {
    it("renders DashboardPage", () => {
      render(<DashboardPage />);
      expect(screen.getByRole("heading", { name: "Welcome to dashboard" })).toBeInTheDocument();
    });

    it("renders WorkspaceDashboardPage", () => {
      render(<WorkspaceDashboardPage />);
      expect(screen.getByRole("heading", { name: "Welcome to dashboard" })).toBeInTheDocument();
    });
  });
});

