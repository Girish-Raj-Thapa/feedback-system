"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { AmbientBackground } from "@/components/auth/ambient-background";

export default function RootHomePage() {
  const router = useRouter();

  useEffect(() => {
    async function initSession() {
      try {
        const user = await authRepository.getMe();
        useAuthStore.getState().setUser(user);

        if (user.workspaces && user.workspaces.length > 0) {
          router.replace("/dashboard");
          return;
        }

        // Authenticated user with no workspaces yet -> onboarding
        router.replace("/create-workspace");
      } catch {
        // Unauthenticated session -> login
        router.replace("/login");
      }
    }

    initSession();
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F7F9FC] dark:bg-[#0C0C0E]">
      <AmbientBackground />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-[#64748B] dark:text-[#A1A1A6]">
          Loading your workspace…
        </p>
      </div>
    </div>
  );
}
