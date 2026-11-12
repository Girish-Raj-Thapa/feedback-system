import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/dashboard/layout";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { ThemeProvider } from "@/components/theme-provider";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: vi.fn(),
    getWorkspaces: vi.fn(),
  },
}));

describe("DashboardLayout (retired multi-shell wrapper)", () => {
  const mockReplace = vi.fn();

  const mockUser = {
    id: "u1",
    email: "test@example.com",
    full_name: "John Doe",
    is_active: true,
    is_verified: true,
    is_superuser: false,
    created_at: "2026-01-01T00:00:00Z",
    workspaces: [
      {
        workspace_id: "ws-1",
        workspace_name: "Test Studio",
        workspace_slug: "test-studio",
        role_id: "role-1",
        role_name: "Owner",
        role_slug: "owner",
        effective_permissions: ["*"],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    });

    (authRepository.getMe as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (authRepository.getWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockUser.workspaces
    );
  });

  it("verifies session and renders children without legacy sidebar chrome", async () => {
    render(
      <ThemeProvider>
        <DashboardLayout>
          <div data-testid="dashboard-child">Dashboard Child Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-child")).toBeInTheDocument();
    });

    expect(authRepository.getMe).toHaveBeenCalledTimes(1);
    expect(authRepository.getWorkspaces).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Feedback System")).not.toBeInTheDocument();
  });

  it("redirects to /login if session verification fails", async () => {
    (authRepository.getMe as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unauthorized")
    );

    render(
      <ThemeProvider>
        <DashboardLayout>
          <div data-testid="dashboard-child">Dashboard Child Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
