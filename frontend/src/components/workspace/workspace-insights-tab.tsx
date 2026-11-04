"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Inbox,
  Loader2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type { FeedbackInsightsResponse } from "@/types/feedback";

interface WorkspaceInsightsTabProps {
  insights: FeedbackInsightsResponse | null;
  isLoading: boolean;
  selectedDays: number | string;
  onDaysChange: (days: number | string) => void;
  onDrillDownCategory: (categoryId: string | null) => void;
  onDrillDownAtRisk: () => void;
  onLoadSampleData?: () => Promise<void>;
  onClearSampleData?: () => Promise<void>;
  isLoadingSampleData?: boolean;
}

const TIMEFRAME_OPTIONS: { label: string; value: number | string }[] = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 30 Days", value: 30 },
  { label: "Last 90 Days", value: 90 },
  { label: "All Time", value: 0 },
];

export function WorkspaceInsightsTab({
  insights,
  isLoading,
  selectedDays,
  onDaysChange,
  onDrillDownCategory,
  onDrillDownAtRisk,
  onLoadSampleData,
  onClearSampleData,
  isLoadingSampleData,
}: WorkspaceInsightsTabProps) {
  if (isLoading && !insights) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#4249C9]" />
          <p className="text-[14px] text-[#556070] dark:text-[#8E8E93]">
            Calculating Score Drivers and satisfaction analytics…
          </p>
        </div>
      </div>
    );
  }

  const summary = insights?.summary;
  const categories = insights?.categories || [];
  const totalCount = summary?.total_submissions || 0;

  return (
    <div className="space-y-6">
      {/* Timeframe & Subheader Toolbar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
            Score Drivers & Customer Sentiment
          </h2>
          <p className="text-[13px] text-[#556070] dark:text-[#8E8E93]">
            Deterministic Voice of Customer metrics identifying your highest-friction and highest-praise themes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-[10px] border border-[#E1E5EB] bg-white p-1 shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
          <Calendar className="ml-2 size-3.5 text-[#8E8E93]" />
          <div className="flex items-center gap-1">
            {TIMEFRAME_OPTIONS.map((opt) => {
              const isActive = String(selectedDays) === String(opt.value);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onDaysChange(opt.value)}
                  className={`rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#4249C9] text-white shadow-xs"
                      : "text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sample Data Active Banner */}
      {summary?.has_sample_data && (
        <div className="flex flex-col gap-3 rounded-[12px] border border-[#C7D2FE] bg-[#F5F7FF] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#4249C9]/40 dark:bg-[#4249C9]/10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 shrink-0 text-[#4249C9] dark:text-[#7B82F6]" />
            <div>
              <p className="text-[13px] font-semibold text-[#161C26] dark:text-white">
                Sample Data Active ({totalCount} responses)
              </p>
              <p className="text-[12px] text-[#556070] dark:text-[#8E8E93]">
                You are previewing sample responses to explore score drivers, triage workflows, and category impacts.
              </p>
            </div>
          </div>
          {onClearSampleData && (
            <button
              type="button"
              onClick={onClearSampleData}
              disabled={isLoadingSampleData}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-medium text-rose-700 shadow-2xs transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/30 dark:bg-[#1C1C1E] dark:text-rose-400"
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
        <div className="flex flex-col items-center justify-center rounded-[14px] border border-[#E1E5EB] bg-white p-12 text-center shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#F0F2FE] text-[#4249C9] dark:bg-[#4249C9]/20">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-[#161C26] dark:text-white">
            No feedback collected in this timeframe
          </h3>
          <p className="mt-1 max-w-md text-[13px] text-[#556070] dark:text-[#8E8E93]">
            As customers submit feedback via your embedded widgets and links, Score Driver cards and Category Impact analytics will populate automatically.
          </p>
          {onLoadSampleData && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLoadSampleData}
                disabled={isLoadingSampleData}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#4249C9] px-4 py-2 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] disabled:opacity-50 dark:bg-[#5259DC]"
              >
                {isLoadingSampleData ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>Load Sample Feedback</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Decision Summary Cards (4 Cards Grid) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Overall Satisfaction */}
            <div className="rounded-[14px] border border-[#E1E5EB] bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Overall Satisfaction
                </span>
                <Star className="size-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-[28px] font-bold tracking-tight text-[#161C26] dark:text-white">
                  {summary?.average_rating !== null
                    ? `${summary?.average_rating} ★`
                    : "—"}
                </span>
                <span className="text-[12px] text-[#8E8E93]">
                  from {totalCount} {totalCount === 1 ? "response" : "responses"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[#556070] dark:text-[#8E8E93]">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                <span>{summary?.sentiment_breakdown.positive || 0} Positive</span>
                <span className="text-[#D1D5DB] dark:text-white/20">•</span>
                <span className="inline-block size-1.5 rounded-full bg-rose-500" />
                <span>{summary?.sentiment_breakdown.negative || 0} Negative</span>
              </div>
            </div>

            {/* Card 2: #1 Negative Score Driver */}
            <div className="rounded-[14px] border border-[#E1E5EB] bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Top Negative Driver
                </span>
                <TrendingDown className="size-4 text-rose-500" />
              </div>

              {summary?.top_negative_driver ? (
                <div className="mt-2.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-[17px] font-bold text-[#161C26] dark:text-white">
                      {summary.top_negative_driver.category_name}
                    </span>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                      {summary.top_negative_driver.score_impact} ★ Drag
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#556070] dark:text-[#8E8E93]">
                    Averages {summary.top_negative_driver.average_rating} ★ across{" "}
                    {summary.top_negative_driver.count} responses.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onDrillDownCategory(
                        summary.top_negative_driver?.category_id || null
                      )
                    }
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#4249C9] hover:underline dark:text-[#7B82F6]"
                  >
                    <span>Inspect feedback</span>
                    <ArrowDownRight className="size-3" />
                  </button>
                </div>
              ) : (
                <div className="mt-2.5">
                  <span className="text-[14px] font-semibold text-emerald-700 dark:text-emerald-400">
                    No negative drag detected
                  </span>
                  <p className="mt-1 text-[12px] text-[#8E8E93]">
                    All categories are rating at or above baseline satisfaction.
                  </p>
                </div>
              )}
            </div>

            {/* Card 3: #1 Positive Score Driver */}
            <div className="rounded-[14px] border border-[#E1E5EB] bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Top Positive Driver
                </span>
                <TrendingUp className="size-4 text-emerald-500" />
              </div>

              {summary?.top_positive_driver ? (
                <div className="mt-2.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-[17px] font-bold text-[#161C26] dark:text-white">
                      {summary.top_positive_driver.category_name}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      +{summary.top_positive_driver.score_impact} ★ Boost
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#556070] dark:text-[#8E8E93]">
                    Averages {summary.top_positive_driver.average_rating} ★ across{" "}
                    {summary.top_positive_driver.count} responses.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onDrillDownCategory(
                        summary.top_positive_driver?.category_id || null
                      )
                    }
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#4249C9] hover:underline dark:text-[#7B82F6]"
                  >
                    <span>View customer praise</span>
                    <ArrowUpRight className="size-3" />
                  </button>
                </div>
              ) : (
                <div className="mt-2.5">
                  <span className="text-[14px] font-semibold text-[#556070] dark:text-[#8E8E93]">
                    Balanced feedback
                  </span>
                  <p className="mt-1 text-[12px] text-[#8E8E93]">
                    Scores are uniformly distributed across categories.
                  </p>
                </div>
              )}
            </div>

            {/* Card 4: At-Risk Unresolved Feedback */}
            <div className="rounded-[14px] border border-[#E1E5EB] bg-white p-5 shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  At-Risk Customers
                </span>
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-[28px] font-bold tracking-tight text-[#161C26] dark:text-white">
                  {summary?.at_risk_count || 0}
                </span>
                <span className="text-[12px] text-[#8E8E93]">
                  unresolved issues
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[#556070] dark:text-[#8E8E93]">
                Negative or low ratings needing founder response.
              </p>
              {Boolean(summary?.at_risk_count) && (
                <button
                  type="button"
                  onClick={onDrillDownAtRisk}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-amber-700 hover:underline dark:text-amber-400"
                >
                  <span>Triage at-risk inbox</span>
                  <ArrowDownRight className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Theme Bucket Impact Table */}
          <div className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-2xs dark:border-white/10 dark:bg-[#1C1C1E]">
            <div className="border-b border-[#E1E5EB] bg-[#F7F9FC] px-6 py-4 dark:border-white/10 dark:bg-white/5">
              <h3 className="text-[15px] font-semibold text-[#161C26] dark:text-white">
                Theme Bucket Impact & Net Score Drivers
              </h3>
              <p className="text-[12px] text-[#556070] dark:text-[#8E8E93]">
                Ranked by feedback volume. Click any row to inspect all matching verbatim feedback in the inbox.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E1E5EB] text-[11px] font-semibold uppercase tracking-wider text-[#556070] dark:border-white/10 dark:text-[#8E8E93]">
                    <th className="px-6 py-3">Theme Bucket</th>
                    <th className="px-6 py-3">Volume & Share</th>
                    <th className="px-6 py-3">Avg Rating</th>
                    <th className="px-6 py-3">Score Impact</th>
                    <th className="px-6 py-3">Sentiment Breakdown</th>
                    <th className="px-6 py-3 text-right">Drill Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E5EB] dark:divide-white/10">
                  {categories.map((cat) => {
                    const isPositive = cat.score_impact > 0;
                    const isNegative = cat.score_impact < 0;

                    const posCount = cat.sentiment_counts.positive;
                    const neuCount = cat.sentiment_counts.neutral;
                    const negCount = cat.sentiment_counts.negative;
                    const catTotal = cat.count;

                    return (
                      <tr
                        key={cat.category_id || "uncategorized"}
                        onClick={() => onDrillDownCategory(cat.category_id)}
                        className="group cursor-pointer transition-colors hover:bg-[#F9FAFC] dark:hover:bg-white/5"
                      >
                        {/* Theme Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-[13px] font-semibold text-[#161C26] group-hover:text-[#4249C9] dark:text-white dark:group-hover:text-[#7B82F6]">
                              {cat.category_name}
                            </span>
                          </div>
                        </td>

                        {/* Volume & Share */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[#161C26] dark:text-white">
                              {cat.count}
                            </span>
                            <span className="text-[12px] text-[#8E8E93]">
                              ({cat.percentage}%)
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[#EDF0F5] dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#4249C9] dark:bg-[#7B82F6]"
                              style={{
                                width: `${Math.min(cat.percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Average Rating */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cat.average_rating !== null ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                              <Star className="size-3 fill-amber-500 text-amber-500" />
                              <span>{cat.average_rating} ★</span>
                            </span>
                          ) : (
                            <span className="text-[12px] italic text-[#8E8E93]">
                              No ratings
                            </span>
                          )}
                        </td>

                        {/* Score Impact */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cat.average_rating !== null && summary?.average_rating !== null ? (
                            isNegative ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[12px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                <TrendingDown className="size-3" />
                                <span>{cat.score_impact} ★</span>
                              </span>
                            ) : isPositive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[12px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <TrendingUp className="size-3" />
                                <span>+{cat.score_impact} ★</span>
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
                                0.0 ★ (Baseline)
                              </span>
                            )
                          ) : (
                            <span className="text-[12px] text-[#8E8E93]">—</span>
                          )}
                        </td>

                        {/* Sentiment Split */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {catTotal > 0 ? (
                            <div className="space-y-1">
                              <div className="flex h-2 w-28 overflow-hidden rounded-full bg-[#EDF0F5] dark:bg-white/10">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{
                                    width: `${(posCount / catTotal) * 100}%`,
                                  }}
                                  title={`${posCount} Positive`}
                                />
                                <div
                                  className="h-full bg-slate-400"
                                  style={{
                                    width: `${(neuCount / catTotal) * 100}%`,
                                  }}
                                  title={`${neuCount} Neutral`}
                                />
                                <div
                                  className="h-full bg-rose-500"
                                  style={{
                                    width: `${(negCount / catTotal) * 100}%`,
                                  }}
                                  title={`${negCount} Negative`}
                                />
                              </div>
                              <span className="text-[11px] text-[#8E8E93]">
                                {posCount} pos • {negCount} neg
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#8E8E93]">—</span>
                          )}
                        </td>

                        {/* Action link */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#4249C9] group-hover:underline dark:text-[#7B82F6]">
                            <span>View feedback</span>
                            <ArrowUpRight className="size-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

