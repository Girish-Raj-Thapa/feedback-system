"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Calendar,
  CheckCircle,
  ExternalLink,
  Globe,
  HelpCircle,
  History,
  Laptop,
  Loader2,
  Mail,
  RotateCcw,
  Star,
  Tag,
  User,
  X,
} from "lucide-react";

import { feedbackRepository } from "@/repositories/feedback.repository";
import type {
  CustomerHistoryRead,
  FeedbackSubmissionRead,
  SubmissionStatus,
} from "@/types/feedback";

interface FeedbackDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  submission: FeedbackSubmissionRead | null;
  workspaceId?: string;
  onSelectSubmission?: (submission: FeedbackSubmissionRead) => void;
  onStatusChange?: (
    submissionId: string,
    status: SubmissionStatus
  ) => Promise<void> | void;
  isUpdatingStatus?: boolean;
}

export function getStatusBadge(statusStr: string) {
  const s = statusStr.toLowerCase();
  if (s === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        <CheckCircle className="size-3 text-emerald-600 dark:text-emerald-400" />
        <span>Reviewed</span>
      </span>
    );
  }
  if (s === "archived") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-400">
        <Archive className="size-3 text-slate-500 dark:text-slate-400" />
        <span>Archived</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#F0F2FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#363BA6] capitalize dark:bg-[#4249C9]/20 dark:text-[#7B82F6]">
      New
    </span>
  );
}

export function getSentimentBadge(sentiment: string | null) {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  if (s === "positive") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <span>Positive</span>
      </span>
    );
  }
  if (s === "negative") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
        <span className="size-1.5 rounded-full bg-rose-500" />
        <span>Negative</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-400">
      <span className="size-1.5 rounded-full bg-slate-400" />
      <span>Neutral</span>
    </span>
  );
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getRatingBadge(rating: number | null, scaleType: string) {
  if (rating === null || rating === undefined) {
    return <span className="text-[13px] text-[#8E8E93] italic">No rating</span>;
  }

  if (scaleType === "5_star") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`size-5 ${
                rating >= star
                  ? "fill-amber-400 text-amber-400"
                  : "text-[#D1D5DB] dark:text-[#48484A]"
              }`}
            />
          ))}
        </div>
        <span className="ml-1 text-[14px] font-semibold text-[#161C26] dark:text-white">
          {rating} / 5
        </span>
      </div>
    );
  }

  if (scaleType === "5_emoji") {
    const emojiMap: Record<number, { emoji: string; label: string }> = {
      1: { emoji: "😡", label: "Terrible" },
      2: { emoji: "🙁", label: "Poor" },
      3: { emoji: "😐", label: "Okay" },
      4: { emoji: "🙂", label: "Good" },
      5: { emoji: "😍", label: "Amazing" },
    };
    const info = emojiMap[rating] || { emoji: "😐", label: "Okay" };
    return (
      <div className="flex items-center gap-2">
        <span className="text-[24px]">{info.emoji}</span>
        <span className="text-[14px] font-semibold text-[#161C26] dark:text-white">
          {info.label} ({rating}/5)
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center rounded-lg bg-[#4249C9] px-2.5 py-1 text-[14px] font-bold text-white shadow-xs">
        {rating}
      </span>
      <span className="text-[13px] text-[#556070] dark:text-[#8E8E93]">
        out of 10 NPS
      </span>
    </div>
  );
}

export function FeedbackDetailDrawer({
  isOpen,
  onClose,
  submission,
  workspaceId,
  onSelectSubmission,
  onStatusChange,
  isUpdatingStatus = false,
}: FeedbackDetailDrawerProps) {
  const [customerHistory, setCustomerHistory] =
    useState<CustomerHistoryRead | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch customer submission history when email is present
  useEffect(() => {
    let isMounted = true;
    if (isOpen && submission && workspaceId && submission.customer_email) {
      setIsLoadingHistory(true);
      feedbackRepository
        .getCustomerHistory(workspaceId, submission.id)
        .then((res) => {
          if (isMounted) {
            setCustomerHistory(res);
            setIsLoadingHistory(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingHistory(false);
        });
    } else {
      setCustomerHistory(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, submission?.id, submission?.customer_email, workspaceId]);

  if (!isOpen || !submission) return null;

  const metadata = submission.customer_metadata || {};
  const customAnswers = submission.custom_answers || {};
  const hasCustomAnswers = Object.keys(customAnswers).length > 0;
  const customerDisplay =
    submission.customer_name || submission.customer_email || "Anonymous";

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Slide-out Drawer */}
      <aside
        aria-label="Feedback submission details"
        role="dialog"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col border-l border-[#E1E5EB] bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-white/10 dark:bg-[#1C1C1E]"
      >
        {/* Top Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E1E5EB] px-6 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold text-[#161C26] dark:text-white">
              Submission Details
            </h2>
            <p className="truncate text-[12px] text-[#556070] dark:text-[#8E8E93]">
              ID: <span className="font-mono">{submission.id.slice(0, 8)}…</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details drawer"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Customer Profile Card */}
          <div className="flex items-center gap-3 rounded-[12px] border border-[#E1E5EB] bg-[#F7F9FC] p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#4249C9] text-[15px] font-semibold text-white">
              {submission.customer_name ? (
                submission.customer_name[0].toUpperCase()
              ) : submission.customer_email ? (
                submission.customer_email[0].toUpperCase()
              ) : (
                <User className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-[#161C26] dark:text-white">
                {customerDisplay}
              </span>
              {submission.customer_email && (
                <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#556070] dark:text-[#8E8E93]">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{submission.customer_email}</span>
                </div>
              )}
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8E8E93]">
                <Calendar className="size-3 shrink-0" />
                <span>{formatDateFull(submission.created_at)}</span>
              </div>
            </div>
            <div className="shrink-0">
              {getStatusBadge(submission.status || "new")}
            </div>
          </div>

          {/* Customer History & Journey */}
          {submission.customer_email && (
            <div className="rounded-[12px] border border-[#E1E5EB] bg-[#F7F9FC] p-4 text-[12px] dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[#161C26] dark:text-white">
                  <History className="size-3.5 text-[#4249C9] dark:text-[#7B82F6]" />
                  <span>Customer Activity</span>
                </div>
                {isLoadingHistory ? (
                  <span className="flex items-center gap-1 text-[11px] text-[#8E8E93]">
                    <Loader2 className="size-3 animate-spin" /> Loading…
                  </span>
                ) : customerHistory ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#556070] shadow-2xs dark:bg-white/10 dark:text-[#8E8E93]">
                    {customerHistory.total_submissions}{" "}
                    {customerHistory.total_submissions === 1
                      ? "submission"
                      : "submissions"}
                    {customerHistory.avg_rating !== null &&
                      ` • Avg ${customerHistory.avg_rating} ★`}
                  </span>
                ) : null}
              </div>

              {!isLoadingHistory &&
                customerHistory &&
                customerHistory.total_submissions > 1 && (
                  <div className="mt-3 space-y-2 border-t border-[#E1E5EB] pt-3 dark:border-white/10">
                    <span className="text-[11px] font-medium text-[#8E8E93]">
                      All submissions from this customer:
                    </span>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto">
                      {customerHistory.submissions.map((sub) => {
                        const isCurrent = sub.id === submission.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => onSelectSubmission?.(sub)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                              isCurrent
                                ? "bg-white font-semibold text-[#4249C9] shadow-2xs dark:bg-white/10 dark:text-[#7B82F6]"
                                : "text-[#556070] hover:bg-white/70 dark:text-[#8E8E93] dark:hover:bg-white/5 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span>
                                {sub.rating !== null
                                  ? `${sub.rating}★`
                                  : "No rating"}
                              </span>
                              <span className="truncate">
                                {sub.comment || "(No written comment)"}
                              </span>
                            </div>
                            <span className="shrink-0 text-[11px] text-[#8E8E93]">
                              {isCurrent
                                ? "Current"
                                : formatDateFull(sub.created_at)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Rating & Category Section */}
          <div className="space-y-3">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Customer Rating & Area
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E1E5EB] p-4 dark:border-white/10">
              <div>{getRatingBadge(submission.rating, submission.rating_scale_type)}</div>

              <div className="flex flex-wrap items-center gap-2">
                {getSentimentBadge(submission.sentiment)}
                {submission.category_pill_label && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F5F9] px-3 py-1 text-[12px] font-medium text-[#161C26] dark:bg-white/10 dark:text-white">
                    <Tag className="size-3 text-[#4249C9] dark:text-[#7B82F6]" />
                    <span>{submission.category_pill_label}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Verbatim Feedback Comment */}
          <div className="space-y-2">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Verbatim Feedback
            </label>
            <div className="rounded-[12px] border border-[#E1E5EB] bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-white/5">
              {submission.comment ? (
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#161C26] dark:text-slate-200">
                  {submission.comment}
                </p>
              ) : (
                <p className="text-[13px] italic text-[#8E8E93]">
                  No written comment was provided with this submission.
                </p>
              )}
            </div>
          </div>

          {/* Custom Questions & Answers */}
          {hasCustomAnswers && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="size-3.5 text-[#4249C9] dark:text-[#7B82F6]" />
                <label className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                  Custom Questions & Responses
                </label>
              </div>
              <div className="space-y-2.5 rounded-[12px] border border-[#E1E5EB] p-4 dark:border-white/10">
                {Object.entries(customAnswers).map(([qKey, answer]) => (
                  <div key={qKey} className="space-y-1">
                    <span className="text-[12px] font-medium text-[#556070] dark:text-[#8E8E93]">
                      Question ({qKey}):
                    </span>
                    <p className="text-[13px] font-semibold text-[#161C26] dark:text-white">
                      {Array.isArray(answer)
                        ? answer.join(", ")
                        : typeof answer === "boolean"
                        ? answer
                          ? "Yes"
                          : "No"
                        : String(answer)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Context & Technical Metadata */}
          <div className="space-y-3">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E93]">
              Technical Context
            </label>
            <div className="space-y-3 rounded-[12px] border border-[#E1E5EB] bg-[#F7F9FC] p-4 text-[12px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
              {metadata.page_url && (
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 size-3.5 shrink-0 text-[#8E8E93]" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-medium text-[#161C26] dark:text-white">
                      Source Page URL
                    </span>
                    <a
                      href={metadata.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-[#4249C9] hover:underline dark:text-[#7B82F6]"
                    >
                      <span className="truncate">{metadata.page_url}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}

              {metadata.referrer && (
                <div className="flex items-start gap-2 border-t border-[#E1E5EB] pt-2.5 dark:border-white/10">
                  <Globe className="mt-0.5 size-3.5 shrink-0 text-[#8E8E93]" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-medium text-[#161C26] dark:text-white">
                      Referrer
                    </span>
                    <span className="break-all">{metadata.referrer}</span>
                  </div>
                </div>
              )}

              {metadata.user_agent && (
                <div className="flex items-start gap-2 border-t border-[#E1E5EB] pt-2.5 dark:border-white/10">
                  <Laptop className="mt-0.5 size-3.5 shrink-0 text-[#8E8E93]" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-medium text-[#161C26] dark:text-white">
                      Client User Agent
                    </span>
                    <span className="break-all font-mono text-[11px] leading-relaxed">
                      {metadata.user_agent}
                    </span>
                  </div>
                </div>
              )}

              {!metadata.page_url && !metadata.referrer && !metadata.user_agent && (
                <p className="italic text-[#8E8E93]">
                  No browser or device metadata was attached to this submission.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Triage Actions */}
        <div className="flex h-16 shrink-0 items-center justify-between border-t border-[#E1E5EB] bg-[#F7F9FC] px-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2">
            {submission.status !== "reviewed" && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange?.(submission.id, "reviewed")}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#4249C9] px-3.5 py-2 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-[#363BA6] disabled:opacity-50 dark:bg-[#4249C9] dark:hover:bg-[#363BA6]"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="size-3.5" />
                )}
                <span>Mark Reviewed</span>
              </button>
            )}

            {submission.status !== "archived" && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange?.(submission.id, "archived")}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E1E5EB] bg-white px-3 py-2 text-[13px] font-medium text-[#556070] transition-colors hover:bg-[#F3F5F9] hover:text-[#161C26] disabled:opacity-50 dark:border-white/10 dark:bg-[#2C2C2E] dark:text-[#8E8E93] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Archive className="size-3.5" />
                <span>Archive</span>
              </button>
            )}

            {submission.status !== "new" && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => onStatusChange?.(submission.id, "new")}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E1E5EB] bg-white px-3 py-2 text-[13px] font-medium text-[#556070] transition-colors hover:bg-[#F3F5F9] hover:text-[#161C26] disabled:opacity-50 dark:border-white/10 dark:bg-[#2C2C2E] dark:text-[#8E8E93] dark:hover:bg-white/10 dark:hover:text-white"
              >
                <RotateCcw className="size-3.5" />
                <span>Reopen</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[#E1E5EB] bg-white px-3.5 py-2 text-[13px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white dark:hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

