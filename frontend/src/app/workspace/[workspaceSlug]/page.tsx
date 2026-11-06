"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Filter,
  Inbox,
  Loader2,
  Search,
  Share2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import {
  FeedbackDetailDrawer,
  getSentimentBadge,
  getStatusBadge,
} from "@/components/workspace/feedback-detail-drawer";
import { WorkspaceInsightsTab } from "@/components/workspace/workspace-insights-tab";
import { WorkspaceOnboardingChecklist } from "@/components/workspace/workspace-onboarding-checklist";
import { useWorkspaceStore } from "@/store/workspace.store";
import type { WorkspaceRead } from "@/types/auth";
import type {
  FeedbackCategory,
  FeedbackInsightsResponse,
  FeedbackSubmissionRead,
  FeedbackSubmissionUpdate,
  SubmissionStatus,
} from "@/types/feedback";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
  { id: "archived", label: "Archived" },
];

const TIMEFRAME_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "All time", value: 0 },
];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getRatingBadge(rating: number | null, scaleType: string) {
  if (rating === null || rating === undefined) {
    return <span className="text-[12px] text-[#8E8E93] italic">No rating</span>;
  }

  if (scaleType === "5_star") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        <Star className="size-3.5 fill-amber-500 text-amber-500" />
        <span>{rating} / 5</span>
      </span>
    );
  }

  if (scaleType === "5_emoji") {
    const emojiMap: Record<number, string> = {
      1: "😡",
      2: "🙁",
      3: "😐",
      4: "🙂",
      5: "😍",
    };
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#F3F5F9] px-2 py-0.5 text-[12px] font-medium text-[#161C26] dark:bg-white/10 dark:text-white">
        <span>{emojiMap[rating] || "😐"}</span>
        <span>{rating}/5</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-[#EDF0F5] px-2 py-0.5 text-[12px] font-semibold text-[#161C26] dark:bg-white/10 dark:text-white">
      {rating} / 10
    </span>
  );
}

export default function WorkspaceDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceSlug = params?.workspaceSlug as string;
  const tabParam = searchParams?.get("tab");
  const idParam = searchParams?.get("id");

  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeView, setActiveView] = useState<"insights" | "inbox">(
    tabParam === "inbox" || Boolean(idParam) ? "inbox" : "insights"
  );
  const [selectedDays, setSelectedDays] = useState<number | string>(30);
  const [insights, setInsights] = useState<FeedbackInsightsResponse | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceRead | null>(null);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [submissions, setSubmissions] = useState<FeedbackSubmissionRead[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [formsCount, setFormsCount] = useState(0);
  const [isLoadingSampleData, setIsLoadingSampleData] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<FeedbackSubmissionRead | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const isInitialLoaded = useRef(false);

  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setActiveView(tabParam === "inbox" || Boolean(idParam) ? "inbox" : "insights");
  }

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== "all" ||
      categoryFilter !== "all" ||
      sentimentFilter !== "all"
  );

  const handleUpdateSubmission = async (
    submissionId: string,
    payload: FeedbackSubmissionUpdate
  ) => {
    if (!workspace) return;
    try {
      setIsUpdatingStatus(true);
      const updated = await feedbackRepository.updateSubmission(
        workspace.id,
        submissionId,
        payload
      );
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? updated : s))
      );
      setSelectedSubmission((prev) =>
        prev && prev.id === submissionId ? updated : prev
      );
      if (payload.status) {
        const labelMap: Record<string, string> = {
          in_progress: "marked as in progress",
          resolved: "marked as resolved",
          archived: "archived",
          new: "reopened",
          reviewed: "marked as reviewed",
        };
        toast.success(`Submission ${labelMap[payload.status] || "updated"}`);
      } else if (payload.category_id !== undefined) {
        toast.success("Category updated");
      } else if (payload.sentiment !== undefined) {
        toast.success("Sentiment updated");
      } else {
        toast.success("Submission updated");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update submission";
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (
    submissionId: string,
    newStatus: SubmissionStatus
  ) => {
    await handleUpdateSubmission(submissionId, { status: newStatus });
  };

  const fetchSubmissions = useCallback(
    async (
      wsId: string,
      query: string,
      status: string,
      categoryId: string,
      sentiment: string
    ) => {
      try {
        setIsFiltering(true);
        const res = await feedbackRepository.listSubmissions(wsId, {
          limit: 50,
          offset: 0,
          query: query.trim() || undefined,
          status: status !== "all" ? status : undefined,
          category_id: categoryId !== "all" ? categoryId : undefined,
          sentiment: sentiment !== "all" ? sentiment : undefined,
        });
        setSubmissions(res.items);
        setTotalSubmissions(res.total);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load submissions";
        toast.error(msg);
      } finally {
        setIsFiltering(false);
      }
    },
    []
  );

  // Debounced filter refetch
  useEffect(() => {
    if (!workspace || !isInitialLoaded.current) return;
    const timer = setTimeout(() => {
      fetchSubmissions(
        workspace.id,
        searchQuery,
        statusFilter,
        categoryFilter,
        sentimentFilter
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [
    workspace,
    searchQuery,
    statusFilter,
    categoryFilter,
    sentimentFilter,
    fetchSubmissions,
  ]);

  const handleDaysChange = async (daysVal: number | string) => {
    setSelectedDays(daysVal);
    if (!workspace) return;
    try {
      setIsLoadingInsights(true);
      if (typeof feedbackRepository.getInsights === "function") {
        const res = await feedbackRepository.getInsights(workspace.id, {
          days: daysVal === 0 ? undefined : daysVal,
        });
        setInsights(res);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleDrillDownCategory = (catId: string | null) => {
    setCategoryFilter(catId || "all");
    setActiveView("inbox");
  };

  const handleDrillDownAtRisk = () => {
    setStatusFilter("new");
    setSentimentFilter("negative");
    setActiveView("inbox");
  };

  const handleLoadSampleData = async () => {
    if (!workspace) return;
    try {
      setIsLoadingSampleData(true);
      const res = await feedbackRepository.loadSampleData(workspace.id);
      toast.success(res.message || "Sample feedback loaded");
      const [submissionsPage, insightsData, formsList] = await Promise.all([
        feedbackRepository.listSubmissions(workspace.id, {
          limit: 50,
          offset: 0,
        }),
        typeof feedbackRepository.getInsights === "function"
          ? feedbackRepository.getInsights(workspace.id, {
              days: selectedDays === 0 ? undefined : selectedDays,
            })
          : Promise.resolve(null),
        typeof feedbackRepository.listForms === "function"
          ? feedbackRepository.listForms(workspace.id).catch(() => [])
          : Promise.resolve([]),
      ]);
      setSubmissions(submissionsPage.items);
      setTotalSubmissions(submissionsPage.total);
      setInsights(insightsData);
      setFormsCount(formsList?.length || 0);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load sample data";
      toast.error(msg);
    } finally {
      setIsLoadingSampleData(false);
    }
  };

  const handleClearSampleData = async () => {
    if (!workspace) return;
    try {
      setIsLoadingSampleData(true);
      const res = await feedbackRepository.clearSampleData(workspace.id);
      toast.success(res.message || "Sample data cleared");
      const [submissionsPage, insightsData] = await Promise.all([
        feedbackRepository.listSubmissions(workspace.id, {
          limit: 50,
          offset: 0,
        }),
        typeof feedbackRepository.getInsights === "function"
          ? feedbackRepository.getInsights(workspace.id, {
              days: selectedDays === 0 ? undefined : selectedDays,
            })
          : Promise.resolve(null),
      ]);
      setSubmissions(submissionsPage.items);
      setTotalSubmissions(submissionsPage.total);
      setInsights(insightsData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to clear sample data";
      toast.error(msg);
    } finally {
      setIsLoadingSampleData(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!workspaceSlug) return;
      try {
        let wsList = workspaces;
        if (wsList.length === 0) {
          wsList = await authRepository.getWorkspaces();
          setWorkspaces(wsList);
        }

        const membership = wsList.find(
          (w) => w.workspace_slug.toLowerCase() === workspaceSlug.toLowerCase()
        );
        if (!membership) {
          if (wsList.length > 0) {
            router.replace(`/workspace/${wsList[0].workspace_slug}`);
          } else {
            router.replace("/create-workspace");
          }
          return;
        }

        const [wsDetails, categoriesList, submissionsPage, insightsData, formsList] =
          await Promise.all([
            authRepository.getWorkspace(membership.workspace_id),
            typeof feedbackRepository.listCategories === "function"
              ? feedbackRepository
                  .listCategories(membership.workspace_id)
                  .catch(() => [])
              : Promise.resolve([]),
            feedbackRepository.listSubmissions(membership.workspace_id, {
              limit: 50,
              offset: 0,
            }),
            typeof feedbackRepository.getInsights === "function"
              ? feedbackRepository
                  .getInsights(membership.workspace_id, {
                    days: selectedDays === 0 ? undefined : selectedDays,
                  })
                  .catch(() => null)
              : Promise.resolve(null),
            typeof feedbackRepository.listForms === "function"
              ? feedbackRepository
                  .listForms(membership.workspace_id)
                  .catch(() => [])
              : Promise.resolve([]),
          ]);

        if (!isMounted) return;
        setWorkspace(wsDetails);
        setCategories(categoriesList || []);
        setSubmissions(submissionsPage.items);
        setTotalSubmissions(submissionsPage.total);
        setInsights(insightsData);
        setFormsCount(formsList?.length || 0);

        // Auto-open deep linked submission if idParam is present in URL
        if (idParam) {
          const matched = submissionsPage.items.find((s) => s.id === idParam);
          if (matched) {
            setSelectedSubmission(matched);
            setActiveView("inbox");
          } else if (typeof feedbackRepository.getSubmission === "function") {
            try {
              const fetched = await feedbackRepository.getSubmission(
                membership.workspace_id,
                idParam
              );
              if (fetched && isMounted) {
                setSelectedSubmission(fetched);
                setActiveView("inbox");
              }
            } catch {
              // Ignore if ID is invalid or not found
            }
          }
        }

        isInitialLoaded.current = true;
        setIsLoading(false);
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : "Failed to load feedback inbox";
          toast.error(msg);
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, workspaces, router, setWorkspaces, selectedDays, idParam]);

  // Respond to dynamic URL param changes for deep-linked triage drawer
  useEffect(() => {
    if (!idParam || !workspace || !isInitialLoaded.current) return;
    if (selectedSubmission?.id === idParam) return;

    const existing = submissions.find((s) => s.id === idParam);
    if (existing) {
      setSelectedSubmission(existing);
      setActiveView("inbox");
    } else if (typeof feedbackRepository.getSubmission === "function") {
      feedbackRepository
        .getSubmission(workspace.id, idParam)
        .then((fetched) => {
          if (fetched) {
            setSelectedSubmission(fetched);
            setActiveView("inbox");
          }
        })
        .catch(() => {});
    }
  }, [idParam, workspace, submissions, selectedSubmission?.id]);

  const handleCloseDrawer = () => {
    setSelectedSubmission(null);
    if (searchParams?.get("id")) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("id");
      const nextQuery = nextParams.toString();
      router.replace(
        nextQuery
          ? `/workspace/${workspaceSlug}?${nextQuery}`
          : `/workspace/${workspaceSlug}`,
        { scroll: false }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#4249C9]" />
          <p className="text-[14px] text-[#556070] dark:text-[#8E8E93]">
            Loading feedback inbox…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      {/* Header with Title and Unified Page Controls */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-text">
              {activeView === "insights" ? "Insights" : "Inbox"}
            </h1>
            {/* Quiet Segmented Control [spec] */}
            <div className="inline-flex h-8 items-center rounded-[8px] bg-subtle p-0.5">
              <button
                type="button"
                onClick={() => setActiveView("insights")}
                className={`h-7 rounded-[6px] px-3 text-[12px] font-medium transition-all ${
                  activeView === "insights"
                    ? "bg-surface text-text shadow-2xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Insights
              </button>
              <button
                type="button"
                onClick={() => setActiveView("inbox")}
                className={`flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium transition-all ${
                  activeView === "inbox"
                    ? "bg-surface text-text shadow-2xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <span>Inbox</span>
                {totalSubmissions > 0 && (
                  <span className="inline-flex items-center rounded-full bg-action-subtle px-1.5 py-0.2 text-[10px] font-semibold tabular-nums text-action-subtle-fg">
                    {totalSubmissions}
                  </span>
                )}
              </button>
            </div>
          </div>
          <p className="mt-1 text-[13px] text-text-muted">
            {activeView === "insights"
              ? "How customers rate you, and what's moving the score."
              : "Live incoming customer feedback submitted via widgets and hosted links."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Top-Level Date Range Segmented Control (32px / h-8) */}
          <div className="flex h-8 items-center rounded-[8px] border border-border bg-surface p-0.5 shadow-2xs">
            {TIMEFRAME_OPTIONS.map((opt) => {
              const isActive = String(selectedDays) === String(opt.value);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleDaysChange(opt.value)}
                  className={`h-7 rounded-[6px] px-2.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-action text-white shadow-2xs"
                      : "text-text-muted hover:bg-hover hover:text-text"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Primary Action Button: Share Form */}
          <Link
            href={`/workspace/${workspaceSlug}/forms`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-action px-3 text-[12px] font-medium text-white shadow-xs transition-colors hover:bg-action-hover active:scale-[0.98]"
          >
            <Share2 className="size-3.5" />
            <span>Share form</span>
          </Link>
        </div>
      </div>

      {/* Onboarding Setup Guide */}
      <WorkspaceOnboardingChecklist
        workspaceSlug={workspaceSlug}
        categoriesCount={categories.length}
        formsCount={formsCount}
        submissionsCount={totalSubmissions}
        hasSampleData={Boolean(insights?.summary.has_sample_data)}
        isLoadingSampleData={isLoadingSampleData}
        onLoadSampleData={handleLoadSampleData}
        onClearSampleData={handleClearSampleData}
      />

      {activeView === "insights" ? (
        <WorkspaceInsightsTab
          insights={insights}
          isLoading={isLoadingInsights}
          selectedDays={selectedDays}
          onDaysChange={handleDaysChange}
          onDrillDownCategory={handleDrillDownCategory}
          onDrillDownAtRisk={handleDrillDownAtRisk}
          onLoadSampleData={handleLoadSampleData}
          onClearSampleData={handleClearSampleData}
          isLoadingSampleData={isLoadingSampleData}
          recentSubmissions={submissions}
          onSelectSubmission={setSelectedSubmission}
        />
      ) : (
        /* Submissions Section */
        <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
        {/* Status Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#E1E5EB] bg-[#F7F9FC] px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-[8px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-white text-[#161C26] shadow-2xs dark:bg-white/15 dark:text-white"
                      : "text-[#556070] hover:bg-white/60 hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isFiltering && (
            <div className="flex items-center gap-1 text-[11px] text-[#8E8E93]">
              <Loader2 className="size-3 animate-spin" />
              <span>Updating…</span>
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E5EB] bg-white p-3.5 dark:border-white/10 dark:bg-[#1C1C1E]">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search comments, customer, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] py-1.5 pl-9 pr-8 text-[13px] text-[#161C26] placeholder-[#8E8E93] transition-colors focus:border-[#4249C9] focus:bg-white focus:outline-hidden dark:border-white/10 dark:bg-[#2C2C2E] dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#161C26] dark:hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="size-3.5 text-[#8E8E93]" />
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-[8px] border border-[#E1E5EB] bg-[#F7F9FC] px-2.5 py-1.5 text-[12px] font-medium text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-hidden dark:border-white/10 dark:bg-[#2C2C2E] dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sentiment Dropdown */}
            <select
              aria-label="Filter by sentiment"
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="rounded-[8px] border border-[#E1E5EB] bg-[#F7F9FC] px-2.5 py-1.5 text-[12px] font-medium text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-hidden dark:border-white/10 dark:bg-[#2C2C2E] dark:text-white"
            >
              <option value="all">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setSentimentFilter("all");
                }}
                className="rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium text-[#4249C9] hover:bg-[#F0F2FE] dark:text-[#7B82F6] dark:hover:bg-[#4249C9]/20"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Sample Data Active Notice */}
        {insights?.summary.has_sample_data && (
          <div className="flex flex-col gap-2 border-b border-[#E1E5EB] bg-[#F5F7FF] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#4249C9]/10">
            <div className="flex items-center gap-2 text-[12px] text-[#4249C9] dark:text-[#7B82F6]">
              <Sparkles className="size-3.5 shrink-0" />
              <span>
                <strong>Sample Data Active:</strong> You are triaging demo responses. You can test status updates, overrides, or clear this data.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSampleData}
              disabled={isLoadingSampleData}
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-400"
            >
              <Trash2 className="size-3" />
              <span>Clear Sample Data</span>
            </button>
          </div>
        )}

        {submissions.length === 0 ? (
          hasActiveFilters ? (
            /* Filtered Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
                <Search className="size-6" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#161C26] dark:text-white">
                No matching feedback
              </h3>
              <p className="mt-1 max-w-sm text-[13px] text-[#556070] dark:text-[#8E8E93]">
                Try loosening your search term or clearing status and category filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setSentimentFilter("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-[#4249C9] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6]"
              >
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            /* True Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#F0F2FE] text-[#4249C9] dark:bg-[#4249C9]/20">
                <Inbox className="size-6" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-[#161C26] dark:text-white">
                No feedback submissions yet
              </h3>
              <p className="mt-1 max-w-sm text-[13px] text-[#556070] dark:text-[#8E8E93]">
                Share your form link or install the embed widget on your website to start collecting real-time customer feedback.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  disabled={isLoadingSampleData}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#4249C9] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6] disabled:opacity-50"
                >
                  {isLoadingSampleData ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span>Load Sample Feedback</span>
                </button>
                <Link
                  href={`/workspace/${workspaceSlug}/forms`}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E1E5EB] bg-white px-4 py-2 text-[13px] font-medium text-[#161C26] shadow-2xs transition-colors hover:bg-[#F3F5F9] dark:border-white/10 dark:bg-[#232326] dark:text-white"
                >
                  <span>View Forms & Share</span>
                </Link>
              </div>
            </div>
          )
        ) : (
          /* Submissions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E1E5EB] bg-[#F7F9FC] text-[12px] font-semibold uppercase tracking-wider text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Rating</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Feedback</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5EB] dark:divide-white/10">
                {submissions.map((sub) => {
                  const customerDisplay =
                    sub.customer_name || sub.customer_email || null;
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className="group cursor-pointer transition-colors hover:bg-[#F9FAFC] dark:hover:bg-white/5"
                    >
                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EDF0F5] text-[12px] font-semibold text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                            {sub.customer_name ? (
                              sub.customer_name[0].toUpperCase()
                            ) : sub.customer_email ? (
                              sub.customer_email[0].toUpperCase()
                            ) : (
                              <User className="size-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            {customerDisplay ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <span className="block truncate text-[13px] font-medium text-[#161C26] dark:text-white">
                                    {sub.customer_name || sub.customer_email}
                                  </span>
                                  {Boolean(sub.customer_metadata?.is_sample) && (
                                    <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-semibold text-[#4249C9] dark:bg-[#4249C9]/20 dark:text-[#7B82F6]">
                                      Sample
                                    </span>
                                  )}
                                </div>
                                {sub.customer_name && sub.customer_email && (
                                  <span className="block truncate text-[11px] text-[#8E8E93]">
                                    {sub.customer_email}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[13px] italic text-[#8E8E93]">
                                Anonymous
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRatingBadge(sub.rating, sub.rating_scale_type)}
                      </td>

                      {/* Category & Sentiment */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getSentimentBadge(sub.sentiment)}
                          {sub.category_pill_label && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F5F9] px-2.5 py-0.5 text-[11px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                              <Tag className="size-3" />
                              <span>{sub.category_pill_label}</span>
                            </span>
                          )}
                          {!sub.sentiment && !sub.category_pill_label && (
                            <span className="text-[12px] text-[#8E8E93]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Comment text snippet */}
                      <td className="px-6 py-4 max-w-[340px]">
                        {sub.comment ? (
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-[#161C26] dark:text-[#D1D5DB]">
                            {sub.comment}
                          </p>
                        ) : (
                          <span className="text-[12px] italic text-[#8E8E93]">
                            No written comment
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-[12px] text-[#556070] dark:text-[#8E8E93]">
                        {formatDate(sub.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {getStatusBadge(sub.status || "new")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="flex h-12 items-center justify-between border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 text-[12px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
              <span>
                Showing {submissions.length} of {totalSubmissions}{" "}
                {totalSubmissions === 1 ? "submission" : "submissions"}
              </span>
            </div>
          </div>
        )}
      </section>
      )}

      {/* Submission Detail Drawer */}
      <FeedbackDetailDrawer
        isOpen={Boolean(selectedSubmission)}
        submission={selectedSubmission}
        workspaceId={workspace?.id}
        categories={categories}
        onSelectSubmission={setSelectedSubmission}
        onClose={handleCloseDrawer}
        onStatusChange={handleStatusChange}
        onUpdateSubmission={handleUpdateSubmission}
        isUpdatingStatus={isUpdatingStatus}
      />
    </div>
  );
}
