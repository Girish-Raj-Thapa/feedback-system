"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AmbientBackground } from "./ambient-background";
import { AuthHeader } from "./auth-header";
import { AuthFooter } from "./auth-footer";

interface RouteHeaderConfig {
  promptText: string;
  actionText: string;
  actionHref: string;
  mirrored?: boolean;
}

const ROUTE_CONFIGS: Record<string, RouteHeaderConfig> = {
  "/login": {
    promptText: "New here?",
    actionText: "Register",
    actionHref: "/register",
    mirrored: true,
  },
  "/register": {
    promptText: "Already have an account?",
    actionText: "Login",
    actionHref: "/login",
    mirrored: false,
  },
  "/forgot-password": {
    promptText: "Remember your password?",
    actionText: "Login",
    actionHref: "/login",
    mirrored: false,
  },
  "/reset-password": {
    promptText: "Remember your password?",
    actionText: "Login",
    actionHref: "/login",
    mirrored: false,
  },
  "/verify-email": {
    promptText: "Already verified?",
    actionText: "Login",
    actionHref: "/login",
    mirrored: false,
  },
  "/invite": {
    promptText: "Already have an account?",
    actionText: "Login",
    actionHref: "/login",
    mirrored: false,
  },
  "/create-workspace": {
    promptText: "",
    actionText: "",
    actionHref: "",
    mirrored: false,
  },
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const config = ROUTE_CONFIGS[pathname] || {
    promptText: "",
    actionText: "",
    actionHref: "",
    mirrored: false,
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col justify-between overflow-x-hidden overflow-y-auto sm:overflow-hidden bg-[#F7F9FC] text-[#0F172A] dark:bg-[#000000] dark:text-white">
      {/* Ambient background with subtle glows and paper grain */}
      <AmbientBackground mirrored={config.mirrored} />

      {/* Main 1440px Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-between px-4 sm:px-10 lg:px-12 xl:px-16 min-h-0">
        {/* Top Header */}
        <AuthHeader
          promptText={config.promptText}
          actionText={config.actionText}
          actionHref={config.actionHref}
        />

        {/* Centered Main Workspace Content */}
        <main className="my-auto flex flex-1 items-center justify-center py-1 sm:py-3 lg:py-0 min-h-0">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <Loader2
                  className="size-8 animate-spin text-[#0071E3]"
                  aria-hidden="true"
                />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>

        {/* Footer */}
        <AuthFooter />
      </div>
    </div>
  );
}

