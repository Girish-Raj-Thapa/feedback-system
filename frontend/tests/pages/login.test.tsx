import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    login: vi.fn(),
  },
}));

vi.mock("@/components/auth/login-showcase", () => ({
  LoginShowcase: () => <div data-testid="login-showcase">Showcase</div>,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form and showcase", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByTestId("login-showcase")).toBeInTheDocument();
  });

  it("toggles password visibility when eye icon is clicked", () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByLabelText("Show password");
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hide password")).toBeInTheDocument();
  });

  it("submits valid credentials and calls login repository", async () => {
    (authRepository.login as any).mockResolvedValue({
      access_token: "token-123",
      token_type: "bearer",
    });

    const fetchMeSpy = vi.spyOn(useAuthStore.getState(), "fetchMe").mockResolvedValue(undefined as never);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    const submitButton = screen.getByRole("button", { name: "Login" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authRepository.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });
      expect(fetchMeSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Welcome back!");
    });
  });

  it("shows error alert when login fails", async () => {
    (authRepository.login as any).mockRejectedValue(
      new Error("Invalid email or password")
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "WrongPass" },
    });

    const submitButton = screen.getByRole("button", { name: "Login" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password");
      expect(toast.error).toHaveBeenCalledWith("Invalid email or password");
    });
  });
});

