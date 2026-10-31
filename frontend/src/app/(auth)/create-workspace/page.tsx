"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await authRepository.getMe();
        useAuthStore.getState().setUser(user);
        setIsLoading(false);
      } catch {
        router.replace("/login?redirect=/create-workspace");
      }
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-[#0071E3]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="form-card-shadow relative z-10 w-full max-w-[500px] rounded-[24px] border border-[#E9EEF5]/70 bg-white p-6 sm:p-9 dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#0071E3]/10 text-[#0071E3] shadow-sm dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
          <Building2 className="size-7" aria-hidden="true" />
        </div>
        <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight tracking-[-0.03em] text-[#0F172A] dark:text-white">
          Create your workspace
        </h1>
        <p className="mt-2 text-[14px] sm:text-[15px] font-normal leading-relaxed text-[#64748B] dark:text-[#A1A1A6]">
          Workspaces isolate your customer feedback, theme buckets, and team members.
        </p>
      </div>

      <CreateWorkspaceForm />
    </div>
  );
}

