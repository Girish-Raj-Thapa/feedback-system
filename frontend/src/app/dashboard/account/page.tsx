"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";

export default function AccountSettingsPage() {
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

  // Format joined date
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

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "Empty" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    const labels = ["Weak", "Weak", "Fair", "Good", "Strong"];
    return { score, label: labels[score] };
  };

  const passwordStrength = getPasswordStrength(newPassword);
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
    <div className="mx-auto w-full max-w-[720px] pb-12">
      {/* Ghost Link: Back to workspaces */}
      <Link
        href="/dashboard/workspaces"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#4249C9] transition-colors hover:text-[#363BA6] dark:text-[#2997FF] dark:hover:text-[#64D2FF]"
      >
        <ArrowLeft className="size-4" />
        <span>Back to workspaces</span>
      </Link>

      {/* Page Header */}
      <div className="mt-3 mb-6">
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#161C26] dark:text-white">
          Account settings
        </h1>
        <p className="mt-0.5 text-[14px] font-normal text-[#556070] dark:text-[#8E8E93]">
          Manage your personal profile and security.
        </p>
      </div>

      {/* CARD STACK */}
      <div className="flex flex-col gap-6">
        {/* CARD 1 — Profile */}
        <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
          <div className="border-b border-[#E1E5EB] px-6 py-4 dark:border-white/10">
            <h2 className="text-[16px] font-semibold text-[#161C26] dark:text-white">
              Profile
            </h2>
          </div>

          <div className="divide-y divide-[#E1E5EB] dark:divide-white/10">
            {/* Photo Row */}
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-[220px] pr-4 shrink-0">
                <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                  Photo
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
                    toast.info("Avatar uploads will be supported soon")
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
                  Your email cannot be changed here.
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

          {/* Footer strip */}
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

        {/* CARD 2 — Password */}
        <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
          <div className="border-b border-[#E1E5EB] px-6 py-4 dark:border-white/10">
            <h2 className="text-[16px] font-semibold text-[#161C26] dark:text-white">
              Password
            </h2>
            <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
              Use at least 8 characters.
            </p>
          </div>

          <div className="divide-y divide-[#E1E5EB] dark:divide-white/10">
            {/* Current password */}
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-[220px] pr-4 shrink-0">
                <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                  Current password
                </p>
                <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
                  Enter current password
                </p>
              </div>
              <div className="flex-1">
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 cursor-pointer text-[#767685] transition-colors hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
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
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="w-[220px] pr-4 pt-2 shrink-0">
                <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                  New password
                </p>
                <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
                  Must be at least 8 characters
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 cursor-pointer text-[#767685] transition-colors hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword && (
                  <div className="mt-0.5 flex items-center gap-2.5">
                    <div className="flex flex-1 items-center gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            step <= passwordStrength.score
                              ? passwordStrength.score <= 1
                                ? "bg-red-500"
                                : passwordStrength.score === 2
                                ? "bg-[#3B4252] dark:bg-amber-400"
                                : "bg-emerald-500"
                              : "bg-[#EDF0F5] dark:bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[12px] font-medium text-[#667284] dark:text-[#8E8E93]">
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="w-[220px] pr-4 pt-2 shrink-0">
                <p className="text-[14px] font-medium text-[#161C26] dark:text-white">
                  Confirm password
                </p>
                <p className="mt-0.5 text-[13px] text-[#667284] dark:text-[#8E8E93]">
                  Re-enter new password
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2.5">
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 cursor-pointer text-[#767685] transition-colors hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {/* Validation indicators */}
                <div className="flex items-center gap-5 pt-0.5">
                  <div
                    className={`flex items-center gap-1.5 ${
                      isLengthValid
                        ? "text-[#17794A] dark:text-emerald-400"
                        : "text-[#8C96A5] dark:text-white/30"
                    }`}
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span className="text-[13px]">At least 8 characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      isMatchValid
                        ? "text-[#17794A] dark:text-emerald-400"
                        : "text-[#8C96A5] dark:text-white/30"
                    }`}
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span className="text-[13px]">Passwords match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer strip */}
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

        {/* CARD 3 — Delete account */}
        <section className="overflow-hidden rounded-[14px] border border-[#F3B8B3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-red-900/40 dark:bg-[#1C1C1E]">
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-[380px] pr-4">
              <h2 className="text-[16px] font-semibold text-[#C0281B] dark:text-red-400">
                Delete account
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#667284] dark:text-[#8E8E93]">
                Permanently deletes your credentials and removes you from every
                workspace. Workspaces you own must be transferred or deleted first.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmPassword("");
                  setIsDeleteModalOpen(true);
                }}
                className="h-[38px] cursor-pointer rounded-[10px] border border-[#F3B8B3] bg-white px-4 text-[14px] font-medium text-[#C0281B] transition-colors hover:bg-[#FDEBE9] dark:border-red-900/60 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Delete account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal — Delete Account */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[440px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            {/* Warning icon + title */}
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FDEBE9] text-[#C0281B] dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="size-5" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[18px] font-semibold leading-tight text-[#161C26] dark:text-white">
                  Delete your account?
                </h3>
                <p className="mt-1 text-[14px] text-[#556070] dark:text-[#8E8E93]">
                  Enter your password to confirm. This cannot be undone.
                </p>
              </div>
            </div>

            {/* Password input */}
            <div className="mt-4">
              <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showDeletePassword ? "text" : "password"}
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] pr-10 pl-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#C0281B] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword((prev) => !prev)}
                  className="absolute right-3 cursor-pointer text-[#767685] transition-colors hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
                >
                  {showDeletePassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingAccount}
                className="h-10 cursor-pointer rounded-[10px] border border-[#E1E5EB] bg-white px-4 text-[14px] font-medium text-[#161C26] transition-colors hover:bg-[#F5F7FA] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || !deleteConfirmPassword}
                className={`h-10 rounded-[10px] px-4 text-[14px] font-medium transition-colors ${
                  !deleteConfirmPassword
                    ? "cursor-not-allowed bg-[#E1E5EB] text-[#8C96A5] dark:bg-white/10 dark:text-white/30"
                    : "cursor-pointer bg-[#C0281B] text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                }`}
              >
                {isDeletingAccount ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

