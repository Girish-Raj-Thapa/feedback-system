"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardWorkspacesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="size-8 animate-spin rounded-full border-2 border-[#4249C9] border-t-transparent" />
      <p className="text-sm font-medium text-[#556070] dark:text-[#A1A1A6]">
        Redirecting to your workspace…
      </p>
    </div>
  );
}
