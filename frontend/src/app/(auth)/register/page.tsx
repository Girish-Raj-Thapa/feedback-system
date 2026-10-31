"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { ScoreDriverShowcase } from "@/components/auth/score-driver-showcase";
import { Button } from "@/components/ui/button";

const registerSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const fullNameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const watchedPassword = useWatch({ control, name: "password", defaultValue: "" });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    try {
      await authRepository.register({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        full_name: data.full_name.trim(),
      });

      toast.success("Account created. Check your email to verify!");
      setRegisteredEmail(data.email.trim());
    } catch (err: unknown) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      await authRepository.resendVerification({ email: registeredEmail });
      toast.success("Verification email resent. Please check your inbox.");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsResending(false);
    }
  };

  // State 2: Verification email sent screen
  if (registeredEmail) {
    return (
      <section
        aria-labelledby="check-inbox-heading"
        className="form-card-shadow relative w-full max-w-md mx-auto rounded-[18px] sm:rounded-[20px] border border-[#E9EEF5]/70 bg-white p-5 sm:p-7 text-center dark:border-white/10 dark:bg-[#1C1C1E]"
      >
        <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-[#0071E3]/10 text-[#0071E3]">
          <Mail className="size-6 sm:size-7" aria-hidden="true" />
        </div>

        <h1
          id="check-inbox-heading"
          className="mt-3.5 sm:mt-5 text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white"
        >
          Check your inbox
        </h1>
        <p className="mt-1.5 sm:mt-2 text-[13px] sm:text-sm leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          We sent a secure verification link to{" "}
          <span className="font-semibold text-[#0F172A] dark:text-white">{registeredEmail}</span>
          . Please click the link to activate your workspace.
        </p>

        <div className="mt-4 sm:mt-5 flex items-start gap-2.5 sm:gap-3 rounded-[10px] border border-[#E2E8F0] bg-slate-50/70 p-3 text-left text-[11.5px] sm:text-xs text-[#64748B] dark:border-white/10 dark:bg-white/5 dark:text-[#A1A1A6]">
          <CheckCircle2
            className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>
            Once verified, your workspace unlocks instant sentiment velocity, Score
            Drivers, and omnichannel feedback widgets.
          </span>
        </div>

        <div className="mt-5 sm:mt-6 flex flex-col gap-2.5 sm:gap-3">
          <Button
            variant="outline"
            className="h-10 sm:h-11 w-full rounded-[10px]"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <RotateCw className="size-4 animate-spin" aria-hidden="true" />
                Resending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>

          <Button
            className="h-10 sm:h-11 w-full rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white"
            onClick={() => router.push("/login")}
          >
            Continue to Login
          </Button>
        </div>
      </section>
    );
  }

  // State 1: Register form + Score Driver Showcase
  return (
    <div className="flex w-full flex-col items-center justify-center lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 xl:gap-14">
      {/* Left Zone: Form Card (5 of 12 cols on desktop) */}
      <div className="w-full max-w-lg lg:col-span-5 lg:max-w-none">
        <div className="form-card-shadow relative z-10 w-full max-w-[440px] mx-auto rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-[#1C1C1E]">
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
              Register
            </h1>
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
                htmlFor={fullNameId}
                className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
              >
                Name
              </label>
              <input
                id={fullNameId}
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                disabled={isSubmitting}
                aria-invalid={!!errors.full_name}
                aria-describedby={errors.full_name ? `${fullNameId}-error` : undefined}
                className="h-11 sm:h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-4 text-[14px] text-[#0F172A] placeholder-[#94A3B8] transition duration-150 focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p id={`${fullNameId}-error`} className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={emailId}
                className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
              >
                Email
              </label>
              <input
                id={emailId}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                spellCheck={false}
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
                className="h-11 sm:h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-4 text-[14px] text-[#0F172A] placeholder-[#94A3B8] transition duration-150 focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
                {...register("email")}
              />
              {errors.email && (
                <p id={`${emailId}-error`} className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={passwordId}
                className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? `${passwordId}-error` : undefined}
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
                <p id={`${passwordId}-error`} className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.password.message}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#A1A1A6]">
                <Check
                  className={`size-3.5 ${
                    watchedPassword && watchedPassword.length >= 8
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[#94A3B8]"
                  }`}
                  aria-hidden="true"
                />
                <span>At least 8 characters</span>
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
                    <span>Registering…</span>
                  </>
                ) : (
                  <>
                    Register
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Zone: Social Proof & Score Driver Showcase (7 of 12 cols on desktop) */}
      <div className="hidden lg:col-span-7 lg:flex lg:items-center lg:justify-center lg:scale-95 xl:scale-100 origin-center">
        <ScoreDriverShowcase />
      </div>
    </div>
  );
}
