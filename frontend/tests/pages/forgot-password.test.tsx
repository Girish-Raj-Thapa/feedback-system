import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import { authRepository } from "@/repositories/auth.repository";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    forgotPassword: vi.fn(),
  },
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders forgot password form", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { name: "Forgot password?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("submits email and transitions to confirmation screen", async () => {
    (authRepository.forgotPassword as any).mockResolvedValue({
      message: "Reset link sent",
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "user@example.com" },
    });

    const submitBtn = screen.getByRole("button", { name: "Send reset link" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authRepository.forgotPassword).toHaveBeenCalledWith({
        email: "user@example.com",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Password reset instructions sent if account exists."
      );
      expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    // Test "Try again" resets view
    const tryAgainBtn = screen.getByRole("button", {
      name: /entered the wrong email\? try again/i,
    });
    fireEvent.click(tryAgainBtn);

    expect(screen.getByRole("heading", { name: "Forgot password?" })).toBeInTheDocument();
  });

  it("shows error alert if api call fails", async () => {
    (authRepository.forgotPassword as any).mockRejectedValue(
      new Error("Rate limit exceeded")
    );

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Work email"), {
      target: { value: "user@example.com" },
    });

    const submitBtn = screen.getByRole("button", { name: "Send reset link" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Rate limit exceeded");
      expect(toast.error).toHaveBeenCalledWith("Rate limit exceeded");
    });
  });
});

