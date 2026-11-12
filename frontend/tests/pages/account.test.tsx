import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import AccountSettingsRedirectPage from "@/app/dashboard/account/page";
import { authRepository } from "@/repositories/auth.repository";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: vi.fn(),
  },
}));

describe("AccountSettingsRedirectPage", () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it("redirects to active workspace account settings tab when user has a workspace", async () => {
    (authRepository.getWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        workspace_id: "ws-1",
        workspace_name: "Acme Studio",
        workspace_slug: "acme",
        role_id: "role-1",
        role_name: "Owner",
        role_slug: "owner",
        effective_permissions: ["*"],
      },
    ]);

    render(<AccountSettingsRedirectPage />);

    expect(screen.getByText("Redirecting to account settings…")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/workspace/acme/settings?tab=account");
    });
  });

  it("redirects to /create-workspace when user has no workspaces", async () => {
    (authRepository.getWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(<AccountSettingsRedirectPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/create-workspace");
    });
  });

  it("redirects to /login when workspace lookup fails", async () => {
    (authRepository.getWorkspaces as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unauthorized")
    );

    render(<AccountSettingsRedirectPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
