"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  PanelLeft,
  Settings,
  X,
} from "lucide-react";

interface DashboardSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  pathname: string;
}

export function DashboardSidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  pathname,
}: DashboardSidebarProps) {
  const isDashboardActive = pathname === "/dashboard";
  const isWorkspacesActive = pathname.startsWith("/dashboard/workspaces");
  const isSettingsActive = pathname.startsWith("/dashboard/account");

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

      {/* DASHBOARD SIDEBAR (240px wide) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E1E5EB] bg-white transition-transform duration-200 ease-out dark:border-white/10 dark:bg-[#1C1C1E] lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Brand Header (64px) - Feedback System Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-transparent px-4">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[#4249C9] text-white shadow-xs">
              <MessageSquare className="size-4" aria-hidden="true" />
            </div>
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#161C26] dark:text-white">
              Feedback System
            </span>
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-2">
          {/* Dashboard */}
          <Link
            href="/dashboard"
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

          {/* Workspaces (Hub) */}
          <Link
            href="/dashboard/workspaces"
            onClick={() => setIsSidebarOpen(false)}
            className={`relative flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isWorkspacesActive
                ? "bg-[#F0F2FE] font-semibold text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]"
                : "font-normal text-[#556070] hover:bg-[#F3F5F9] hover:text-[#161C26] dark:text-[#A1A1A6] dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {isWorkspacesActive && (
              <div className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-[#4249C9]" />
            )}
            <LayoutGrid className="ml-1.5 size-5 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 truncate">Workspaces</span>
          </Link>

          {/* Account Settings */}
          <Link
            href="/dashboard/account"
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

