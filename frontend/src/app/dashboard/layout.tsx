"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { setWorkspaces } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(!user);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      try {
        const [me, wsList] = await Promise.all([
          authRepository.getMe(),
          authRepository.getWorkspaces(),
        ]);
        if (!isMounted) return;
        setUser(me);
        setWorkspaces(wsList);
        setIsLoading(false);
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
      }
    }

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [router, setUser, setWorkspaces]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-[#4249C9] border-t-transparent" />
          <p className="text-sm font-medium text-[#556070] dark:text-[#A1A1A6]">
            Redirecting to workspace…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F5F7FA] p-6 text-[#161C26] antialiased dark:bg-[#000000] dark:text-[#F5F5F7]">
      {children}
    </main>
  );
}
