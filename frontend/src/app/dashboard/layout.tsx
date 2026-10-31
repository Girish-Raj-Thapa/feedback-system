"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

function getUserInitials(name?: string | null, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "US";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, setUser, clear: clearAuth } = useAuthStore();
  const { setWorkspaces, clear: clearWorkspaces } =
    useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(!user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  useEffect(() => {
    async function initUserHub() {
      try {
        const me = await authRepository.getMe();
        setUser(me);

        // Fetch workspaces
        const wsList = await authRepository.getWorkspaces();
        setWorkspaces(wsList);

        setIsLoading(false);
      } catch {
        router.replace("/login");
      }
    }

    initUserHub();
  }, [router, setUser, setWorkspaces]);

  const handleLogout = async () => {
    try {
      await authRepository.logout();
    } catch {
      // Ignore network failures on logout
    }
    clearAuth();
    clearWorkspaces();
    toast.success("Logged out successfully");
    router.replace("/login");
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-[#4249C9] border-t-transparent" />
          <p className="text-sm font-medium text-[#556070] dark:text-[#A1A1A6]">
            Loading workspaces…
          </p>
        </div>
      </div>
    );
  }

  const isSettingsActive = pathname.startsWith("/dashboard/account");

  return (
    <div className="flex min-h-screen w-full bg-[#F5F7FA] text-[#161C26] antialiased selection:bg-[#F0F2FE] selection:text-[#363BA6] dark:bg-[#000000] dark:text-[#F5F5F7]">
      <DashboardSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        pathname={pathname}
      />

      {/* MAIN WRAPPER (Offset by sidebar 240px) */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-200 ease-out lg:pl-[240px]">
        {/* TOP NAVBAR (56px) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#E1E5EB] bg-white/75 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#1C1C1E]/80 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[#E1E5EB] text-[#161C26] lg:hidden dark:border-white/10 dark:text-white"
              aria-label="Open sidebar"
            >
              <Menu className="size-4" />
            </button>
            {isSettingsActive && (
              <span className="text-[14px] font-medium text-[#161C26] dark:text-white">
                Account settings
              </span>
            )}
          </div>

          {/* Right actions: Theme Toggle & Account Menu */}
          <div className="relative flex items-center gap-2">
            <ThemeToggle />

            {/* Account Button */}
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-transparent px-2 transition-colors hover:border-[#E1E5EB] hover:bg-[#F3F5F9] dark:border-transparent dark:hover:border-white/10 dark:hover:bg-white/5"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E8EBF8] text-[12px] font-semibold text-[#4249C9] dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                {getUserInitials(user?.full_name, user?.email)}
              </div>
              <span className="hidden text-[14px] font-medium text-[#161C26] sm:inline dark:text-white">
                {user?.full_name || user?.email?.split("@")[0]}
              </span>
              <ChevronDown
                className="size-3.5 text-[#556070] dark:text-[#8E8E93]"
                aria-hidden="true"
              />
            </button>

            {/* Floating Account Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute top-12 right-0 z-50 w-60 rounded-[14px] border border-[#E1E5EB] bg-white py-1.5 shadow-[0_8px_24px_-4px_rgba(16,24,40,0.12)] dark:border-white/15 dark:bg-[#2C2C2E]">
                <div className="px-3.5 py-2.5">
                  <div className="truncate text-[14px] font-semibold leading-tight text-[#161C26] dark:text-white">
                    {user?.full_name || "User"}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] font-normal text-[#556070] dark:text-[#8E8E93]">
                    {user?.email}
                  </div>
                </div>

                <div className="my-1 h-[1px] bg-[#E1E5EB] dark:bg-white/10" />

                <Link
                  href="/dashboard/account"
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] font-normal text-[#161C26] transition-colors hover:bg-[#F3F5F9] dark:text-white dark:hover:bg-white/5"
                >
                  <User className="size-4 text-[#556070] dark:text-[#8E8E93]" />
                  <span>Account settings</span>
                </Link>

                <div className="my-1 h-[1px] bg-[#E1E5EB] dark:bg-white/10" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[14px] font-normal text-[#C0281B] transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

