"use client";

import { useEffect, useState } from "react";
import { Calendar, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { feedbackRepository } from "@/repositories/feedback.repository";
import type {
  DecisionLogCreate,
  DecisionLogRead,
  DecisionLogUpdate,
  FeedbackCategory,
} from "@/types/feedback";

interface DecisionLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  categories: FeedbackCategory[];
  existingDecision?: DecisionLogRead | null;
  onSuccess: (decision: DecisionLogRead) => void;
}

export function DecisionLogDialog({
  isOpen,
  onClose,
  workspaceId,
  categories,
  existingDecision,
  onSuccess,
}: DecisionLogDialogProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [decisionDate, setDecisionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingDecision) {
      setTitle(existingDecision.title);
      setCategoryId(existingDecision.category_id || "");
      setDecisionDate(existingDecision.decision_date);
      setDescription(existingDecision.description || "");
    } else {
      setTitle("");
      setCategoryId("");
      setDecisionDate(new Date().toISOString().split("T")[0]);
      setDescription("");
    }
    setErrors({});
  }, [existingDecision, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Decision title is required.";
    }
    if (!decisionDate) {
      newErrors.decisionDate = "Milestone date is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      if (existingDecision) {
        const payload: DecisionLogUpdate = {
          title: title.trim(),
          category_id: categoryId ? categoryId : null,
          decision_date: decisionDate,
          description: description.trim() || null,
        };
        const updated = await feedbackRepository.updateDecisionLog(
          workspaceId,
          existingDecision.id,
          payload
        );
        toast.success("Decision milestone updated successfully");
        onSuccess(updated);
      } else {
        const payload: DecisionLogCreate = {
          title: title.trim(),
          category_id: categoryId ? categoryId : null,
          decision_date: decisionDate,
          description: description.trim() || null,
        };
        const created = await feedbackRepository.createDecisionLog(
          workspaceId,
          payload
        );
        toast.success("Decision milestone recorded successfully");
        onSuccess(created);
      }
      onClose();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Failed to save decision milestone"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-[14px] border border-border bg-surface p-6 shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-action-subtle text-action">
              <Calendar className="size-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-text">
                {existingDecision ? "Edit Decision Milestone" : "Log Business Milestone"}
              </h2>
              <p className="text-[13px] text-text-muted">
                Track how this change impacts customer ratings 30 days before vs. after.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-hover hover:text-text"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[13px] font-semibold text-text">
              Milestone Title <span className="text-status-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Redesigned pricing page & added quarterly billing"
              className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-canvas px-3 text-[13px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
            />
            {errors.title && (
              <p className="mt-1 text-[12px] text-status-error">{errors.title}</p>
            )}
          </div>

          {/* Category Picker & Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[13px] font-semibold text-text">
                Linked Theme Bucket
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-canvas px-3 text-[13px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
              >
                <option value="">Workspace-wide (All feedback)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-text-muted">
                Measures ratings specific to this theme.
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-text">
                Milestone Date <span className="text-status-error">*</span>
              </label>
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-canvas px-3 text-[13px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
              />
              {errors.decisionDate && (
                <p className="mt-1 text-[12px] text-status-error">
                  {errors.decisionDate}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-semibold text-text">
              Context & Notes <span className="text-[12px] font-normal text-text-muted">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What problem were you solving? What was the hypothesis?"
              className="mt-1.5 w-full rounded-[8px] border border-border bg-canvas p-3 text-[13px] text-text outline-none focus:border-action focus:ring-1 focus:ring-action"
            />
          </div>

          {/* Educational Note */}
          <div className="flex items-start gap-2.5 rounded-[10px] bg-action-subtle p-3 text-[12px] text-text/80">
            <Sparkles className="size-4 shrink-0 text-action mt-0.5" />
            <p className="leading-relaxed">
              The engine automatically analyzes feedback received <strong>30 days before</strong> vs. <strong>30 days after</strong> this milestone to determine net rating lift and complaint reduction.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 rounded-[8px] border border-border bg-surface px-4 text-[13px] font-medium text-text hover:bg-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-action px-4 text-[13px] font-medium text-white shadow-2xs hover:bg-action/90 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{existingDecision ? "Save Changes" : "Record Milestone"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
