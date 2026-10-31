import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardLayout from "@/app/dashboard/layout";
import { ThemeProvider } from "@/components/theme-provider";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getMe: jest.fn(),
    getWorkspaces: jest.fn(),
    logout: jest.fn(),
  },
}));

describe("DashboardLayout", () => {
  const mockReplace = jest.fn();

  const mockUser = {
    id: "u-1",
    email: "user@example.com",
    full_name: "John Doe",
    is_active: true,
    is_verified: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
    useAuthStore.getState().setUser(mockUser);
    (authRepository.getMe as jest.Mock).mockResolvedValue(mockUser);
    (authRepository.getWorkspaces as jest.Mock).mockResolvedValue([]);
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
    (authRepository.logout as jest.Mock).mockResolvedValue({ message: "Logged out" });

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
    (authRepository.getMe as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

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

