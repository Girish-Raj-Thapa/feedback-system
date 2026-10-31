"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid work email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage(null);
    try {
      await authRepository.forgotPassword({
        email: data.email.trim().toLowerCase(),
      });
      toast.success("Password reset instructions sent if account exists.");
      setSubmittedEmail(data.email.trim());
    } catch (err: unknown) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast.error(message);
    }
  };

  // State 2: Reset email sent confirmation
  if (submittedEmail) {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full bg-[#0071E3]/10 text-[#0071E3] shadow-sm dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
          <Mail className="size-7" aria-hidden="true" />
        </div>

        <h1 className="mb-2 sm:mb-3 text-[26px] sm:text-[32px] font-[650] leading-[1.18] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Check your email
        </h1>

        <p className="mx-auto mb-6 sm:mb-8 max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          If an account exists for{" "}
          <span className="font-semibold text-[#0F172A] dark:text-white">{submittedEmail}</span>
          , you&apos;ll receive a reset link shortly.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="flex h-11 sm:h-12 w-full items-center justify-center rounded-[10px] border border-[#CBD5E1]/80 bg-transparent text-[14px] sm:text-[15px] font-medium text-[#334155] transition-all hover:border-[#0071E3] hover:bg-[#0071E3]/5 hover:text-[#0071E3] dark:border-white/20 dark:text-[#E2E8F0] dark:hover:border-[#0071E3] dark:hover:bg-[#0071E3]/10 dark:hover:text-[#2997FF]"
          >
            Back to login
          </Link>

          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="cursor-pointer py-1 text-xs text-[#64748B] underline-offset-4 transition-colors hover:text-[#0071E3] hover:underline dark:text-[#A1A1A6] dark:hover:text-[#2997FF]"
          >
            Didn&apos;t receive it or entered the wrong email? Try again
          </button>
        </div>
      </div>
    );
  }

  // State 1: Request reset form
  return (
    <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Forgot password?
        </h1>
        <p className="text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          Enter your work email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
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
            htmlFor="email"
            className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            spellCheck={false}
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-11 sm:h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-4 text-[14px] text-[#0F172A] placeholder-[#94A3B8] transition duration-150 focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="pt-1 sm:pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 sm:h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Sending reset link…</span>
              </>
            ) : (
              "Send reset link"
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
