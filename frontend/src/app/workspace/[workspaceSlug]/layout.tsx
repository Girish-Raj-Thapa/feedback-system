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
          router.replace(`/workspace/${wsList[0].workspace_slug}`);
          return;
        } else {
          router.replace("/create-workspace");
          return;
        }

        setIsLoading(false);
      } catch {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "";
        const loginTarget = currentPath
          ? `/login?redirect=${encodeURIComponent(currentPath)}`
          : "/login";
        router.replace(loginTarget);
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

  return (
    <div className="flex min-h-screen w-full bg-canvas text-text antialiased selection:bg-action-subtle selection:text-action-subtle-fg">
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
        {/* TOP NAVBAR (56px) - Glass Header with border */}
        <header className="glass-header sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-6 backdrop-blur-md lg:px-8">
          {/* Mobile menu trigger & workspace identity */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex size-9 items-center justify-center rounded-[10px] text-text-muted hover:bg-hover"
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
                <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-text text-[10px] font-bold text-surface">
                  {getWorkspaceInitials(activeWs?.workspace_name)}
                </div>
              )}
              <span className="truncate text-[14px] font-semibold text-text">
                {activeWs?.workspace_name || "Workspace"}
              </span>
            </div>
          </div>

          {/* Left spacer on desktop (replaces removed redundant breadcrumb) */}
          <div className="hidden lg:block" />

          {/* Right actions: ThemeToggle + Account dropdown */}
          <div className="relative flex items-center gap-2">
            <ThemeToggle />

            {/* Account Button */}
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border border-transparent px-2 transition-colors hover:border-border hover:bg-hover"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-action-subtle text-[12px] font-semibold text-action-subtle-fg">
                {getUserInitials(user?.full_name, user?.email)}
              </div>
              <span className="hidden text-[14px] font-medium text-text sm:inline">
                {user?.full_name || user?.email?.split("@")[0] || "Account"}
              </span>
              <ChevronDown className="size-3.5 text-text-muted" />
            </button>

            {/* Floating Account Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute top-12 right-0 z-40 w-60 rounded-[14px] border border-border bg-surface py-1.5 shadow-menu">
                <div className="px-3.5 py-2.5">
                  <div className="truncate text-[14px] font-semibold text-text">
                    {user?.full_name || "User"}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] font-normal text-text-muted">
                    {user?.email}
                  </div>
                </div>
                <div className="my-1 h-[1px] bg-border" />
                <Link
                  href={`/workspace/${workspaceSlug}/settings?tab=account`}
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[14px] font-normal text-text transition-colors hover:bg-hover"
                >
                  <User className="size-4 text-text-muted" />
                  <span>Account settings</span>
                </Link>
                <div className="my-1 h-[1px] bg-border" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-[14px] font-normal text-status-error transition-colors hover:bg-status-error-bg"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 w-full max-w-[1400px] px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

