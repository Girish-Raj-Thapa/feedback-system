"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authRepository } from "@/repositories/auth.repository";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const wsList = await authRepository.getWorkspaces();
        if (wsList && wsList.length > 0) {
          router.replace(`/workspace/${wsList[0].workspace_slug}`);
        } else {
          router.replace("/create-workspace");
        }
      } catch {
        router.replace("/login");
      }
    }
    redirect();
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="pb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#161C26] dark:text-white">
          Welcome to dashboard
        </h1>
      </div>
    </div>
  );
}
