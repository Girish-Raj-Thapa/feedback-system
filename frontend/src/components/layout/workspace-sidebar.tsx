"use client";

import Link from "next/link";
import {
  FileText,
  LayoutDashboard,
  PanelLeft,
  Settings,
  X,
} from "lucide-react";
import type { UserWorkspaceMembershipRead, WorkspaceRead } from "@/types/auth";

interface WorkspaceSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  pathname: string;
  workspaceSlug: string;
  activeWs: UserWorkspaceMembershipRead | null;
  workspaceDetails: WorkspaceRead | null;
}

function getWorkspaceInitials(name?: string): string {
  if (!name) return "WS";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function WorkspaceSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  pathname,
  workspaceSlug,
  activeWs,
  workspaceDetails,
}: WorkspaceSidebarProps) {
  const currentSlug = workspaceSlug || activeWs?.workspace_slug || "";

  const isDashboardActive =
    pathname === `/workspace/${currentSlug}` ||
    pathname === `/workspace/${currentSlug}/dashboard`;
  const isFormsActive = pathname.startsWith(`/workspace/${currentSlug}/forms`);
  const isSettingsActive = pathname.startsWith(`/workspace/${currentSlug}/settings`);

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          role="presentation"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* WORKSPACE SIDEBAR (240px wide) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E1E5EB] bg-white transition-transform duration-200 ease-out dark:border-white/10 dark:bg-[#1C1C1E] lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Workspace Brand Header (64px) */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E1E5EB] px-4 dark:border-white/10">
          <Link
            href={`/workspace/${currentSlug}`}
            className="flex min-w-0 items-center gap-2.5"
          >
            {workspaceDetails?.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={workspaceDetails.logo_url}
                alt={activeWs?.workspace_name || "Workspace"}
                className="size-7 shrink-0 rounded-[8px] object-cover shadow-xs"
              />
            ) : (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[#161C26] text-[11px] font-bold tracking-tight text-white shadow-xs dark:bg-white dark:text-[#161C26]">
                {getWorkspaceInitials(activeWs?.workspace_name)}
              </div>
            )}
            <div className="min-w-0">
              <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-[#161C26] dark:text-white">
                {activeWs?.workspace_name || "Workspace"}
              </span>
              <span className="block truncate text-[11px] font-medium text-[#556070] dark:text-[#8E8E93]">
                {activeWs?.role_name || "Workspace"}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="flex size-8 items-center justify-center rounded-[8px] text-[#556070] hover:bg-[#F3F5F9] lg:hidden dark:text-[#A1A1A6] dark:hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-3">
          {/* Workspace Dashboard */}
          <Link
            href={`/workspace/${currentSlug}`}
            onClick={() => setIsSidebarOpen(false)}
            className={`relative flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isDashboardActive
                ? "bg-[#F0F2FE] font-semibold text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]"
                : "font-normal text-[#556070] hover:bg-[#F3F5F9] hover:text-[#161C26] dark:text-[#A1A1A6] dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {isDashboardActive && (
              <div className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-[#4249C9]" />
            )}
            <LayoutDashboard className="ml-1.5 size-5 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 truncate">Dashboard</span>
          </Link>

          {/* Forms & Widgets Studio */}
          <Link
            href={`/workspace/${currentSlug}/forms`}
            onClick={() => setIsSidebarOpen(false)}
            className={`relative flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isFormsActive
                ? "bg-[#F0F2FE] font-semibold text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]"
                : "font-normal text-[#556070] hover:bg-[#F3F5F9] hover:text-[#161C26] dark:text-[#A1A1A6] dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {isFormsActive && (
              <div className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-[#4249C9]" />
            )}
            <FileText className="ml-1.5 size-5 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 truncate">Forms & Widgets</span>
          </Link>

          {/* Workspace Settings */}
          <Link
            href={`/workspace/${currentSlug}/settings`}
            onClick={() => setIsSidebarOpen(false)}
            className={`relative flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isSettingsActive
                ? "bg-[#F0F2FE] font-semibold text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]"
                : "font-normal text-[#556070] hover:bg-[#F3F5F9] hover:text-[#161C26] dark:text-[#A1A1A6] dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {isSettingsActive && (
              <div className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-[#4249C9]" />
            )}
            <Settings className="ml-1.5 size-5 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 truncate">Settings</span>
          </Link>
        </nav>

        {/* Sidebar Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-[#E1E5EB] p-3 dark:border-white/10">
          <div className="flex size-8 items-center justify-center rounded-[8px] text-[#556070] dark:text-[#8E8E93]">
            <PanelLeft className="size-4" />
          </div>
          <span className="text-[12px] font-normal text-[#556070] dark:text-[#8E8E93]">
            v1.0
          </span>
        </div>
      </aside>
    </>
  );
}

