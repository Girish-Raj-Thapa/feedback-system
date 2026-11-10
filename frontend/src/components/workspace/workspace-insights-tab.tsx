"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Edit3,
  Inbox,
  Loader2,
  Minus,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { DecisionLogDialog } from "@/components/workspace/decision-log-dialog";
import { feedbackRepository } from "@/repositories/feedback.repository";
import type {
  DecisionLogRead,
  FeedbackCategory,
  FeedbackInsightsResponse,
  FeedbackSubmissionRead,
} from "@/types/feedback";

interface WorkspaceInsightsTabProps {
  workspaceId?: string;
  workspaceCategories?: FeedbackCategory[];
  insights: FeedbackInsightsResponse | null;
  isLoading: boolean;
  selectedDays: number | string;
  onDaysChange: (days: number | string) => void;
  onDrillDownCategory: (categoryId: string | null) => void;
  onDrillDownAtRisk: () => void;
  onLoadSampleData?: () => Promise<void>;
  onClearSampleData?: () => Promise<void>;
  isLoadingSampleData?: boolean;
  recentSubmissions?: FeedbackSubmissionRead[];
  onSelectSubmission?: (sub: FeedbackSubmissionRead) => void;
}

function formatDecisionDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

export function WorkspaceInsightsTab({
  workspaceId,
  workspaceCategories = [],
  insights,
  isLoading,
  onDrillDownCategory,
  onDrillDownAtRisk,
  onLoadSampleData,
  onClearSampleData,
  isLoadingSampleData,
  recentSubmissions = [],
  onSelectSubmission,
}: WorkspaceInsightsTabProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLogRead[]>([]);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(false);
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionLogRead | null>(
    null
  );
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    async function loadDecisionLogs() {
      try {
        setIsLoadingDecisions(true);
        const res = await feedbackRepository.listDecisionLogs(workspaceId!);
        if (res && Array.isArray(res.items)) {
          setDecisionLogs(res.items);
        } else if (Array.isArray(res)) {
          setDecisionLogs(res);
        } else {
          setDecisionLogs([]);
        }
      } catch (err) {
        console.error("Failed to load decision logs:", err);
      } finally {
        setIsLoadingDecisions(false);
      }
    }
    loadDecisionLogs();
  }, [workspaceId]);

  const handleDeleteDecision = async (id: string) => {
    if (!workspaceId) return;
    try {
      setIsDeletingId(id);
      await feedbackRepository.deleteDecisionLog(workspaceId, id);
      setDecisionLogs((prev) => prev.filter((d) => d.id !== id));
      toast.success("Decision milestone removed");
    } catch {
      toast.error("Failed to delete decision log");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDecisionSuccess = (decision: DecisionLogRead) => {
    setDecisionLogs((prev) => {
      const idx = prev.findIndex((d) => d.id === decision.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = decision;
        return next;
      }
      return [decision, ...prev];
    });
  };

  if (isLoading && !insights) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-action" />
          <p className="text-[14px] text-text-muted">
            Calculating score drivers and satisfaction analytics…
          </p>
        </div>
      </div>
    );
  }

  const summary = insights?.summary;
  const categories = insights?.categories || [];
  const totalCount = summary?.total_submissions || 0;

  // Sort categories by absolute score impact descending
  const sortedCategories = [...categories].sort(
    (a, b) => Math.abs(b.score_impact) - Math.abs(a.score_impact)
  );

  const activeCategories = sortedCategories.filter((c) => c.count > 0);
  const inactiveCategories = sortedCategories.filter((c) => c.count === 0);
  const displayedCategories =
    showAllCategories || activeCategories.length === 0
      ? sortedCategories
      : activeCategories;

  // Maximum delta for bar scaling (capped at minimum 1.5 for proportional bars)
  const maxDelta = Math.max(
    1.5,
    ...categories.map((c) => Math.abs(c.score_impact))
  );

  return (
    <div className="space-y-6">
      {/* Sample Data Active Banner */}
      {summary?.has_sample_data && (
        <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-action-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-text">
              Sample data active ({totalCount} responses)
            </p>
            <p className="text-[12px] text-text-muted">
              You are previewing sample responses to explore score drivers, triage workflows, and category impacts.
            </p>
          </div>
          {onClearSampleData && (
            <button
              type="button"
              onClick={onClearSampleData}
              disabled={isLoadingSampleData}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-status-error shadow-2xs transition-colors hover:bg-hover disabled:opacity-50"
            >
              {isLoadingSampleData ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
              <span>Clear Sample Data</span>
            </button>
          )}
        </div>
      )}

      {totalCount === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-border bg-surface p-12 text-center shadow-card">
          <div className="flex size-12 items-center justify-center rounded-full bg-subtle text-text-muted">
            <Inbox className="size-6" />
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-text">
            No feedback collected in this timeframe
          </h3>
          <p className="mt-1 max-w-md text-[13px] text-text-muted">
            As customers submit feedback via your embedded widgets and links, score driver cards and category impact analytics will populate automatically.
          </p>
          {onLoadSampleData && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLoadSampleData}
                disabled={isLoadingSampleData}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-action px-4 py-2 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-action-hover active:scale-[0.98] disabled:opacity-50"
              >
                {isLoadingSampleData && <Loader2 className="size-3.5 animate-spin" />}
                <span>Load Sample Feedback</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Decision Summary Cards (4 Equal Height Cards Grid) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Overall Satisfaction (Hero) */}
            <div className="flex flex-col justify-between rounded-[14px] border border-border bg-surface p-5 shadow-card">
              <div>
                <span className="text-[12px] font-medium text-text-muted">
                  Overall satisfaction
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[32px] font-bold tracking-tight tabular-nums text-text">
                    {summary?.average_rating !== null
                      ? `${summary?.average_rating.toFixed(1)} ★`
                      : "—"}
                  </span>
                  <span className="text-[12px] tabular-nums text-text-muted">
                    from {totalCount} {totalCount === 1 ? "response" : "responses"}
                  </span>
                </div>
              </div>

              {/* Sentiment Dots using --data-lift (Teal) and --data-drag (Plum) */}
              <div className="mt-4 border-t border-border pt-3 flex items-center gap-2 text-[11px] font-medium text-text-muted">
                <span className="inline-block size-2 rounded-full bg-data-lift" />
                <span className="tabular-nums">{summary?.sentiment_breakdown.positive || 0} Positive</span>
                <span className="text-text-subtle">•</span>
                <span className="inline-block size-2 rounded-full bg-data-drag" />
                <span className="tabular-nums">{summary?.sentiment_breakdown.negative || 0} Negative</span>
              </div>
            </div>

            {/* Card 2: Top Negative Driver */}
            <div className="flex flex-col justify-between rounded-[14px] border border-border bg-surface p-5 shadow-card">
              <div>
                <span className="text-[12px] font-medium text-text-muted">
                  Top negative driver
                </span>

                {totalCount < 10 ? (
                  <div className="mt-2.5">
                    <span className="text-[14px] font-medium text-data-neutral">
                      Not enough data yet
                    </span>
                    <p className="mt-1 text-[12px] text-text-muted">
                      Needs 10+ responses
                    </p>
                  </div>
                ) : summary?.top_negative_driver ? (
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="truncate text-[16px] font-bold text-text">
                        {summary.top_negative_driver.category_name}
                      </span>
                      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-data-drag dark:bg-rose-950/40">
                        {summary.top_negative_driver.score_impact.toFixed(1)} ★ Drag
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] tabular-nums text-text-muted">
                      Averages {summary.top_negative_driver.average_rating != null ? summary.top_negative_driver.average_rating.toFixed(1) : "—"} ★ across{" "}
                      {summary.top_negative_driver.count} responses.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2.5">
                    <span className="text-[14px] font-medium text-data-neutral">
                      No negative drag detected
                    </span>
                    <p className="mt-1 text-[12px] text-text-muted">
                      All categories are at or above baseline.
                    </p>
                  </div>
                )}
              </div>

              {Boolean(totalCount >= 10 && summary?.top_negative_driver) && (
                <button
                  type="button"
                  onClick={() =>
                    onDrillDownCategory(
                      summary?.top_negative_driver?.category_id || null
                    )
                  }
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-action hover:underline"
                >
                  <span>Inspect feedback</span>
                  <ArrowDownRight className="size-3" />
                </button>
              )}
            </div>

            {/* Card 3: Top Positive Driver */}
            <div className="flex flex-col justify-between rounded-[14px] border border-border bg-surface p-5 shadow-card">
              <div>
                <span className="text-[12px] font-medium text-text-muted">
                  Top positive driver
                </span>

                {totalCount < 10 ? (
                  <div className="mt-2.5">
                    <span className="text-[14px] font-medium text-data-neutral">
                      Not enough data yet
                    </span>
                    <p className="mt-1 text-[12px] text-text-muted">
                      Needs 10+ responses
                    </p>
                  </div>
                ) : summary?.top_positive_driver ? (
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="truncate text-[16px] font-bold text-text">
                        {summary.top_positive_driver.category_name}
                      </span>
                      <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-data-lift dark:bg-teal-950/40">
                        +{summary.top_positive_driver.score_impact.toFixed(1)} ★ Boost
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] tabular-nums text-text-muted">
                      Averages {summary.top_positive_driver.average_rating != null ? summary.top_positive_driver.average_rating.toFixed(1) : "—"} ★ across{" "}
                      {summary.top_positive_driver.count} responses.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2.5">
                    <span className="text-[14px] font-medium text-data-neutral">
                      Balanced feedback
                    </span>
                    <p className="mt-1 text-[12px] text-text-muted">
                      Scores are uniformly distributed.
                    </p>
                  </div>
                )}
              </div>

              {Boolean(totalCount >= 10 && summary?.top_positive_driver) && (
                <button
                  type="button"
                  onClick={() =>
                    onDrillDownCategory(
                      summary?.top_positive_driver?.category_id || null
                    )
                  }
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-action hover:underline"
                >
                  <span>View customer praise</span>
                  <ArrowUpRight className="size-3" />
                </button>
              )}
            </div>

            {/* Card 4: At-Risk Feedback (Clickable to Inbox) */}
            <div
              onClick={summary?.at_risk_count ? onDrillDownAtRisk : undefined}
              className={`flex flex-col justify-between rounded-[14px] border border-border bg-surface p-5 shadow-card transition-colors ${
                summary?.at_risk_count
                  ? "cursor-pointer hover:border-action/40 hover:bg-hover"
                  : ""
              }`}
            >
              <div>
                <span className="text-[12px] font-medium text-text-muted">
                  At-risk feedback
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[32px] font-bold tracking-tight tabular-nums text-text">
                    {summary?.at_risk_count || 0}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    need a reply
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-text-muted">
                  Negative or low ratings requiring loop-closing.
                </p>
              </div>

              {Boolean(summary?.at_risk_count) && (
                <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-action">
                  <span>Triage at-risk inbox</span>
                  <ArrowDownRight className="size-3" />
                </div>
              )}
            </div>
          </div>

          {/* Main Body Grid: Categories (Left/Center) + Recent Feedback (Right/Bottom) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Categories Impact List (2 Cols on Large) */}
            <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-text">
                    Categories
                  </h3>
                  <p className="text-[12px] text-text-muted">
                    Ranked by absolute score impact. Click any category to filter matching feedback.
                  </p>
                </div>
                <span className="text-[11px] font-medium tabular-nums text-text-muted">
                  {displayedCategories.length} {displayedCategories.length === 1 ? "category" : "categories"}
                </span>
              </div>

              <div className="divide-y divide-border">
                {displayedCategories.map((cat) => {
                  const isPositive = cat.score_impact > 0;
                  const isNegative = cat.score_impact < 0;
                  const isLowVolume = cat.count < 3;

                  // Diverging signed bar dimensions
                  const pct = Math.min(100, (Math.abs(cat.score_impact) / maxDelta) * 100);

                  return (
                    <div
                      key={cat.category_id || "uncategorized"}
                      onClick={() => onDrillDownCategory(cat.category_id)}
                      className="group flex cursor-pointer items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-hover"
                    >
                      {/* Left: Category Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-text group-hover:text-action transition-colors">
                            {cat.category_name}
                          </span>
                          {isLowVolume && (
                            <span className="rounded-[4px] bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                              Low volume
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-text-muted">
                          <span className="tabular-nums font-medium text-text">
                            {cat.count} {cat.count === 1 ? "response" : "responses"}
                          </span>
                          <span>•</span>
                          <span className="tabular-nums font-medium text-text">
                            {cat.average_rating !== null ? `${cat.average_rating.toFixed(1)} ★` : "—"}
                          </span>
                          <span>•</span>
                          <span className="tabular-nums">{cat.percentage}% of total</span>
                        </div>
                      </div>

                      {/* Right: Signed Horizontal Diverging Bar */}
                      <div className="flex shrink-0 items-center gap-3">
                        {!isLowVolume && cat.average_rating !== null ? (
                          <div className="flex items-center gap-2">
                            {/* Center-Zero Diverging Bar (w-36) */}
                            <div className="relative flex h-2.5 w-32 items-center rounded-full bg-subtle">
                              {/* Zero Axis Marker */}
                              <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-border-strong z-10" />

                              {/* Left Bar (Drag / Negative) */}
                              {isNegative && (
                                <div
                                   className="absolute top-0 bottom-0 right-1/2 rounded-l-full bg-data-drag transition-all"
                                  style={{ width: `${pct / 2}%` }}
                                />
                              )}

                              {/* Right Bar (Lift / Positive) */}
                              {isPositive && (
                                <div
                                  className="absolute top-0 bottom-0 left-1/2 rounded-r-full bg-data-lift transition-all"
                                  style={{ width: `${pct / 2}%` }}
                                />
                              )}
                            </div>

                            {/* Signed Text Value */}
                            <span
                              className={`w-14 text-right text-[12px] font-bold tabular-nums ${
                                isNegative
                                  ? "text-data-drag"
                                  : isPositive
                                  ? "text-data-lift"
                                  : "text-text-muted"
                              }`}
                            >
                              {isNegative
                                ? `${cat.score_impact.toFixed(1)} ★`
                                : isPositive
                                ? `+${cat.score_impact.toFixed(1)} ★`
                                : "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="w-14 text-right text-[12px] text-text-muted">
                            —
                          </span>
                        )}

                        <ChevronRight className="size-4 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-action" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inactive Categories Toggle */}
              {inactiveCategories.length > 0 && (
                <div className="border-t border-border bg-canvas px-5 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="text-[12px] font-medium text-action hover:underline"
                  >
                    {showAllCategories
                      ? `Hide ${inactiveCategories.length} inactive categories`
                      : `Show ${inactiveCategories.length} inactive categories`}
                  </button>
                </div>
              )}
            </div>

            {/* Recent Feedback Panel (1 Col on Large) */}
            <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-text">
                    Recent feedback
                  </h3>
                  <p className="text-[12px] text-text-muted">
                    Latest customer words and ratings.
                  </p>
                </div>
              </div>

              {recentSubmissions.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-text-muted">
                  No recent responses in this timeframe.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentSubmissions.slice(0, 5).map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => onSelectSubmission?.(sub)}
                      className="group cursor-pointer p-4 transition-colors hover:bg-hover"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-text">
                          {sub.customer_name || sub.customer_email || "Anonymous customer"}
                        </span>
                        {sub.rating !== null && (
                          <span className="shrink-0 rounded-[6px] bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            {sub.rating} ★
                          </span>
                        )}
                      </div>

                      {sub.comment ? (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-text/90">
                          &ldquo;{sub.comment}&rdquo;
                        </p>
                      ) : (
                        <p className="mt-1 text-[12px] italic text-text-muted">
                          No comment provided
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                        <span className="truncate">
                          {sub.category_pill_label || "Uncategorized"}
                        </span>
                        <span className="shrink-0 group-hover:text-action transition-colors">
                          View details →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ================= DECISION LOG: BEFORE VS. AFTER IMPACT TRACKER ================= */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
        {/* Section Header */}
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-action-subtle text-action">
                <Calendar className="size-4" />
              </div>
              <h3 className="text-[16px] font-bold text-text">
                Decision Milestones & Impact Tracker
              </h3>
            </div>
            <p className="mt-1 text-[13px] text-text-muted">
              Record business decisions, releases, and pricing changes to measure customer sentiment 30 days before vs. after.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingDecision(null);
              setIsDecisionDialogOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-action px-3.5 py-2 text-[13px] font-medium text-white shadow-2xs hover:bg-action/90"
          >
            <Plus className="size-4" />
            <span>Log Decision</span>
          </button>
        </div>

        {/* Content */}
        {isLoadingDecisions ? (
          <div className="flex h-36 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-action" />
          </div>
        ) : (decisionLogs?.length ?? 0) === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[14px] font-medium text-text">
              No decision milestones recorded yet
            </p>
            <p className="mt-1 text-[12px] text-text-muted max-w-md mx-auto">
              Track whether your changes actually solved problems. Log product updates, bug fixes, or pricing tweaks to measure satisfaction before and after.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingDecision(null);
                setIsDecisionDialogOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-text hover:bg-hover"
            >
              <Plus className="size-3.5 text-action" />
              <span>Record your first decision</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {decisionLogs.map((dl) => {
              const impact = dl.impact;
              const isPositive = impact?.status === "positive_impact";
              const isNegative = impact?.status === "negative_impact";
              const isNeutral = impact?.status === "neutral_impact";

              return (
                <div
                  key={dl.id}
                  className="p-5 transition-colors hover:bg-hover/50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: Milestone Meta */}
                    <div className="space-y-1.5 lg:max-w-md">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-0.5 text-[11px] font-semibold text-text">
                          <Calendar className="size-3 text-text-muted" />
                          <span>{formatDecisionDate(dl.decision_date)}</span>
                        </span>

                        {dl.category_name ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${dl.category_color || "#8E8E93"}15`,
                              color: dl.category_color || "#8E8E93",
                            }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  dl.category_color || "#8E8E93",
                              }}
                            />
                            <span>{dl.category_name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                            Workspace-wide
                          </span>
                        )}

                        {/* Status Badge */}
                        {isPositive && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <TrendingUp className="size-3" />
                            <span>Positive Impact</span>
                          </span>
                        )}
                        {isNegative && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <TrendingDown className="size-3" />
                            <span>Negative Impact</span>
                          </span>
                        )}
                        {isNeutral && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-muted">
                            <Minus className="size-3" />
                            <span>Neutral Impact</span>
                          </span>
                        )}
                        {impact?.status === "insufficient_data" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            <span>Awaiting Data</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-[15px] font-bold text-text">
                        {dl.title}
                      </h4>

                      {dl.description && (
                        <p className="text-[13px] leading-relaxed text-text-muted">
                          {dl.description}
                        </p>
                      )}
                    </div>

                    {/* Right: Before vs After 30d Comparison Grid */}
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Before (30d) */}
                      <div className="rounded-[10px] border border-border bg-canvas px-4 py-2.5 text-center min-w-[110px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          30d Before
                        </span>
                        <div className="mt-1 text-[16px] font-extrabold text-text tabular-nums">
                          {impact?.before.average_rating !== null &&
                          impact?.before.average_rating !== undefined
                            ? `${impact.before.average_rating.toFixed(1)} ★`
                            : "—"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-text-muted">
                          {impact?.before.total_submissions ?? 0} notes ·{" "}
                          {impact?.before.negative_percentage !== null &&
                          impact?.before.negative_percentage !== undefined
                            ? `${impact.before.negative_percentage.toFixed(0)}% neg`
                            : "0% neg"}
                        </div>
                      </div>

                      {/* Delta Indicator */}
                      <div className="flex flex-col items-center justify-center">
                        {impact?.score_delta !== null &&
                        impact?.score_delta !== undefined ? (
                          <span
                            className={`text-[15px] font-extrabold tabular-nums flex items-center gap-0.5 ${
                              impact.score_delta > 0
                                ? "text-data-lift"
                                : impact.score_delta < 0
                                ? "text-data-drag"
                                : "text-text-muted"
                            }`}
                          >
                            {impact.score_delta > 0 ? (
                              <ArrowUpRight className="size-4" />
                            ) : impact.score_delta < 0 ? (
                              <ArrowDownRight className="size-4" />
                            ) : null}
                            <span>
                              {impact.score_delta > 0
                                ? `+${impact.score_delta.toFixed(1)}`
                                : impact.score_delta.toFixed(1)}{" "}
                              ★
                            </span>
                          </span>
                        ) : (
                          <span className="text-[13px] text-text-muted">→</span>
                        )}

                        {impact?.complaint_share_delta !== null &&
                          impact?.complaint_share_delta !== undefined && (
                            <span
                              className={`text-[10px] font-semibold tabular-nums ${
                                impact.complaint_share_delta < 0
                                ? "text-data-lift"
                                : impact.complaint_share_delta > 0
                                ? "text-data-drag"
                                : "text-text-muted"
                              }`}
                            >
                              {impact.complaint_share_delta > 0
                                ? `+${impact.complaint_share_delta.toFixed(0)}%`
                                : `${impact.complaint_share_delta.toFixed(0)}%`}{" "}
                              complaints
                            </span>
                          )}
                      </div>

                      {/* After (30d) */}
                      <div className="rounded-[10px] border border-border bg-canvas px-4 py-2.5 text-center min-w-[110px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          30d After
                        </span>
                        <div className="mt-1 text-[16px] font-extrabold text-text tabular-nums">
                          {impact?.after.average_rating !== null &&
                          impact?.after.average_rating !== undefined
                            ? `${impact.after.average_rating.toFixed(1)} ★`
                            : "—"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-text-muted">
                          {impact?.after.total_submissions ?? 0} notes ·{" "}
                          {impact?.after.negative_percentage !== null &&
                          impact?.after.negative_percentage !== undefined
                            ? `${impact.after.negative_percentage.toFixed(0)}% neg`
                            : "0% neg"}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pl-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDecision(dl);
                            setIsDecisionDialogOpen(true);
                          }}
                          className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-hover hover:text-text cursor-pointer"
                          title="Edit Milestone"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDecision(dl.id)}
                          disabled={isDeletingId === dl.id}
                          className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-hover hover:text-status-error disabled:opacity-50 cursor-pointer"
                          title="Delete Milestone"
                        >
                          {isDeletingId === dl.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Log Dialog Modal */}
      {workspaceId && (
        <DecisionLogDialog
          isOpen={isDecisionDialogOpen}
          onClose={() => setIsDecisionDialogOpen(false)}
          workspaceId={workspaceId}
          categories={workspaceCategories}
          existingDecision={editingDecision}
          onSuccess={handleDecisionSuccess}
        />
      )}
    </div>
  );
}

