"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authRepository } from "@/repositories/auth.repository";

export default function AccountSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectToWorkspaceAccount() {
      try {
        const wsList = await authRepository.getWorkspaces();
        if (wsList && wsList.length > 0) {
          router.replace(
            `/workspace/${wsList[0].workspace_slug}/settings?tab=account`
          );
        } else {
          router.replace("/create-workspace");
        }
      } catch {
        router.replace("/login");
      }
    }
    redirectToWorkspaceAccount();
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="size-8 animate-spin rounded-full border-2 border-[#4249C9] border-t-transparent" />
      <p className="text-sm font-medium text-[#556070] dark:text-[#A1A1A6]">
        Redirecting to account settings…
      </p>
    </div>
  );
}
