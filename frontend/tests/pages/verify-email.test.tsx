import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";
import { authRepository } from "@/repositories/auth.repository";
import { useSearchParams } from "next/navigation";

jest.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    verifyEmail: jest.fn(),
  },
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows expired state immediately when no token is present", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(<VerifyEmailPage />);

    expect(screen.getByRole("heading", { name: "Verification link expired" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("verifies token successfully and shows success view", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams({ token: "valid-verify-token" })
    );
    (authRepository.verifyEmail as jest.Mock).mockResolvedValue({
      message: "Email successfully verified",
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(authRepository.verifyEmail).toHaveBeenCalledWith({
        token: "valid-verify-token",
      });
      expect(screen.getByRole("heading", { name: "Email verified" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Continue to login" })).toBeInTheDocument();
    });
  });

  it("shows expired state when verification API fails", async () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams({ token: "expired-token" })
    );
    (authRepository.verifyEmail as jest.Mock).mockRejectedValue(
      new Error("Invalid or expired token")
    );

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Verification link expired" })).toBeInTheDocument();
    });
  });
});
