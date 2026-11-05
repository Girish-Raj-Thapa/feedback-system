"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Tag,
  Trash2,
  X,
} from "lucide-react";

interface WorkspaceOnboardingChecklistProps {
  workspaceSlug: string;
  categoriesCount: number;
  formsCount: number;
  submissionsCount: number;
  hasSampleData: boolean;
  isLoadingSampleData: boolean;
  onLoadSampleData: () => Promise<void>;
  onClearSampleData: () => Promise<void>;
}

export function WorkspaceOnboardingChecklist({
  workspaceSlug,
  categoriesCount,
  formsCount,
  submissionsCount,
  hasSampleData,
  isLoadingSampleData,
  onLoadSampleData,
  onClearSampleData,
}: WorkspaceOnboardingChecklistProps) {
  const [isLocallyDismissed, setIsLocallyDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isStoredDismissed = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(`voc_onboarding_dismissed_${workspaceSlug}`) === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const isDismissed = isLocallyDismissed || isStoredDismissed;

  const handleDismiss = () => {
    setIsLocallyDismissed(true);
    try {
      localStorage.setItem(`voc_onboarding_dismissed_${workspaceSlug}`, "true");
    } catch {
      // Storage unavailable
    }
  };

  if (isDismissed) return null;

  // Compute completed steps
  const step1Complete = categoriesCount > 0;
  const step2Complete = formsCount > 0;
  const step3Complete = submissionsCount > 0 || hasSampleData;
  const completedCount = [step1Complete, step2Complete, step3Complete].filter(Boolean).length;
  const progressPct = Math.round((completedCount / 3) * 100);

  // Auto-collapse when completed with real data if user hasn't explicitly expanded
  const isFinished = completedCount === 3 && !hasSampleData;

  if (isFinished && isCollapsed) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[12px] text-text-muted shadow-2xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-data-lift" />
          <span className="font-medium text-text">Getting started checklist complete (3 of 3)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-[12px] font-medium text-action hover:underline"
          >
            Show details
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            className="p-1 text-text-muted hover:text-text"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Workspace Onboarding Checklist"
      className="relative mb-6 overflow-hidden rounded-[14px] border border-border bg-surface p-4 shadow-card"
    >
      {/* Header with Title, Progress, and Dismiss */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-action-subtle text-action-subtle-fg">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-text">
              Getting Started Checklist
            </h2>
            <p className="text-[12px] text-text-muted">
              Set up your categories, share a form, and preview decision insights.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full bg-action transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-text-muted">
              {completedCount} of 3
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* 3 Step Action Grid */}
      <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Step 1: Categories */}
        <div className="flex flex-col justify-between rounded-[10px] border border-border bg-canvas p-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <Tag className="size-3 text-action" />
                <span>Categories</span>
              </span>
              {step1Complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-text">
                  <CheckCircle2 className="size-3 text-data-lift" />
                  {categoriesCount} Categories
                </span>
              ) : (
                <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  Needs setup
                </span>
              )}
            </div>
            <h3 className="mt-2 text-[13px] font-semibold text-text">
              Review categories
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Set up categories so feedback is classified accurately.
            </p>
          </div>

          <Link
            href={`/workspace/${workspaceSlug}/settings?tab=categories`}
            className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-action hover:underline"
          >
            <span>Configure categories</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {/* Step 2: Forms */}
        <div className="flex flex-col justify-between rounded-[10px] border border-border bg-canvas p-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <FileText className="size-3 text-action" />
                <span>Forms</span>
              </span>
              {step2Complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-text">
                  <CheckCircle2 className="size-3 text-data-lift" />
                  {formsCount} {formsCount === 1 ? "Form" : "Forms"}
                </span>
              ) : (
                <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  Needs setup
                </span>
              )}
            </div>
            <h3 className="mt-2 text-[13px] font-semibold text-text">
              Share your form
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Share your form link or embed the widget to collect thoughts.
            </p>
          </div>

          <Link
            href={`/workspace/${workspaceSlug}/forms`}
            className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-action hover:underline"
          >
            <span>Open Form Studio</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {/* Step 3: Sample Feedback / Explore Insights */}
        <div className="flex flex-col justify-between rounded-[10px] border border-border bg-canvas p-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                <BarChart3 className="size-3 text-action" />
                <span>Responses</span>
              </span>
              {hasSampleData ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-action-subtle px-2 py-0.5 text-[10px] font-medium text-action-subtle-fg">
                  Sample Active
                </span>
              ) : step3Complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-text">
                  <CheckCircle2 className="size-3 text-data-lift" />
                  Live Feedback
                </span>
              ) : (
                <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium tabular-nums text-text-muted">
                  0 responses
                </span>
              )}
            </div>
            <h3 className="mt-2 text-[13px] font-semibold text-text">
              Preview decision insights
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Load sample responses to explore score drivers and triage workflows.
            </p>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            {hasSampleData ? (
              <button
                type="button"
                onClick={onClearSampleData}
                disabled={isLoadingSampleData}
                className="inline-flex items-center gap-1 rounded-[6px] border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-status-error transition-colors hover:bg-hover disabled:opacity-50"
              >
                {isLoadingSampleData ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
                <span>Clear Sample Data</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLoadSampleData}
                disabled={isLoadingSampleData}
                className="inline-flex items-center gap-1 rounded-[6px] bg-action px-2.5 py-1 text-[11px] font-medium text-white shadow-2xs transition-colors hover:bg-action-hover active:scale-[0.98] disabled:opacity-50"
              >
                {isLoadingSampleData && <Loader2 className="size-3 animate-spin" />}
                <span>Load Sample Feedback</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

