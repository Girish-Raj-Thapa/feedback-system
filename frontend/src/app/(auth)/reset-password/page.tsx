"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { ApiClientError } from "@/repositories/client";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSuccess, setIsSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(!token);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
    mode: "onChange",
  });

  const passwordValue = useWatch({ control, name: "password" }) || "";
  const confirmPasswordValue =
    useWatch({ control, name: "confirm_password" }) || "";

  const hasLength = passwordValue.length >= 8;
  const passwordsMatch =
    confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setIsExpired(true);
      return;
    }

    setErrorMessage(null);
    try {
      await authRepository.resetPassword({
        token,
        new_password: data.password,
      });
      toast.success("Password reset successfully!");
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
        setIsExpired(true);
      } else {
        const message = (err as Error).message;
        setErrorMessage(message);
        toast.error(message);
      }
    }
  };

  // State 1: Expired or invalid token
  if (!token || isExpired) {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[#EF4444] shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="size-7" aria-hidden="true" />
        </div>

        <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Link expired or invalid
        </h1>

        <p className="mx-auto mb-6 sm:mb-8 max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          This password reset link is invalid or has expired. Please request a new one.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/forgot-password"
            className="flex h-11 sm:h-12 w-full items-center justify-center rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99]"
          >
            Request new link
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center py-1 text-[13.5px] sm:text-[14px] font-medium text-[#64748B] underline-offset-4 transition-colors hover:text-[#0071E3] hover:underline dark:text-[#A1A1A6] dark:hover:text-[#2997FF]"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  // State 2: Password updated successfully
  if (isSuccess) {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full border border-[#A7F3D0]/60 bg-[#ECFDF5] text-[#059669] shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>

        <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Password updated
        </h1>

        <p className="mx-auto mb-6 sm:mb-8 max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          Your password has been reset. You can now log in with your new password.
        </p>

        <Link
          href="/login"
          className="flex h-11 sm:h-12 w-full items-center justify-center rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99]"
        >
          Continue to login
        </Link>
      </div>
    );
  }

  // State 3: Set new password form
  return (
    <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Set new password
        </h1>
        <p className="text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          Your new password must be at least 8 characters long.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-[10px] border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {errorMessage}
          </div>
        )}

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-11 sm:h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-4 pr-11 text-[14px] text-[#0F172A] placeholder-[#94A3B8] transition duration-150 focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#94A3B8] transition-colors hover:text-[#64748B] dark:text-[#636366] dark:hover:text-[#A1A1A6]"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm_password"
            className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
          >
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-invalid={!!errors.confirm_password}
              aria-describedby={
                errors.confirm_password ? "confirm-password-error" : undefined
              }
              className="h-11 sm:h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-4 pr-11 text-[14px] text-[#0F172A] placeholder-[#94A3B8] transition duration-150 focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
              {...register("confirm_password")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#94A3B8] transition-colors hover:text-[#64748B] dark:text-[#636366] dark:hover:text-[#A1A1A6]"
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.confirm_password && (
            <p
              id="confirm-password-error"
              className="mt-1 text-xs text-rose-600 dark:text-rose-400"
            >
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <div
            className={`flex items-center gap-2 text-[12.5px] sm:text-[13px] transition-colors ${
              hasLength
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[#64748B] dark:text-[#A1A1A6]"
            }`}
          >
            <div
              className={`flex size-4 items-center justify-center rounded-full border transition-colors ${
                hasLength
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-[#E2E8F0] text-[#94A3B8] dark:border-white/15 dark:text-[#636366]"
              }`}
            >
              <Check className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span>At least 8 characters</span>
          </div>

          <div
            className={`flex items-center gap-2 text-[12.5px] sm:text-[13px] transition-colors ${
              passwordsMatch
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[#64748B] dark:text-[#A1A1A6]"
            }`}
          >
            <div
              className={`flex size-4 items-center justify-center rounded-full border transition-colors ${
                passwordsMatch
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-[#E2E8F0] text-[#94A3B8] dark:border-white/15 dark:text-[#636366]"
              }`}
            >
              <Check className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span>Passwords match</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 sm:h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Saving new password…</span>
              </>
            ) : (
              "Save new password"
            )}
          </button>
        </div>
      </form>

      <div className="mt-5 sm:mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center text-[13.5px] sm:text-[14px] font-medium text-[#0071E3] underline-offset-4 transition-colors hover:text-[#0077ED] hover:underline dark:text-[#2997FF]"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
