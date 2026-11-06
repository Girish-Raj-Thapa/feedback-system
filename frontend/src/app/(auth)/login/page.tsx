"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { LoginShowcase } from "@/components/auth/login-showcase";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailId = useId();
  const passwordId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await authRepository.login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      const me = await useAuthStore.getState().fetchMe();
      toast.success("Welcome back!");
      const redirectParam = searchParams.get("redirect");
      const safeRedirect =
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//")
          ? redirectParam
          : null;
      const targetPath =
        safeRedirect ||
        (me?.workspaces && me.workspaces.length > 0
          ? `/workspace/${me.workspaces[0].workspace_slug}`
          : "/create-workspace");
      router.push(targetPath);
      router.refresh();
    } catch (err: unknown) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 xl:gap-14">
      {/* Left Zone: Social Proof & Score Driver Showcase (7 of 12 cols on desktop) */}
      <div className="hidden lg:col-span-7 lg:flex lg:items-center lg:justify-center lg:scale-95 xl:scale-100 origin-center">
        <LoginShowcase />
      </div>

      {/* Right Zone: Form Card (5 of 12 cols on desktop, centered on mobile) */}
      <div className="w-full max-w-lg lg:col-span-5 lg:max-w-none">
        <div className="form-card-shadow relative z-10 w-full max-w-[440px] mx-auto rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-[#1C1C1E]">
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
              Login
            </h1>
            <p className="text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
              Turn qualitative customer signals into clear, actionable product decisions.
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
                  autoComplete="current-password"
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
              <div className="mt-2 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#0071E3] hover:text-[#0077ED] underline-offset-4 hover:underline dark:text-[#2997FF]"
                >
                  Forgot password?
                </Link>
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
                    <span>Logging in…</span>
                  </>
                ) : (
                  <>
                    Login
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
