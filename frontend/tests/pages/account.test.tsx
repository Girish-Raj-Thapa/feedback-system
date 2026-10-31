import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountSettingsPage from "@/app/dashboard/account/page";
import { useAuthStore } from "@/store/auth.store";
import { authRepository } from "@/repositories/auth.repository";
import { toast } from "sonner";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    deleteMe: vi.fn(),
  },
}));

describe("AccountSettingsPage", () => {
  const mockUser = {
    id: "user-123",
    email: "user@example.com",
    full_name: "Jane Doe",
    is_active: true,
    is_verified: true,
    is_superuser: false,
    workspaces: [],
    created_at: "2024-01-15T12:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(mockUser);
  });

  it("renders user information and initials correctly", () => {
    render(<AccountSettingsPage />);

    expect(screen.getByText("Account settings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("disables save button when full name is unchanged", () => {
    render(<AccountSettingsPage />);
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when full name is modified and updates profile", async () => {
    (authRepository.updateMe as any).mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
      full_name: "Jane Smith",
    });

    render(<AccountSettingsPage />);
    const nameInput = screen.getByDisplayValue("Jane Doe");
    fireEvent.change(nameInput, { target: { value: "Jane Smith" } });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(authRepository.updateMe).toHaveBeenCalledWith({ full_name: "Jane Smith" });
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully");
    });
  });

  it("updates password when requirements and confirmation match", async () => {
    (authRepository.changePassword as any).mockResolvedValue({
      message: "Password changed successfully",
    });

    render(<AccountSettingsPage />);

    const [currentPasswordInput, confirmPasswordInput] = screen.getAllByPlaceholderText("••••••••••••");
    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const updateButton = screen.getByRole("button", { name: /update password/i });

    expect(updateButton).toBeDisabled();

    fireEvent.change(currentPasswordInput, { target: { value: "CurrentPass1!" } });
    fireEvent.change(newPasswordInput, { target: { value: "NewPass123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "NewPass123!" } });

    expect(updateButton).not.toBeDisabled();
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(authRepository.changePassword).toHaveBeenCalledWith({
        old_password: "CurrentPass1!",
        new_password: "NewPass123!",
      });
      expect(toast.success).toHaveBeenCalledWith("Password changed successfully");
    });
  });

  it("opens delete modal and executes delete on confirm", async () => {
    (authRepository.deleteMe as any).mockResolvedValue({
      message: "Account deleted",
    });

    render(<AccountSettingsPage />);

    // Click Delete account button to open modal
    const deleteButton = screen.getByRole("button", { name: "Delete account" });
    fireEvent.click(deleteButton);

    // Modal title appears
    expect(screen.getByText("Delete your account?")).toBeInTheDocument();

    const confirmInput = screen.getByPlaceholderText("Enter your password");
    fireEvent.change(confirmInput, { target: { value: "Password123!" } });

    // Click confirm delete in modal
    const modalDeleteButtons = screen.getAllByRole("button", { name: "Delete account" });
    const modalConfirmBtn = modalDeleteButtons[modalDeleteButtons.length - 1];
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(authRepository.deleteMe).toHaveBeenCalledWith({ password: "Password123!" });
      expect(toast.success).toHaveBeenCalledWith("Account deleted successfully");
    });
  });
});
