"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { authRepository } from "@/repositories/auth.repository";

type VerificationStatus = "verifying" | "success" | "expired";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>(
    token ? "verifying" : "expired"
  );
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;

    async function executeVerification(tokenStr: string) {
      try {
        await authRepository.verifyEmail({ token: tokenStr });
        setStatus("success");
      } catch {
        setStatus("expired");
      }
    }

    executeVerification(token);
  }, [token]);

  // State 1: Verifying in progress
  if (status === "verifying") {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full bg-[#0071E3]/10 text-[#0071E3] shadow-sm dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
          <Loader2 className="size-7 animate-spin" aria-hidden="true" />
        </div>

        <h1 className="mb-2 sm:mb-3 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Verifying your email…
        </h1>

        <p className="mx-auto max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          Please wait while we confirm your email and prepare your workspace.
        </p>
      </div>
    );
  }

  // State 2: Verification successful
  if (status === "success") {
    return (
      <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full border border-[#A7F3D0]/60 bg-[#ECFDF5] text-[#059669] shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>

        <h1 className="relative mb-3 inline-block text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Email verified
        </h1>

        <p className="mx-auto mb-6 sm:mb-8 max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          Your account is now active. You have full access to create workspaces and set up feedback collection.
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

  // State 3: Link expired or invalid
  return (
    <div className="form-card-shadow relative z-10 w-full max-w-[440px] rounded-[20px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-8 text-center dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="mx-auto mb-5 sm:mb-6 flex size-14 items-center justify-center rounded-full border border-[#FECACA] bg-[#FEF2F2] text-[#EF4444] shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
        <AlertCircle className="size-7" aria-hidden="true" />
      </div>

      <h1 className="mb-2 sm:mb-2.5 text-[26px] sm:text-[32px] font-[650] leading-[1.15] tracking-[-0.03em] text-[#0F172A] dark:text-white">
        Verification link expired
      </h1>

      <p className="mx-auto mb-6 sm:mb-8 max-w-[340px] text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
        This verification link is invalid, expired, or has already been used.
      </p>

      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="flex h-11 sm:h-12 w-full items-center justify-center rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99]"
        >
          Go to login
        </Link>

        <Link
          href="/register"
          className="inline-flex items-center justify-center py-1 text-[13.5px] sm:text-[14px] font-medium text-[#64748B] underline-offset-4 transition-colors hover:text-[#0071E3] hover:underline dark:text-[#A1A1A6] dark:hover:text-[#2997FF]"
        >
          Need a new account? Register
        </Link>
      </div>
    </div>
  );
}
