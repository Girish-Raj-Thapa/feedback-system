"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Inbox,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Tag,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import {
  FeedbackDetailDrawer,
  getSentimentBadge,
  getStatusBadge,
} from "@/components/workspace/feedback-detail-drawer";
import { useWorkspaceStore } from "@/store/workspace.store";
import type { WorkspaceRead } from "@/types/auth";
import type {
  FeedbackSubmissionRead,
  SubmissionStatus,
} from "@/types/feedback";

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
  const workspaceSlug = params?.workspaceSlug as string;

  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceRead | null>(null);
  const [submissions, setSubmissions] = useState<FeedbackSubmissionRead[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [selectedSubmission, setSelectedSubmission] =
    useState<FeedbackSubmissionRead | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStatusChange = async (
    submissionId: string,
    newStatus: SubmissionStatus
  ) => {
    if (!workspace) return;
    try {
      setIsUpdatingStatus(true);
      const updated = await feedbackRepository.updateSubmission(
        workspace.id,
        submissionId,
        { status: newStatus }
      );
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? updated : s))
      );
      setSelectedSubmission((prev) =>
        prev && prev.id === submissionId ? updated : prev
      );
      const statusLabel =
        newStatus === "reviewed"
          ? "marked as reviewed"
          : newStatus === "archived"
          ? "archived"
          : "reopened";
      toast.success(`Submission ${statusLabel}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update submission status";
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
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
          router.replace("/dashboard/workspaces");
          return;
        }

        const [wsDetails, submissionsPage] = await Promise.all([
          authRepository.getWorkspace(membership.workspace_id),
          feedbackRepository.listSubmissions(membership.workspace_id, {
            limit: 50,
            offset: 0,
          }),
        ]);

        if (!isMounted) return;
        setWorkspace(wsDetails);
        setSubmissions(submissionsPage.items);
        setTotalSubmissions(submissionsPage.total);
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
  }, [workspaceSlug, workspaces, router, setWorkspaces]);

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
    <div className="mx-auto w-full max-w-[1020px] pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-[#161C26] dark:text-white">
              Feedback Inbox
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#F0F2FE] px-2.5 py-0.5 text-[12px] font-semibold text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#7B82F6]">
              {totalSubmissions}
            </span>
          </div>
          <p className="mt-0.5 text-[14px] text-[#556070] dark:text-[#8E8E93]">
            Live incoming customer feedback submitted via widgets and hosted links.
          </p>
        </div>

        <Link
          href={`/workspace/${workspaceSlug}/forms`}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E1E5EB] bg-white px-3.5 py-2 text-[13px] font-medium text-[#161C26] shadow-xs transition-colors hover:bg-[#F3F5F9] dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white dark:hover:bg-white/10"
        >
          <Sparkles className="size-3.5 text-[#4249C9] dark:text-[#7B82F6]" />
          <span>Forms & Widgets</span>
        </Link>
      </div>

      {/* Submissions Section */}
      <section className="overflow-hidden rounded-[14px] border border-[#E1E5EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#1C1C1E]">
        {submissions.length === 0 ? (
          /* Empty State */
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
            <Link
              href={`/workspace/${workspaceSlug}/forms`}
              className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6]"
            >
              <span>View Forms & Share</span>
            </Link>
          </div>
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
                                <span className="block truncate text-[13px] font-medium text-[#161C26] dark:text-white">
                                  {sub.customer_name || sub.customer_email}
                                </span>
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

      {/* Submission Detail Drawer */}
      <FeedbackDetailDrawer
        isOpen={Boolean(selectedSubmission)}
        submission={selectedSubmission}
        workspaceId={workspace?.id}
        onSelectSubmission={setSelectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={isUpdatingStatus}
      />
    </div>
  );
}
