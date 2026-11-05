import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InvitePage from "@/app/(auth)/invite/page";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getInviteByToken: vi.fn(),
    acceptInvite: vi.fn(),
    joinInvite: vi.fn(),
  },
}));

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: any) => <img alt="" {...props} />,
}));

describe("InvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows expired state when no token is present", () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams());

    render(<InvitePage />);

    expect(screen.getByRole("heading", { name: "Invitation expired" })).toBeInTheDocument();
  });

  it("handles 1-click acceptance for existing user", async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams({ token: "existing-user-token" })
    );

    const mockInvite = {
      workspace_name: "Stripe Team",
      inviter_name: "Sarah Connors",
      role_name: "Member",
      email: "sarah@stripe.com",
      is_existing_user: true,
    };

    (authRepository.getInviteByToken as any).mockResolvedValue(mockInvite);
    (authRepository.acceptInvite as any).mockResolvedValue({
      message: "Joined workspace successfully.",
    });

    const fetchMeSpy = vi
      .spyOn(useAuthStore.getState(), "fetchMe")
      .mockResolvedValue(undefined as never);

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Join Stripe Team" })).toBeInTheDocument();
      expect(screen.getByText("Accept and join workspace")).toBeInTheDocument();
    });

    const acceptBtn = screen.getByRole("button", { name: "Accept and join workspace" });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(authRepository.acceptInvite).toHaveBeenCalledWith({
        token: "existing-user-token",
      });
      expect(fetchMeSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Joined workspace successfully.");
    });
  });

  it("renders registration form for new user and handles join", async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams({ token: "new-user-token" })
    );

    const mockInvite = {
      workspace_name: "Acme Labs",
      inviter_name: "Alice Admin",
      role_name: "Editor",
      email: "alice@acme.com",
      is_existing_user: false,
    };

    (authRepository.getInviteByToken as any).mockResolvedValue(mockInvite);
    (authRepository.joinInvite as any).mockResolvedValue({
      message: "Invitation accepted.",
    });

    const fetchMeSpy = vi
      .spyOn(useAuthStore.getState(), "fetchMe")
      .mockResolvedValue(undefined as never);

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Join Acme Labs" })).toBeInTheDocument();
      expect(screen.getByLabelText("Full name")).toBeInTheDocument();
      expect(screen.getByLabelText("Set password")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "New Colleague" },
    });
    fireEvent.change(screen.getByLabelText("Set password"), {
      target: { value: "StrongPass123!" },
    });

    const submitBtn = screen.getByRole("button", { name: "Register and join" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authRepository.joinInvite).toHaveBeenCalledWith({
        token: "new-user-token",
        full_name: "New Colleague",
        password: "StrongPass123!",
      });
      expect(fetchMeSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Welcome! Invitation accepted.");
    });
  });
});
