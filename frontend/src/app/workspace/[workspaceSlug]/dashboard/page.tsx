"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkspaceDashboardSubPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string | undefined;

  useEffect(() => {
    if (workspaceSlug) {
      router.replace(`/workspace/${workspaceSlug}`);
    } else {
      router.replace("/dashboard");
    }
  }, [router, workspaceSlug]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-[#556070] dark:text-[#A1A1A6]">
        Redirecting to workspace insights…
      </p>
    </div>
  );
}
