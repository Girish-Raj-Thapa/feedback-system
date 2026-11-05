"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";

export function AccountSettingsTab() {
  const router = useRouter();
  const { user, setUser, clear: clearAuth } = useAuthStore();
  const { clear: clearWorkspaces } = useWorkspaceStore();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Account Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // User Initials
  const getUserInitials = (name?: string | null, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "US";
  };

  const formatJoinedDate = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  const isLengthValid = newPassword.length >= 8;
  const isMatchValid =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim() === user?.full_name) return;

    setIsUpdatingProfile(true);
    try {
      const updatedUser = await authRepository.updateMe({
        full_name: fullName.trim(),
      });
      setUser({
        ...user!,
        full_name: updatedUser.full_name,
      });
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !isLengthValid || !isMatchValid) return;

    setIsUpdatingPassword(true);
    try {
      await authRepository.changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      toast.error(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) return;

    setIsDeletingAccount(true);
    try {
      await authRepository.deleteMe({ password: deleteConfirmPassword });
      toast.success("Account deleted successfully");
      clearAuth();
      clearWorkspaces();
      router.replace("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account";
      toast.error(message);
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* CARD 1 — Profile */}
      <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="border-b border-[#E1E5EB] px-6 py-4 dark:border-white/10">
          <h2 className="text-[16px] font-semibold text-[#161C26] dark:text-white">
            Personal Profile
          </h2>
          <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
            Manage your personal identity across all workspaces.
          </p>
        </div>

        <div className="divide-y divide-[#E1E5EB] dark:divide-white/10">
          {/* Photo / Avatar Row */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[220px] pr-4 shrink-0">
              <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                Avatar
              </p>
              <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
                Member since {formatJoinedDate(user?.created_at)}
              </p>
            </div>
            <div className="flex flex-1 items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full border border-[#E1E5EB] bg-[#EEF2F8] text-[18px] font-semibold text-[#4249C9] dark:border-white/15 dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                {getUserInitials(user?.full_name, user?.email)}
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.info("Avatar image uploads will be enabled soon")
                }
                className="h-9 cursor-pointer rounded-[10px] border border-[#E1E5EB] bg-white px-3.5 text-[13px] font-medium text-[#161C26] transition-colors hover:border-[#C9CFD9] hover:bg-[#F5F7FA] dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white dark:hover:bg-white/5"
              >
                Change
              </button>
            </div>
          </div>

          {/* Full Name Row */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[220px] pr-4 shrink-0">
              <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                Full name
              </p>
              <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
                Your display name
              </p>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
              />
            </div>
          </div>

          {/* Email Row */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[220px] pr-4 shrink-0">
              <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                Email
              </p>
              <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
                Your login email address
              </p>
            </div>
            <div className="flex-1">
              <div className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-3 size-4 text-[#767685] dark:text-[#8E8E93]" />
                <input
                  type="text"
                  readOnly
                  value={user?.email || ""}
                  className="h-10 w-full cursor-not-allowed select-all rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] pr-24 pl-9 text-[14px] text-[#556070] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]"
                />
                <div className="absolute right-2.5 flex items-center gap-1 rounded-[6px] bg-[#E8F6EE] px-2 py-0.5 text-[#17794A] dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check className="size-3.5" />
                  <span className="text-[12px] font-medium">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 py-3.5 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={
              isUpdatingProfile ||
              !fullName.trim() ||
              fullName.trim() === user?.full_name
            }
            className={`h-9 rounded-[10px] px-4 text-[14px] font-medium transition-colors ${
              !fullName.trim() || fullName.trim() === user?.full_name
                ? "cursor-not-allowed bg-[#E1E5EB] text-[#8C96A5] dark:bg-white/10 dark:text-white/30"
                : "cursor-pointer bg-[#4249C9] text-white shadow-xs hover:bg-[#363BA6] dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
            }`}
          >
            {isUpdatingProfile ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* CARD 2 — Password & Security */}
      <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="border-b border-[#E1E5EB] px-6 py-4 dark:border-white/10">
          <h2 className="text-[16px] font-semibold text-[#161C26] dark:text-white">
            Password & Security
          </h2>
          <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
            Update your account password. Must be at least 8 characters.
          </p>
        </div>

        <div className="divide-y divide-[#E1E5EB] dark:divide-white/10">
          {/* Current password */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[220px] pr-4 shrink-0">
              <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                Current password
              </p>
            </div>
            <div className="flex-1">
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#767685] hover:text-[#161C26] dark:hover:text-white"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[220px] pr-4 shrink-0">
              <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                New password
              </p>
            </div>
            <div className="flex-1">
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#767685] hover:text-[#161C26] dark:hover:text-white"
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Confirm new password */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[220px] pr-4 shrink-0">
              <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                Confirm new password
              </p>
            </div>
            <div className="flex-1">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#767685] hover:text-[#161C26] dark:hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 py-3.5 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={
              isUpdatingPassword ||
              !currentPassword ||
              !isLengthValid ||
              !isMatchValid
            }
            className={`h-9 rounded-[10px] px-4 text-[14px] font-medium transition-colors ${
              !currentPassword || !isLengthValid || !isMatchValid
                ? "cursor-not-allowed bg-[#E1E5EB] text-[#8C96A5] dark:bg-white/10 dark:text-white/30"
                : "cursor-pointer bg-[#4249C9] text-white shadow-xs hover:bg-[#363BA6] dark:bg-[#2997FF] dark:hover:bg-[#0071E3]"
            }`}
          >
            {isUpdatingPassword ? "Updating…" : "Update password"}
          </button>
        </div>
      </section>

      {/* CARD 3 — Danger Zone (Delete Account) */}
      <section className="overflow-hidden rounded-[14px] border border-red-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-red-900/40 dark:bg-[#1C1C1E]">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-red-600 dark:text-red-400">
              Delete account
            </h2>
            <p className="mt-1 text-[13px] text-[#667284] dark:text-[#8E8E93]">
              Permanently delete your personal profile and revoke access to all workspaces.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="h-9 cursor-pointer rounded-[10px] border border-red-300 bg-white px-4 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/20"
          >
            Delete account
          </button>
        </div>
      </section>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-[#E1E5EB] bg-white p-6 shadow-xl dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="size-5" />
              <h3 className="text-[17px] font-semibold">Delete your account</h3>
            </div>
            <p className="mt-2 text-[14px] text-[#556070] dark:text-[#8E8E93]">
              This action is irreversible. All your personal data and memberships will be deleted.
            </p>
            <div className="mt-4">
              <label className="block text-[13px] font-medium text-[#161C26] dark:text-white">
                Enter your password to confirm
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showDeletePassword ? "text" : "password"}
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  placeholder="Password"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] focus:border-red-500 focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#767685]"
                >
                  {showDeletePassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmPassword("");
                }}
                className="h-9 rounded-[10px] border border-[#E1E5EB] px-3.5 text-[13px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || !deleteConfirmPassword}
                className="h-9 rounded-[10px] bg-red-600 px-4 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingAccount ? "Deleting…" : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

