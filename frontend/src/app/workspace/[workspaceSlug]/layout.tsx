"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
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
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";

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

function getWorkspaceInitials(name?: string): string {
  if (!name) return "WS";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const { user, setUser, clear: clearAuth } = useAuthStore();
  const {
    workspaces,
    setWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    workspaceDetails,
    setWorkspaceDetails,
    clear: clearWorkspaces,
  } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(!user || workspaces.length === 0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  useEffect(() => {
    async function initWorkspaceContext() {
      if (!workspaceSlug) return;

      try {
        let currentUser = user;
        if (!currentUser) {
          currentUser = await authRepository.getMe();
          setUser(currentUser);
        }

        let wsList = workspaces;
        if (wsList.length === 0) {
          wsList = await authRepository.getWorkspaces();
          setWorkspaces(wsList);
        }

        const match = wsList.find(
          (w) => w.workspace_slug.toLowerCase() === workspaceSlug.toLowerCase()
        );
        if (match) {
          setCurrentWorkspace(match);
          try {
            const details = await authRepository.getWorkspace(match.workspace_id);
            setWorkspaceDetails(details);
          } catch {
            // Non-blocking if details fetch fails
          }
        } else if (wsList.length > 0) {
          // If slug doesn't match any of user's workspaces, redirect to workspaces hub
          router.replace("/dashboard/workspaces");
          return;
        }

        setIsLoading(false);
      } catch {
        router.replace("/login");
      }
    }

    initWorkspaceContext();
  }, [
    workspaceSlug,
    user,
    workspaces,
    router,
    setUser,
    setWorkspaces,
    setCurrentWorkspace,
    setWorkspaceDetails,
  ]);

  const handleLogout = async () => {
    try {
      await authRepository.logout();
    } catch {
      // Ignore network errors on logout
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
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  const activeWs =
    currentWorkspace ||
    workspaces.find((w) => w.workspace_slug === workspaceSlug) ||
    workspaces[0];

  const isSettingsActive = pathname.includes("/settings");

  return (
    <div className="flex min-h-screen w-full bg-[#F5F7FA] text-[#161C26] antialiased selection:bg-[#F0F2FE] selection:text-[#363BA6] dark:bg-[#000000] dark:text-[#F5F5F7]">
      {/* Isolated Workspace Sidebar Component */}
      <WorkspaceSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        pathname={pathname}
        workspaceSlug={workspaceSlug}
        activeWs={activeWs}
        workspaceDetails={workspaceDetails}
      />

      {/* MAIN WRAPPER (Offset by sidebar 240px) */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-200 ease-out lg:pl-[240px]">
        {/* TOP NAVBAR (56px) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#E1E5EB] bg-white/75 px-4 backdrop-blur-md sm:px-8 dark:border-white/10 dark:bg-[#1C1C1E]/75">
          {/* Mobile menu trigger & workspace identity */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex size-9 items-center justify-center rounded-[10px] text-[#556070] hover:bg-[#F3F5F9] dark:text-[#A1A1A6] dark:hover:bg-white/5"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {workspaceDetails?.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={workspaceDetails.logo_url}
                  alt={activeWs?.workspace_name || "Workspace"}
                  className="size-6 shrink-0 rounded-[6px] object-cover"
                />
              ) : (
                <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[#161C26] text-[10px] font-bold text-white dark:bg-white dark:text-[#161C26]">
                  {getWorkspaceInitials(activeWs?.workspace_name)}
                </div>
              )}
              <span className="truncate text-[14px] font-semibold text-[#161C26] dark:text-white">
                {activeWs?.workspace_name || "Workspace"}
              </span>
            </div>
          </div>

          {/* Breadcrumb Hierarchy */}
          <nav className="hidden items-center gap-2 text-[14px] text-[#556070] sm:flex dark:text-[#8E8E93]">
            <Link
              href="/dashboard/workspaces"
              className="transition-colors hover:text-[#161C26] dark:hover:text-white"
            >
              Workspaces
            </Link>
            <span>/</span>
            <span className="font-medium text-[#161C26] dark:text-white">
              {activeWs?.workspace_name || "Workspace"}
            </span>
            <span>/</span>
            <span className="text-[#161C26] dark:text-white">
              {isSettingsActive ? "Settings" : "Dashboard"}
            </span>
          </nav>

          {/* Right actions: ThemeToggle + Account dropdown */}
          <div className="relative flex items-center gap-2">
            <ThemeToggle />

            {/* Account Button */}
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-transparent px-2 transition-colors hover:border-[#E1E5EB] hover:bg-[#F3F5F9] dark:hover:border-white/15 dark:hover:bg-white/5"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E8EBF8] text-[12px] font-semibold text-[#4249C9] dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                {getUserInitials(user?.full_name, user?.email)}
              </div>
              <span className="hidden text-[14px] font-medium text-[#161C26] sm:inline dark:text-white">
                {user?.full_name || user?.email?.split("@")[0] || "Account"}
              </span>
              <ChevronDown className="size-3.5 text-[#556070] dark:text-[#8E8E93]" />
            </button>

            {/* Floating Account Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute top-12 right-0 z-40 w-60 rounded-[14px] border border-[#E1E5EB] bg-white py-1.5 shadow-[0_8px_24px_-4px_rgba(16,24,40,0.12)] dark:border-white/15 dark:bg-[#2C2C2E]">
                <div className="px-3.5 py-2.5">
                  <div className="truncate text-[14px] font-semibold text-[#161C26] dark:text-white">
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
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[14px] font-normal text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

