"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
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
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`voc_onboarding_dismissed_${workspaceSlug}`);
      if (stored === "true") {
        setIsDismissed(true);
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, [workspaceSlug]);

  const handleDismiss = () => {
    setIsDismissed(true);
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

  return (
    <div
      role="region"
      aria-label="Workspace Onboarding Checklist"
      className="relative mb-6 overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-gradient-to-b from-[#F9FAFC] to-white p-5 shadow-2xs dark:border-white/10 dark:from-[#1E1E22] dark:to-[#171719]"
    >
      {/* Header with Title, Progress, and Dismiss */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#4249C9]/10 text-[#4249C9] dark:bg-[#4249C9]/20 dark:text-[#7B82F6]">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#161C26] dark:text-white">
              Getting Started Checklist
            </h2>
            <p className="text-[12px] text-[#556070] dark:text-[#8E8E93]">
              Complete these steps to turn incoming customer feedback into high-leverage product decisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-white/10">
              <div
                className="h-full bg-[#4249C9] transition-all duration-300 dark:bg-[#7B82F6]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-[#556070] dark:text-[#8E8E93]">
              {completedCount} of 3
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            className="rounded-md p-1 text-[#8E8E93] transition-colors hover:bg-black/5 hover:text-[#161C26] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* 3 Step Action Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Step 1: Categories */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E1E5EB] bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-[#232326]">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#556070] dark:text-[#8E8E93]">
                <Tag className="size-3.5 text-[#4249C9] dark:text-[#7B82F6]" />
                Step 1
              </span>
              {step1Complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  {categoriesCount} Categories
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Setup needed
                </span>
              )}
            </div>
            <h3 className="mt-2 text-[13px] font-semibold text-[#161C26] dark:text-white">
              Review Theme Buckets
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
              Customize categories and keywords so feedback auto-tags correctly.
            </p>
          </div>

          <Link
            href={`/workspace/${workspaceSlug}/settings?tab=categories`}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#4249C9] hover:underline dark:text-[#7B82F6]"
          >
            <span>Configure Categories</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {/* Step 2: Forms */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E1E5EB] bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-[#232326]">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#556070] dark:text-[#8E8E93]">
                <FileText className="size-3.5 text-[#4249C9] dark:text-[#7B82F6]" />
                Step 2
              </span>
              {step2Complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  {formsCount} {formsCount === 1 ? "Form" : "Forms"}
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Setup needed
                </span>
              )}
            </div>
            <h3 className="mt-2 text-[13px] font-semibold text-[#161C26] dark:text-white">
              Launch Form or Widget
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
              Share your hosted form link or embed the 4KB feedback widget.
            </p>
          </div>

          <Link
            href={`/workspace/${workspaceSlug}/forms`}
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#4249C9] hover:underline dark:text-[#7B82F6]"
          >
            <span>Open Form Studio</span>
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {/* Step 3: Sample Feedback / Explore Insights */}
        <div className="flex flex-col justify-between rounded-[10px] border border-[#E1E5EB] bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-[#232326]">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#556070] dark:text-[#8E8E93]">
                <BarChart3 className="size-3.5 text-[#4249C9] dark:text-[#7B82F6]" />
                Step 3
              </span>
              {hasSampleData ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-[#4249C9] dark:bg-[#4249C9]/20 dark:text-[#7B82F6]">
                  Sample Active
                </span>
              ) : step3Complete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Live Feedback
                </span>
              ) : (
                <span className="rounded-full bg-[#EDF0F5] px-2 py-0.5 text-[10px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                  0 responses
                </span>
              )}
            </div>
            <h3 className="mt-2 text-[13px] font-semibold text-[#161C26] dark:text-white">
              Preview Decision Insights
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
              Load 6 sample responses to preview Score Drivers and triage workflows immediately.
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {hasSampleData ? (
              <button
                type="button"
                onClick={onClearSampleData}
                disabled={isLoadingSampleData}
                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400"
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
                className="inline-flex items-center gap-1 rounded-md bg-[#4249C9] px-2.5 py-1 text-[11px] font-medium text-white shadow-2xs transition-colors hover:bg-[#363BA6] disabled:opacity-50 dark:bg-[#5259DC]"
              >
                {isLoadingSampleData ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                <span>Load Sample Feedback</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

