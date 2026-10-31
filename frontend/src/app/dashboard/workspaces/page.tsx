"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { authRepository } from "@/repositories/auth.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import type { UserWorkspaceMembershipRead } from "@/types/auth";

interface EnrichedWorkspace extends UserWorkspaceMembershipRead {
  industry?: string | null;
  membersCount: number;
}

export default function DashboardWorkspacesPage() {
  const { setWorkspaces } = useWorkspaceStore();

  const [enrichedWorkspaces, setEnrichedWorkspaces] = useState<
    EnrichedWorkspace[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "owned" | "shared">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Fetch workspaces and enrich them with details & member counts
  useEffect(() => {
    let isMounted = true;

    async function loadWorkspaceData() {
      try {
        const wsList = await authRepository.getWorkspaces();
        if (!isMounted) return;
        setWorkspaces(wsList);

        // Fetch details for each workspace in parallel
        const enriched = await Promise.all(
          wsList.map(async (ws) => {
            try {
              const [details, members] = await Promise.all([
                authRepository
                  .getWorkspace(ws.workspace_id)
                  .catch(() => null),
                authRepository
                  .listWorkspaceMembers(ws.workspace_id)
                  .catch(() => []),
              ]);
              return {
                ...ws,
                industry: details?.industry || "SaaS and software",
                membersCount: Math.max(members.length, 1),
              };
            } catch {
              return {
                ...ws,
                industry: "SaaS and software",
                membersCount: 1,
              };
            }
          })
        );

        if (isMounted) {
          setEnrichedWorkspaces(enriched);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspaceData();

    return () => {
      isMounted = false;
    };
  }, [setWorkspaces]);

  // Counts
  const ownedCount = useMemo(
    () =>
      enrichedWorkspaces.filter(
        (ws) => ws.role_slug.toLowerCase() === "owner"
      ).length,
    [enrichedWorkspaces]
  );
  const sharedCount = enrichedWorkspaces.length - ownedCount;

  // Filtered & Searched list
  const filteredWorkspaces = useMemo(() => {
    return enrichedWorkspaces.filter((ws) => {
      // Role filter
      if (filter === "owned" && ws.role_slug.toLowerCase() !== "owner") {
        return false;
      }
      if (filter === "shared" && ws.role_slug.toLowerCase() === "owner") {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ws.workspace_name.toLowerCase().includes(q);
        const matchesIndustry = (ws.industry || "")
          .toLowerCase()
          .includes(q);
        if (!matchesName && !matchesIndustry) return false;
      }

      return true;
    });
  }, [enrichedWorkspaces, filter, searchQuery]);

  // Pagination calculation
  const totalItems = filteredWorkspaces.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedWorkspaces = filteredWorkspaces.slice(
    startIndex,
    startIndex + pageSize
  );


  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-[#4249C9] border-t-transparent" />
          <p className="text-sm font-medium text-[#556070] dark:text-[#8E8E93]">
            Loading workspaces…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 sm:pb-8">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#161C26] dark:text-white">
            Workspaces
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] font-normal text-[#556070] dark:text-[#8E8E93]">
            {enrichedWorkspaces.length} workspace
            {enrichedWorkspaces.length === 1 ? "" : "s"}. You own {ownedCount} of
            them.
          </p>
        </div>
        <Link
          href="/create-workspace"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#4249C9] px-4 text-[14px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] w-full sm:w-auto"
        >
          New workspace
        </Link>
      </div>

      {/* Toolbar */}
      <div className="relative z-20 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Dropdown Trigger Button */}
        <div className="relative w-full sm:w-auto" ref={filterRef}>
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex h-9 w-full sm:w-auto cursor-pointer items-center justify-between sm:justify-start gap-2 rounded-[10px] border border-[#C9CFD9] bg-white px-3 text-[14px] font-medium text-[#161C26] transition-colors hover:bg-[#F3F5F9] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:hover:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-[#556070] dark:text-[#8E8E93]" />
              <span>
                {filter === "all"
                  ? "All workspaces"
                  : filter === "owned"
                  ? "Owned by me"
                  : "Shared with me"}
              </span>
            </div>
            <ChevronDown className="size-3.5 text-[#556070] dark:text-[#8E8E93]" />
          </button>

          {/* Filter Dropdown Menu */}
          {isFilterDropdownOpen && (
            <div className="absolute top-11 left-0 z-30 w-[220px] rounded-[14px] border border-[#E1E5EB] bg-white py-1.5 shadow-[0_8px_24px_-4px_rgba(16,24,40,0.12)] dark:border-white/15 dark:bg-[#2C2C2E]">
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setIsFilterDropdownOpen(false);
                  setCurrentPage(1);
                }}
                className="flex h-9 w-full cursor-pointer items-center justify-between px-3 text-left text-[14px] transition-colors hover:bg-[#F3F5F9] dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-4 items-center justify-center text-[#4249C9] ${
                      filter === "all" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Check className="size-4" />
                  </span>
                  <span
                    className={
                      filter === "all"
                        ? "font-semibold text-[#161C26] dark:text-white"
                        : "font-normal text-[#556070] dark:text-[#8E8E93]"
                    }
                  >
                    All workspaces
                  </span>
                </div>
                <span className="rounded bg-[#EDF0F5] px-1.5 py-0.5 text-[12px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                  {enrichedWorkspaces.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilter("owned");
                  setIsFilterDropdownOpen(false);
                  setCurrentPage(1);
                }}
                className="flex h-9 w-full cursor-pointer items-center justify-between px-3 text-left text-[14px] transition-colors hover:bg-[#F3F5F9] dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-4 items-center justify-center text-[#4249C9] ${
                      filter === "owned" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Check className="size-4" />
                  </span>
                  <span
                    className={
                      filter === "owned"
                        ? "font-semibold text-[#161C26] dark:text-white"
                        : "font-normal text-[#556070] dark:text-[#8E8E93]"
                    }
                  >
                    Owned by me
                  </span>
                </div>
                <span className="rounded bg-[#EDF0F5] px-1.5 py-0.5 text-[12px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                  {ownedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilter("shared");
                  setIsFilterDropdownOpen(false);
                  setCurrentPage(1);
                }}
                className="flex h-9 w-full cursor-pointer items-center justify-between px-3 text-left text-[14px] transition-colors hover:bg-[#F3F5F9] dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-4 items-center justify-center text-[#4249C9] ${
                      filter === "shared" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Check className="size-4" />
                  </span>
                  <span
                    className={
                      filter === "shared"
                        ? "font-semibold text-[#161C26] dark:text-white"
                        : "font-normal text-[#556070] dark:text-[#8E8E93]"
                    }
                  >
                    Shared with me
                  </span>
                </div>
                <span className="rounded bg-[#EDF0F5] px-1.5 py-0.5 text-[12px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                  {sharedCount}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#556070] dark:text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search workspaces"
            className="h-9 w-full rounded-[10px] border border-[#E1E5EB] bg-white pr-3 pl-9 text-[14px] text-[#161C26] placeholder-[#667284] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white dark:placeholder-[#8E8E93]"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
        {/* Table Header (Desktop / Tablet: md and up) */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] h-11 select-none items-center rounded-t-[14px] border-b border-[#E1E5EB] bg-[#F7F9FC] px-5 text-[13px] font-medium text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
          <div className="min-w-0 pr-3">Workspace</div>
          <div className="min-w-0 pr-3">Industry</div>
          <div className="min-w-0 pr-3">Role</div>
          <div className="min-w-0 pr-3 text-right">Members</div>
          <div className="min-w-0 text-right">Actions</div>
        </div>

        {/* Table Body / Empty State */}
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#EDF0F5] text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
              <Search className="size-5" />
            </div>
            <div className="text-center text-[16px] font-semibold text-[#161C26] dark:text-white">
              No workspaces match
            </div>
            <p className="mt-1 max-w-[320px] text-center text-[14px] font-normal text-[#556070] dark:text-[#8E8E93]">
              Try a different name or change the filter.
            </p>
            {(searchQuery || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                  setCurrentPage(1);
                }}
                className="mt-4 h-8 cursor-pointer rounded-[8px] bg-[#EDF0F5] px-3.5 text-[13px] font-medium text-[#161C26] transition-colors hover:bg-[#E1E5EB] dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Rows (md and up) */}
            <div className="hidden md:block divide-y divide-[#E1E5EB] dark:divide-white/10">
              {paginatedWorkspaces.map((ws) => {
                const isOwner = ws.role_slug.toLowerCase() === "owner";
                return (
                  <div
                    key={ws.workspace_id}
                    className="group grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] h-14 items-center px-5 transition-colors duration-150 hover:bg-[#F3F5F9] dark:hover:bg-white/5"
                  >
                    {/* Workspace Name (1.5x) */}
                    <div className="min-w-0 pr-3">
                      <Link
                        href={`/workspace/${ws.workspace_slug}`}
                        className="block truncate text-[14px] font-semibold text-[#161C26] transition-colors group-hover:text-[#4249C9] dark:text-white dark:group-hover:text-[#2997FF]"
                      >
                        {ws.workspace_name}
                      </Link>
                    </div>

                    {/* Industry Column (1x) */}
                    <div className="flex min-w-0 items-center pr-3 text-[14px] text-[#556070] dark:text-[#8E8E93]">
                      <span className="truncate">{ws.industry || "SaaS and software"}</span>
                    </div>

                    {/* Role Column (1x) */}
                    <div className="min-w-0 pr-3">
                      {isOwner ? (
                        <span className="inline-block truncate rounded-[6px] bg-[#F0F2FE] px-2 py-0.5 text-[12px] font-medium text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                          Owner
                        </span>
                      ) : (
                        <span className="inline-block truncate rounded-[6px] bg-[#EDF0F5] px-2 py-0.5 text-[12px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                          {ws.role_name}
                        </span>
                      )}
                    </div>

                    {/* Members Column (1x) */}
                    <div className="min-w-0 pr-3 text-right font-mono text-[14px] tabular-nums text-[#556070] dark:text-[#8E8E93]">
                      {ws.membersCount}
                    </div>

                    {/* Actions Column (1x) */}
                    <div className="flex min-w-0 items-center justify-end">
                      <Link
                        href={`/workspace/${ws.workspace_slug}`}
                        title="Open workspace"
                        aria-label={`Open ${ws.workspace_name}`}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] text-[#556070] transition-colors hover:bg-[#EDF0F5] hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="divide-y divide-[#E1E5EB] md:hidden dark:divide-white/10">
              {paginatedWorkspaces.map((ws) => {
                const isOwner = ws.role_slug.toLowerCase() === "owner";
                return (
                  <div
                    key={ws.workspace_id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-[#F3F5F9] dark:hover:bg-white/5"
                  >
                    {/* Top: Name + Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/workspace/${ws.workspace_slug}`}
                          className="block truncate text-[15px] font-semibold text-[#161C26] transition-colors hover:text-[#4249C9] dark:text-white dark:hover:text-[#2997FF]"
                        >
                          {ws.workspace_name}
                        </Link>
                        <div className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                          <span className="truncate">{ws.industry || "SaaS and software"}</span>
                        </div>
                      </div>

                      <Link
                        href={`/workspace/${ws.workspace_slug}`}
                        title="Open workspace"
                        aria-label={`Open ${ws.workspace_name}`}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[#E1E5EB] bg-white text-[#556070] transition-colors hover:bg-[#EDF0F5] hover:text-[#161C26] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93] dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </div>

                    {/* Bottom meta: Role Badge + Member count */}
                    <div className="flex items-center justify-between text-[12px] pt-1 border-t border-[#F0F2F6] dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#556070] dark:text-[#8E8E93]">Role:</span>
                        {isOwner ? (
                          <span className="rounded-[6px] bg-[#F0F2FE] px-2 py-0.5 font-medium text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#2997FF]">
                            Owner
                          </span>
                        ) : (
                          <span className="rounded-[6px] bg-[#EDF0F5] px-2 py-0.5 font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                            {ws.role_name}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[13px] tabular-nums text-[#556070] dark:text-[#8E8E93]">
                        {ws.membersCount} {ws.membersCount === 1 ? "member" : "members"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:h-14 sm:items-center sm:justify-between rounded-b-[14px] border-t border-[#E1E5EB] bg-[#F7F9FC] p-4 sm:px-5 text-[13px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
            {/* Left side */}
            <span className="text-center sm:text-left">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + pageSize, totalItems)} of {totalItems}{" "}
              workspace{totalItems === 1 ? "" : "s"}
            </span>

            {/* Right side */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <span>Rows per page</span>
                <div className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#E1E5EB] bg-white px-2.5 text-[13px] font-medium text-[#161C26] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white">
                  <span>{pageSize}</span>
                </div>
              </div>

              <span>
                Page {validCurrentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  title="First page"
                  className="flex size-8 items-center justify-center rounded-[8px] text-[#556070] transition-colors hover:border hover:border-[#E1E5EB] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent dark:text-[#8E8E93] dark:hover:border-white/15 dark:hover:bg-[#1C1C1E]"
                >
                  <ChevronsLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={validCurrentPage === 1}
                  title="Previous page"
                  className="flex size-8 items-center justify-center rounded-[8px] text-[#556070] transition-colors hover:border hover:border-[#E1E5EB] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent dark:text-[#8E8E93] dark:hover:border-white/15 dark:hover:bg-[#1C1C1E]"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={validCurrentPage === totalPages}
                  title="Next page"
                  className="flex size-8 items-center justify-center rounded-[8px] text-[#556070] transition-colors hover:border hover:border-[#E1E5EB] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent dark:text-[#8E8E93] dark:hover:border-white/15 dark:hover:bg-[#1C1C1E]"
                >
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  title="Last page"
                  className="flex size-8 items-center justify-center rounded-[8px] text-[#556070] transition-colors hover:border hover:border-[#E1E5EB] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent dark:text-[#8E8E93] dark:hover:border-white/15 dark:hover:bg-[#1C1C1E]"
                >
                  <ChevronsRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
