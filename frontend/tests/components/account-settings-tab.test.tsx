import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AccountSettingsTab } from "@/components/workspace/account-settings-tab";
import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    deleteMe: vi.fn(),
  },
}));

describe("AccountSettingsTab", () => {
  const mockReplace = vi.fn();

  const mockUser = {
    id: "u1",
    email: "john@example.com",
    full_name: "John Doe",
    is_active: true,
    is_verified: true,
    is_superuser: false,
    created_at: "2026-01-01T00:00:00Z",
    workspaces: [
      {
        workspace_id: "ws-1",
        workspace_name: "Acme Studio",
        workspace_slug: "acme",
        role_id: "role-1",
        role_name: "Owner",
        role_slug: "owner",
        effective_permissions: ["*"],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.getState().clear();
    useAuthStore.getState().setUser(mockUser);
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it("renders personal profile and updates full name", async () => {
    (authRepository.updateMe as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockUser,
      full_name: "Jane Doe",
    });

    render(<AccountSettingsTab />);

    expect(screen.getByText("Personal Profile")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Your full name");
    expect(nameInput).toHaveValue("John Doe");

    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(authRepository.updateMe).toHaveBeenCalledWith({
        full_name: "Jane Doe",
      });
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully");
    });
  });

  it("changes password when valid current and matching new passwords are submitted", async () => {
    (authRepository.changePassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: "Password updated",
    });

    render(<AccountSettingsTab />);

    expect(screen.getByText("Password & Security")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Enter current password"), {
      target: { value: "OldPassword123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat new password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(authRepository.changePassword).toHaveBeenCalledWith({
        old_password: "OldPassword123!",
        new_password: "NewPassword123!",
      });
      expect(toast.success).toHaveBeenCalledWith("Password changed successfully");
    });
  });

  it("deletes account after modal password confirmation and redirects to /login", async () => {
    (authRepository.deleteMe as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: "Account deleted",
    });

    render(<AccountSettingsTab />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByText("Delete your account")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "OldPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(authRepository.deleteMe).toHaveBeenCalledWith({
        password: "OldPassword123!",
      });
      expect(toast.success).toHaveBeenCalledWith("Account deleted successfully");
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
