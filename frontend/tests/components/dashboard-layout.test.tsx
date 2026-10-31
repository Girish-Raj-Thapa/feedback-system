import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardLayout from "@/app/dashboard/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: vi.fn(),
    getWorkspaces: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("DashboardLayout", () => {
  const mockReplace = vi.fn();

  const mockUser = {
    id: "u-1",
    email: "user@example.com",
    full_name: "John Doe",
    is_active: true,
    is_verified: true,
    is_superuser: false,
    workspaces: [],
    created_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      replace: mockReplace,
    });
    useAuthStore.getState().setUser(mockUser);
    (authRepository.getMe as any).mockResolvedValue(mockUser);
    (authRepository.getWorkspaces as any).mockResolvedValue([]);
  });

  it("renders layout with navigation and children", async () => {
    render(
      <ThemeProvider>
        <DashboardLayout>
          <div data-testid="dashboard-child">Dashboard Child Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-child")).toBeInTheDocument();
      expect(screen.getByText("Feedback System")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("handles logout from account menu", async () => {
    (authRepository.logout as any).mockResolvedValue({ message: "Logged out" });

    render(
      <ThemeProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    const accountBtn = screen.getByRole("button", { name: /john doe/i });
    fireEvent.click(accountBtn);

    expect(screen.getByText("Account settings")).toBeInTheDocument();
    const logoutBtn = screen.getByRole("button", { name: /log out/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(authRepository.logout).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Logged out successfully");
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects to /login if user fetch fails", async () => {
    useAuthStore.getState().clear();
    (authRepository.getMe as any).mockRejectedValue(new Error("Unauthorized"));

    render(
      <ThemeProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});

