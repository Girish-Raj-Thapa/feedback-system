"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  FileText,
  Inbox,
  LayoutDashboard,
  PanelLeft,
  Plus,
  Settings,
  X,
} from "lucide-react";

import { useWorkspaceStore } from "@/store/workspace.store";
import type { UserWorkspaceMembershipRead, WorkspaceRead } from "@/types/auth";

interface WorkspaceSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  pathname: string;
  workspaceSlug: string;
  activeWs: UserWorkspaceMembershipRead | null;
  workspaceDetails: WorkspaceRead | null;
  inboxCount?: number;
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
  inboxCount,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const { workspaces } = useWorkspaceStore();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");
  const currentSlug = workspaceSlug || activeWs?.workspace_slug || "";

  const isBaseWorkspace =
    pathname === `/workspace/${currentSlug}` ||
    pathname === `/workspace/${currentSlug}/dashboard`;

  const isInboxActive = isBaseWorkspace && currentTab === "inbox";
  const isInsightsActive = isBaseWorkspace && (!currentTab || currentTab === "insights");
  const isFormsActive = pathname.startsWith(`/workspace/${currentSlug}/forms`);
  const isSettingsActive = pathname.startsWith(
    `/workspace/${currentSlug}/settings`
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsSwitcherOpen(false);
      }
    }
    if (isSwitcherOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSwitcherOpen]);

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
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-surface transition-transform duration-200 ease-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Workspace Brand Header & Popover Switcher (64px) */}
        <div
          ref={switcherRef}
          className="relative border-b border-border"
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-3">
            <button
              type="button"
              onClick={() => setIsSwitcherOpen((prev) => !prev)}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-[10px] p-1.5 text-left transition-colors hover:bg-hover"
              aria-expanded={isSwitcherOpen}
              aria-haspopup="true"
              aria-label="Switch workspace"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {workspaceDetails?.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={workspaceDetails.logo_url}
                    alt={activeWs?.workspace_name || "Workspace"}
                    className="size-7 shrink-0 rounded-[8px] object-cover shadow-xs"
                  />
                ) : (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-action text-[11px] font-bold tracking-tight text-white shadow-xs">
                    {getWorkspaceInitials(activeWs?.workspace_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-text">
                    {activeWs?.workspace_name || "Workspace"}
                  </span>
                  <span className="block truncate text-[11px] font-medium text-text-muted">
                    {activeWs?.role_name || "Workspace"}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-text-muted" />
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="ml-1 flex size-8 items-center justify-center rounded-[8px] text-text-muted hover:bg-hover lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Switcher Popover Dropdown */}
          {isSwitcherOpen && (
            <div className="absolute top-[68px] right-3 left-3 z-50 rounded-[14px] border border-border bg-surface p-1.5 shadow-menu">
              <div className="px-2.5 py-1.5">
                <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
                  Workspaces
                </span>
              </div>
              <div className="max-h-56 space-y-0.5 overflow-y-auto">
                {workspaces.map((ws) => {
                  const isActive =
                    ws.workspace_slug.toLowerCase() ===
                    currentSlug.toLowerCase();
                  return (
                    <button
                      key={ws.workspace_id}
                      type="button"
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        setIsSidebarOpen(false);
                        router.push(`/workspace/${ws.workspace_slug}`);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-action-subtle font-medium text-action-subtle-fg"
                          : "text-text-muted hover:bg-hover"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-subtle text-[10px] font-bold text-text">
                          {getWorkspaceInitials(ws.workspace_name)}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] leading-tight text-text">
                            {ws.workspace_name}
                          </span>
                          <span className="block truncate text-[11px] text-text-muted">
                            {ws.role_name}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <Check className="size-4 shrink-0 text-action" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="my-1 h-[1px] bg-border" />

              <Link
                href="/create-workspace"
                onClick={() => {
                  setIsSwitcherOpen(false);
                  setIsSidebarOpen(false);
                }}
                className="flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[13px] font-medium text-action transition-colors hover:bg-action-subtle"
              >
                <Plus className="size-4" />
                <span>Create new workspace</span>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-3">
          {/* Insights */}
          <Link
            href={`/workspace/${currentSlug}`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isInsightsActive
                ? "bg-action-subtle font-medium text-action-subtle-fg"
                : "font-normal text-text-muted hover:bg-hover hover:text-text"
            }`}
          >
            <LayoutDashboard
              className="ml-1 size-4.5 shrink-0"
              aria-hidden="true"
            />
            <span className="ml-2.5 truncate">Insights</span>
          </Link>

          {/* Inbox */}
          <Link
            href={`/workspace/${currentSlug}?tab=inbox`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex h-9 items-center justify-between rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isInboxActive
                ? "bg-action-subtle font-medium text-action-subtle-fg"
                : "font-normal text-text-muted hover:bg-hover hover:text-text"
            }`}
          >
            <div className="flex min-w-0 items-center">
              <Inbox className="ml-1 size-4.5 shrink-0" aria-hidden="true" />
              <span className="ml-2.5 truncate">Inbox</span>
            </div>
            {Boolean(inboxCount && inboxCount > 0) && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  isInboxActive
                    ? "bg-action text-white"
                    : "bg-subtle text-text-muted"
                }`}
              >
                {inboxCount}
              </span>
            )}
          </Link>

          {/* Forms */}
          <Link
            href={`/workspace/${currentSlug}/forms`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isFormsActive
                ? "bg-action-subtle font-medium text-action-subtle-fg"
                : "font-normal text-text-muted hover:bg-hover hover:text-text"
            }`}
          >
            <FileText className="ml-1 size-4.5 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 truncate">Forms</span>
          </Link>

          {/* Settings */}
          <Link
            href={`/workspace/${currentSlug}/settings`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex h-9 items-center rounded-[10px] px-2.5 text-[14px] transition-colors ${
              isSettingsActive
                ? "bg-action-subtle font-medium text-action-subtle-fg"
                : "font-normal text-text-muted hover:bg-hover hover:text-text"
            }`}
          >
            <Settings className="ml-1 size-4.5 shrink-0" aria-hidden="true" />
            <span className="ml-2.5 truncate">Settings</span>
          </Link>
        </nav>

        {/* Sidebar Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border p-3">
          <div className="flex size-7 items-center justify-center rounded-[8px] text-text-subtle opacity-40">
            <PanelLeft className="size-4" />
          </div>
          <span className="text-[11px] font-normal text-text-subtle opacity-40">
            v1.0
          </span>
        </div>
      </aside>
    </>
  );
}
