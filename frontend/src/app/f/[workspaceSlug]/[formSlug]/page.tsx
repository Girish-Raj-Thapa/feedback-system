"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";

import { feedbackRepository } from "@/repositories/feedback.repository";
import type {
  FeedbackOutcomeResponse,
  FeedbackSubmissionCreate,
  PublicFeedbackForm,
} from "@/types/feedback";

const EMOJI_SCALE = [
  { value: 1, emoji: "😡", label: "Terrible" },
  { value: 2, emoji: "🙁", label: "Poor" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😍", label: "Amazing" },
];

export default function PublicFormPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;
  const formSlug = params?.formSlug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<PublicFeedbackForm | null>(null);

  // Form State
  const [rating, setRating] = useState<number | null>(null);
  const [selectedPills, setSelectedPills] = useState<string[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});
  const [openComment, setOpenComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");

  // Submission / Outcome State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionOutcome, setSubmissionOutcome] =
    useState<FeedbackOutcomeResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchForm() {
      if (!workspaceSlug || !formSlug) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await feedbackRepository.getPublicForm(workspaceSlug, formSlug);
        setForm(data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } }; message?: string };
        setErrorMessage(
          error.response?.data?.detail ||
            "This feedback form is not currently available or has been paused."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchForm();
  }, [workspaceSlug, formSlug]);

  const togglePill = (label: string) => {
    setSelectedPills((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
    );
  };

  const handleSingleChoice = (questionId: string, option: string) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleMultiChoice = (questionId: string, option: string) => {
    setCustomAnswers((prev) => {
      const current = Array.isArray(prev[questionId])
        ? (prev[questionId] as string[])
        : [];
      const updated = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return {
        ...prev,
        [questionId]: updated,
      };
    });
  };

  const handleCustomText = (questionId: string, text: string) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const errors: Record<string, string> = {};

    // Validate Rating
    if (form.rating_required && rating === null) {
      errors.rating = "Please select a rating.";
    }

    // Validate Contact Field
    if (form.contact_field_mode === "required" && !contactEmail.trim()) {
      errors.contact = "Email address is required.";
    }

    // Validate Custom Questions
    form.custom_questions?.forEach((q) => {
      if (q.required) {
        const val = customAnswers[q.id];
        if (
          val === undefined ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          errors[q.id] = "This question is required.";
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const pillLabel = selectedPills.length > 0 ? selectedPills[0] : null;

      const submissionPayload: FeedbackSubmissionCreate = {
        rating: rating,
        category_pill_label: pillLabel,
        comment: openComment.trim() || null,
        custom_answers: customAnswers,
        customer_email: contactEmail.trim() || null,
        customer_name: contactName.trim() || null,
        customer_metadata: {
          page_url: typeof window !== "undefined" ? window.location.href : null,
          referrer: typeof document !== "undefined" ? document.referrer : null,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
      };

      const res = await feedbackRepository.submitFeedback(
        workspaceSlug,
        formSlug,
        submissionPayload
      );

      setSubmissionOutcome(res.outcome);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setSubmitError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to submit feedback. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFC] p-4 dark:bg-[#0E131B]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#4249C9] dark:text-[#7B82F6]" />
          <p className="text-[14px] text-[#556070] dark:text-[#8E8E93]">
            Loading feedback form...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFC] p-4 dark:bg-[#0E131B]">
        <div className="w-full max-w-md rounded-[16px] border border-[#E1E5EB] bg-white p-8 text-center shadow-md dark:border-white/10 dark:bg-[#161C26]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-[18px] font-semibold text-[#161C26] dark:text-white">
            Form Unavailable
          </h2>
          <p className="mt-2 text-[14px] text-[#556070] dark:text-[#8E8E93]">
            {errorMessage ||
              "This feedback form does not exist or has been paused by the team."}
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = form.theme_config?.primary_color || "#4249C9";
  const borderRadius = form.theme_config?.border_radius ?? 12;
  const isLowScore = rating !== null && rating <= 3;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9FAFC] p-4 sm:p-6 lg:p-8 dark:bg-[#0E131B]">
      <main
        className="w-full max-w-[540px] border border-[#E1E5EB] bg-white p-6 sm:p-8 shadow-xl transition-all dark:border-white/10 dark:bg-[#161C26]"
        style={{ borderRadius: `${borderRadius}px` }}
      >
        {isSubmitted ? (
          /* ================= SUCCESS / OUTCOME STATE ================= */
          <div className="py-6 text-center space-y-4">
            <div
              className="mx-auto flex size-14 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Check className="size-7" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#161C26] dark:text-white">
                {submissionOutcome?.title ||
                  (isLowScore
                    ? form.outcome_screen?.low_score_title ||
                      "We're sorry we missed the mark"
                    : form.outcome_screen?.high_score_title ||
                      "Thank you for your feedback!")}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
                {submissionOutcome?.message ||
                  (isLowScore
                    ? form.outcome_screen?.low_score_message ||
                      "Our team takes this seriously and will look into what went wrong."
                    : form.outcome_screen?.high_score_message ||
                      "We truly appreciate you taking the time to share your experience.")}
              </p>
            </div>

            {(submissionOutcome?.is_high_score ?? !isLowScore) &&
              (submissionOutcome?.cta_url ||
                form.outcome_screen?.high_score_cta_url) && (
                <div className="pt-3">
                  <a
                    href={
                      submissionOutcome?.cta_url ||
                      form.outcome_screen?.high_score_cta_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: `${borderRadius}px`,
                    }}
                  >
                    <span>
                      {submissionOutcome?.cta_text ||
                        form.outcome_screen?.high_score_cta_text ||
                        "Share Your Review"}
                    </span>
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              )}

            <div className="pt-6 border-t border-[#E1E5EB] dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setRating(null);
                  setSelectedPills([]);
                  setCustomAnswers({});
                  setOpenComment("");
                  setContactEmail("");
                  setContactName("");
                  setSubmissionOutcome(null);
                  setIsSubmitted(false);
                }}
                className="text-[13px] text-[#556070] hover:underline dark:text-[#8E8E93]"
              >
                Submit another response
              </button>
            </div>
          </div>
        ) : (
          /* ================= ACTIVE FORM INPUTS ================= */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-[20px] font-semibold text-[#161C26] dark:text-white sm:text-[22px]">
                {form.title || "How was your experience today?"}
              </h1>
              {form.subtitle && (
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
                  {form.subtitle}
                </p>
              )}
            </div>

            {/* Rating Question */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#161C26] dark:text-white">
                Rating {form.rating_required && <span className="text-red-500">*</span>}
              </label>

              {form.rating_scale_type === "5_star" && (
                <div className="flex items-center justify-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      className="cursor-pointer text-[36px] leading-none transition-transform hover:scale-110 focus:outline-none"
                    >
                      <span
                        style={{
                          color: (rating ?? 0) >= star ? primaryColor : "#D1D5DB",
                        }}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {form.rating_scale_type === "5_emoji" && (
                <div className="flex items-center justify-between gap-1 py-2">
                  {EMOJI_SCALE.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRating(item.value)}
                      className={`flex flex-1 flex-col items-center rounded-[10px] p-2 transition-transform cursor-pointer ${
                        rating === item.value
                          ? "scale-105 bg-[#F0F2FE] dark:bg-white/10"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className="text-[28px]">{item.emoji}</span>
                      <span className="mt-1 text-[11px] font-medium text-[#556070] dark:text-[#8E8E93]">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {form.rating_scale_type === "1_10_numeric" && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-10 gap-1 py-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        className={`flex h-10 items-center justify-center rounded-[8px] text-[13px] font-semibold transition-all ${
                          rating === num
                            ? "text-white shadow-sm"
                            : "border border-[#E1E5EB] bg-white text-[#161C26] hover:bg-black/5 dark:border-white/10 dark:bg-[#1C1C1E] dark:text-white"
                        }`}
                        style={{
                          backgroundColor: rating === num ? primaryColor : undefined,
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between px-1 text-[11px] text-[#8E8E93]">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>
              )}

              {formErrors.rating && (
                <p className="text-[12px] font-medium text-red-500">
                  {formErrors.rating}
                </p>
              )}
            </div>

            {/* Category Pills */}
            {form.category_pills && form.category_pills.length > 0 && (
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#161C26] dark:text-white">
                  What relates to your feedback?
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.category_pills.map((pill) => {
                    const isSelected = selectedPills.includes(pill.label);
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => togglePill(pill.label)}
                        className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                          isSelected
                            ? "text-white shadow-xs"
                            : "border border-[#E1E5EB] bg-[#F9FAFC] text-[#556070] hover:bg-[#F0F2FE] hover:text-[#161C26] dark:border-white/10 dark:bg-[#1C1C1E] dark:text-[#8E8E93]"
                        }`}
                        style={{
                          backgroundColor: isSelected ? primaryColor : undefined,
                          borderColor: isSelected ? primaryColor : undefined,
                        }}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Questions */}
            {form.custom_questions && form.custom_questions.length > 0 && (
              <div className="space-y-4 pt-1">
                {form.custom_questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#161C26] dark:text-white">
                      {q.label}{" "}
                      {q.required && <span className="text-red-500">*</span>}
                    </label>

                    {q.type === "text" ? (
                      <input
                        type="text"
                        value={(customAnswers[q.id] as string) || ""}
                        onChange={(e) => handleCustomText(q.id, e.target.value)}
                        placeholder="Your answer"
                        className="w-full rounded-[10px] border border-[#E1E5EB] bg-white px-3 py-2 text-[13px] text-[#161C26] placeholder-[#8E8E93] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4249C9]"
                      />
                    ) : q.type === "single_choice" ? (
                      <div className="flex flex-wrap gap-3 pt-0.5">
                        {q.options.map((opt, idx) => (
                          <label
                            key={idx}
                            className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#556070] dark:text-[#8E8E93]"
                          >
                            <input
                              type="radio"
                              name={`custom_${q.id}`}
                              value={opt}
                              checked={customAnswers[q.id] === opt}
                              onChange={() => handleSingleChoice(q.id, opt)}
                              className="size-4 text-[#4249C9] focus:ring-[#4249C9]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 pt-0.5">
                        {q.options.map((opt, idx) => {
                          const selectedList = (customAnswers[q.id] as string[]) || [];
                          const isChecked = selectedList.includes(opt);
                          return (
                            <label
                              key={idx}
                              className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#556070] dark:text-[#8E8E93]"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleMultiChoice(q.id, opt)}
                                className="size-4 rounded border-[#D1D5DB] text-[#4249C9] focus:ring-[#4249C9]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {formErrors[q.id] && (
                      <p className="text-[12px] font-medium text-red-500">
                        {formErrors[q.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Open Comment Field */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#161C26] dark:text-white">
                {form.open_feedback_prompt || "Tell us more about your experience"}
              </label>
              <textarea
                value={openComment}
                onChange={(e) => setOpenComment(e.target.value)}
                placeholder={
                  form.open_feedback_placeholder ||
                  "What did you like or what could we improve?"
                }
                rows={4}
                className="w-full rounded-[10px] border border-[#E1E5EB] bg-white p-3 text-[13px] text-[#161C26] placeholder-[#8E8E93] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4249C9]"
              />
            </div>

            {/* Contact Field */}
            {form.contact_field_mode !== "hidden" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#161C26] dark:text-white">
                    Email{" "}
                    {form.contact_field_mode === "required" ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-[11px] font-normal text-[#8E8E93]">
                        (Optional, for follow up)
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-[10px] border border-[#E1E5EB] bg-white px-3 py-2 text-[13px] text-[#161C26] placeholder-[#8E8E93] dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#4249C9]"
                  />
                  {formErrors.contact && (
                    <p className="text-[12px] font-medium text-red-500">
                      {formErrors.contact}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Error Banner */}
            {submitError && (
              <div className="rounded-[10px] bg-red-50 p-3 text-[13px] text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {submitError}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 px-5 py-3 text-[14px] font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: `${borderRadius}px`,
                }}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                <span>Send Feedback</span>
              </button>
            </div>
          </form>
        )}

        {/* Branding Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-[#8E8E93]">
          <Sparkles className="size-3 text-[#4249C9] dark:text-[#7B82F6]" />
          <span>Powered by</span>
          <span className="font-medium text-[#161C26] dark:text-white">
            Voice of Customer
          </span>
        </div>
      </main>
    </div>
  );
}
