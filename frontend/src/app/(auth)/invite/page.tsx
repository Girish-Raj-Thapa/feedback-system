"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import type { InvitePublicInfoRead } from "@/types/auth";

const joinSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

type JoinFormData = z.infer<typeof joinSchema>;

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<InvitePublicInfoRead | null>(null);
  const [isLoading, setIsLoading] = useState(!!token);
  const [isExpired, setIsExpired] = useState(!token);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const attemptedRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
    defaultValues: { full_name: "", password: "" },
  });

  useEffect(() => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;

    async function fetchInvite(tokenStr: string) {
      try {
        const info = await authRepository.getInviteByToken(tokenStr);
        setInviteInfo(info);
      } catch {
        setIsExpired(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvite(token);
  }, [token]);

  // Handle 1-click accept for existing users
  const handleAcceptExisting = async () => {
    if (!token) return;
    setIsSubmittingAction(true);
    try {
      await authRepository.acceptInvite({ token });
      await useAuthStore.getState().fetchMe();
      toast.success("Joined workspace successfully.");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle registration & join for new users
  const handleJoinNewUser = async (data: JoinFormData) => {
    if (!token) return;
    try {
      await authRepository.joinInvite({
        token,
        full_name: data.full_name,
        password: data.password,
      });

      await useAuthStore.getState().fetchMe();
      toast.success("Welcome! Invitation accepted.");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#0071E3]/10 text-[#0071E3] shadow-sm dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
          <Loader2 className="size-7 animate-spin" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-[#0F172A] dark:text-white">
          Validating invitation…
        </h2>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#A1A1A6]">
          Please wait while we check your invitation details.
        </p>
      </div>
    );
  }

  // 2. Expired / Invalid State
  if (isExpired || !inviteInfo) {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[#EF4444] shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertCircle className="size-7" aria-hidden="true" />
        </div>

        <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Invitation expired
        </h1>

        <p className="mx-auto mb-6 sm:mb-8 max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          This invite link is no longer valid or has been revoked by the workspace administrator.
        </p>

        <Link
          href="/login"
          className="flex h-11 sm:h-12 w-full items-center justify-center rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99]"
        >
          Back to login
        </Link>
      </div>
    );
  }

  // 3. Valid Invitation (Existing or New User)
  return (
    <div className="form-card-shadow relative z-10 w-full max-w-[480px] rounded-[24px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="mx-auto mb-4 sm:mb-5 flex size-14 items-center justify-center rounded-full bg-[#0071E3]/10 text-[#0071E3] shadow-sm dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
        <Building2 className="size-7" aria-hidden="true" />
      </div>

      <h1 className="mb-3 text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight text-[#0F172A] dark:text-white">
        Join {inviteInfo.workspace_name}
      </h1>

      <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-[#A1A1A6]">
        <Image
          src="/avatars/sarah.jpg"
          alt={inviteInfo.inviter_name || "Team Member"}
          width={24}
          height={24}
          className="size-6 rounded-full object-cover ring-1 ring-white shadow-xs dark:ring-neutral-800"
        />
        <span>
          Invited by{" "}
          <strong className="font-semibold text-slate-800 dark:text-white">
            {inviteInfo.inviter_name || "Workspace Admin"}
          </strong>{" "}
          as{" "}
          <span className="font-semibold text-[#0071E3] dark:text-[#2997FF]">
            {inviteInfo.role_name}
          </span>
        </span>
      </div>

      {inviteInfo.is_existing_user ? (
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/90 p-3.5 text-xs sm:text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-[#A1A1A6]">
            <Info className="size-4 shrink-0 text-[#0071E3] dark:text-[#2997FF]" aria-hidden="true" />
            <span>
              An account already exists for{" "}
              <strong className="font-medium text-slate-800 dark:text-white">
                {inviteInfo.email}
              </strong>
              .
            </span>
          </div>

          <button
            type="button"
            disabled={isSubmittingAction}
            onClick={handleAcceptExisting}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmittingAction ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Joining workspace…</span>
              </>
            ) : (
              "Accept and join workspace"
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(handleJoinNewUser)} className="space-y-4 text-left">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#A1A1A6]">
              Email address
            </label>
            <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 text-sm text-slate-600 shadow-xs select-none cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-[#A1A1A6]">
              <span className="font-medium text-slate-700 dark:text-white">
                {inviteInfo.email}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Lock className="size-3.5" aria-hidden="true" />
                <span>Locked</span>
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="full_name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#A1A1A6]"
            >
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              placeholder="Jane Doe"
              autoComplete="name"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-[#A1A1A6]"
            >
              Set password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 text-slate-400 transition-colors hover:text-slate-600 dark:text-[#636366] dark:hover:text-[#A1A1A6]"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Registering…</span>
                </>
              ) : (
                "Register and join"
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-slate-400 dark:text-[#8E8E93]">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            <span>This invitation is verified and encrypted.</span>
          </div>
        </form>
      )}
    </div>
  );
}
