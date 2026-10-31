import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import { authRepository } from "@/repositories/auth.repository";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    resetPassword: jest.fn(),
  },
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows invalid/expired message when no token is present", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: "Link expired or invalid" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request new link" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("renders reset password form when token is present", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams({ token: "test-token-123" })
    );

    render(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: "Set new password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
  });

  it("submits valid new password and shows success screen", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams({ token: "test-token-123" })
    );
    (authRepository.resetPassword as jest.Mock).mockResolvedValue({
      message: "Password reset successfully!",
    });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewSecurePass123!" },
    });

    const submitBtn = screen.getByRole("button", { name: "Save new password" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authRepository.resetPassword).toHaveBeenCalledWith({
        token: "test-token-123",
        new_password: "NewSecurePass123!",
      });
      expect(toast.success).toHaveBeenCalledWith("Password reset successfully!");
      expect(screen.getByRole("heading", { name: "Password updated" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Continue to login" })).toBeInTheDocument();
    });
  });
});
