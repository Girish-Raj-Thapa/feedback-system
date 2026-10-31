import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/(auth)/register/page";
import { authRepository } from "@/repositories/auth.repository";
import { toast } from "sonner";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    register: jest.fn(),
    resendVerification: jest.fn(),
  },
}));

jest.mock("@/components/auth/score-driver-showcase", () => ({
  ScoreDriverShowcase: () => <div data-testid="score-driver-showcase">Showcase</div>,
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders register form fields and showcase", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByTestId("score-driver-showcase")).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByLabelText("Show password");
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hide password")).toBeInTheDocument();
  });

  it("submits registration successfully and switches to verification screen", async () => {
    (authRepository.register as jest.Mock).mockResolvedValue({
      id: "u-new",
      email: "newuser@example.com",
      full_name: "John Doe",
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "newuser@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    const submitBtn = screen.getByRole("button", { name: "Register" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authRepository.register).toHaveBeenCalledWith({
        full_name: "John Doe",
        email: "newuser@example.com",
        password: "Password123!",
      });
      expect(toast.success).toHaveBeenCalledWith("Account created. Check your email to verify!");
      expect(screen.getByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
      expect(screen.getByText("newuser@example.com")).toBeInTheDocument();
    });

    // Test Resend verification button on the verification screen
    (authRepository.resendVerification as jest.Mock).mockResolvedValue({
      message: "Resent successfully",
    });

    const resendBtn = screen.getByRole("button", { name: /resend verification email/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(authRepository.resendVerification).toHaveBeenCalledWith({
        email: "newuser@example.com",
      });
      expect(toast.success).toHaveBeenCalledWith("Verification email resent. Please check your inbox.");
    });
  });

  it("displays server error alert when registration fails", async () => {
    (authRepository.register as jest.Mock).mockRejectedValue(
      new Error("Email already registered")
    );

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Existing User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "exists@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    const submitBtn = screen.getByRole("button", { name: "Register" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Email already registered");
      expect(toast.error).toHaveBeenCalledWith("Email already registered");
    });
  });
});
