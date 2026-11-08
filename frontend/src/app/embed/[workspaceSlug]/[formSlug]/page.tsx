"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  X,
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

export default function EmbedFormPage() {
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic Height Auto-Sizing via postMessage
  useEffect(() => {
    const notifyHeight = () => {
      if (typeof window !== "undefined" && window.parent && containerRef.current) {
        const height = Math.ceil(containerRef.current.scrollHeight);
        window.parent.postMessage({ type: "feedback:resize", height }, "*");
      }
    };

    notifyHeight();

    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      const ro = new ResizeObserver(() => {
        notifyHeight();
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [isLoading, isSubmitted, rating, formErrors, errorMessage]);

  // Read URL query parameters for user identification
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email") || params.get("user_email");
      const nameParam = params.get("name") || params.get("user_name");
      if (emailParam) setContactEmail(emailParam);
      if (nameParam) setContactName(nameParam);
    }
  }, []);

  // Listen for dynamic parent postMessage (e.g. FeedbackSDK.identify)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "feedback:identify" && event.data.data) {
        const { email, name } = event.data.data;
        if (email) setContactEmail(email);
        if (name) setContactName(name);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Turnstile widget loader
  useEffect(() => {
    if (!form?.turnstile_site_key || typeof window === "undefined") return;
    const siteKey = form.turnstile_site_key;

    const renderTurnstile = () => {
      const win = window as unknown as {
        turnstile?: {
          render: (
            container: HTMLElement,
            options: {
              sitekey: string;
              callback: (token: string) => void;
              "error-callback"?: () => void;
              "expired-callback"?: () => void;
            }
          ) => void;
        };
      };
      if (win.turnstile && turnstileContainerRef.current) {
        try {
          turnstileContainerRef.current.innerHTML = "";
          win.turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setTurnstileToken(token),
            "error-callback": () => setTurnstileToken(null),
            "expired-callback": () => setTurnstileToken(null),
          });
        } catch (e) {
          console.warn("Turnstile render error:", e);
        }
      }
    };

    const win = window as unknown as { turnstile?: unknown };
    if (win.turnstile) {
      renderTurnstile();
    } else {
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => renderTurnstile();
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", renderTurnstile);
      }
    }
  }, [form?.turnstile_site_key]);

  // Load Form Schema & HMAC token
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
            "This feedback form is not currently available."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchForm();
  }, [workspaceSlug, formSlug]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "feedback:close" }, "*");
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const errors: Record<string, string> = {};

    if (form.rating_required && rating === null) {
      errors.rating = "Please select a rating.";
    }

    if (form.contact_field_mode === "required" && !contactEmail.trim()) {
      errors.contact = "Email address is required.";
    }

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

      const extraMetadata: Record<string, unknown> = {};
      if (typeof window !== "undefined") {
        const search = new URLSearchParams(window.location.search);
        search.forEach((val, key) => {
          if (!["email", "user_email", "name", "user_name"].includes(key)) {
            extraMetadata[key] = val;
          }
        });
      }

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
          source: "embed",
          ...extraMetadata,
        },
        form_token: form?.form_token || null,
        turnstile_token: turnstileToken || null,
      };

      const res = await feedbackRepository.submitFeedback(
        workspaceSlug,
        formSlug,
        submissionPayload
      );

      setSubmissionOutcome(res.outcome);
      setIsSubmitted(true);
      if (typeof window !== "undefined" && window.parent) {
        window.parent.postMessage({ type: "feedback:submitted" }, "*");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setSubmitError(
        error.response?.data?.detail ||
          "An error occurred while submitting feedback. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = form?.theme_config?.primary_color || "#4249C9";
  const borderRadius = `${form?.theme_config?.border_radius ?? 12}px`;

  return (
    <div
      ref={containerRef}
      className="w-full bg-white text-[#161C26] antialiased dark:bg-[#1E1E20] dark:text-white"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center p-6">
          <Loader2 className="size-6 animate-spin text-[#4249C9]" />
        </div>
      )}

      {/* Error / Paused State */}
      {!isLoading && errorMessage && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="size-10 text-[#E05252]" />
          <h2 className="mt-3 text-[16px] font-semibold text-[#161C26] dark:text-white">
            Form Unavailable
          </h2>
          <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Main Form State */}
      {!isLoading && form && !isSubmitted && (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E1E5EB] p-5 dark:border-white/10">
            <div>
              <h1 className="text-[16px] font-bold text-[#161C26] dark:text-white">
                {form.title}
              </h1>
              {form.subtitle && (
                <p className="mt-0.5 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                  {form.subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
            {submitError && (
              <div className="rounded-lg bg-[#FEE4E2] p-3 text-[12px] font-medium text-[#D92D20]">
                {submitError}
              </div>
            )}

            {/* Rating Section */}
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-[#161C26] dark:text-white">
                How would you rate your experience?{" "}
                {form.rating_required && <span className="text-[#E05252]">*</span>}
              </label>

              {form.rating_scale_type === "5_star" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="cursor-pointer p-1 transition-transform hover:scale-110"
                    >
                      <svg
                        className={`size-7 ${
                          (rating ?? 0) >= s
                            ? "fill-[#F59E0B] text-[#F59E0B]"
                            : "fill-transparent text-[#CBD5E1] dark:text-white/20"
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {form.rating_scale_type === "5_emoji" && (
                <div className="grid grid-cols-5 gap-2">
                  {EMOJI_SCALE.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRating(item.value)}
                      style={{ borderRadius }}
                      className={`flex flex-col items-center gap-1 border p-2 transition-all ${
                        rating === item.value
                          ? "border-[#4249C9] bg-[#4249C9]/10 shadow-xs dark:border-[#7B82F6]"
                          : "border-[#E1E5EB] bg-[#F7F9FC] hover:border-[#4249C9]/40 dark:border-white/10 dark:bg-white/5"
                      }`}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-[10px] font-medium text-[#556070] dark:text-[#8E8E93]">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {form.rating_scale_type === "1_10_numeric" && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        style={{ borderRadius }}
                        className={`py-2 text-[13px] font-semibold transition-all ${
                          rating === num
                            ? "bg-[#4249C9] text-white"
                            : "border border-[#E1E5EB] bg-[#F7F9FC] text-[#161C26] hover:border-[#4249C9]/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-[#556070] dark:text-[#8E8E93]">
                    <span>Not likely</span>
                    <span>Extremely likely</span>
                  </div>
                </div>
              )}

              {formErrors.rating && (
                <p className="mt-1 text-[12px] text-[#E05252]">{formErrors.rating}</p>
              )}
            </div>

            {/* Category Pills */}
            {form.category_pills && form.category_pills.length > 0 && (
              <div>
                <label className="mb-2 block text-[13px] font-semibold text-[#161C26] dark:text-white">
                  What was this related to?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {form.category_pills.map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => togglePill(pill.label)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-[12px] font-medium transition-all ${
                        selectedPills.includes(pill.label)
                          ? "border-[#4249C9] bg-[#4249C9] text-white"
                          : "border-[#E1E5EB] bg-[#F7F9FC] text-[#161C26] hover:border-[#4249C9]/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      }`}
                    >
                      {pill.emoji && <span className="mr-1">{pill.emoji}</span>}
                      <span>{pill.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Questions */}
            {form.custom_questions && form.custom_questions.length > 0 && (
              <div className="space-y-4">
                {form.custom_questions.map((q) => (
                  <div key={q.id}>
                    <label className="mb-1.5 block text-[13px] font-semibold text-[#161C26] dark:text-white">
                      {q.label} {q.required && <span className="text-[#E05252]">*</span>}
                    </label>

                    {q.type === "single_choice" && (
                      <div className="space-y-1.5">
                        {q.options?.map((opt) => (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E1E5EB] bg-[#F7F9FC] px-3 py-2 text-[13px] text-[#161C26] dark:border-white/10 dark:bg-white/5 dark:text-white"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={customAnswers[q.id] === opt}
                              onChange={() => handleSingleChoice(q.id, opt)}
                              className="accent-[#4249C9]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "multi_choice" && (
                      <div className="space-y-1.5">
                        {q.options?.map((opt) => (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E1E5EB] bg-[#F7F9FC] px-3 py-2 text-[13px] text-[#161C26] dark:border-white/10 dark:bg-white/5 dark:text-white"
                          >
                            <input
                              type="checkbox"
                              name={q.id}
                              value={opt}
                              checked={
                                Array.isArray(customAnswers[q.id]) &&
                                (customAnswers[q.id] as string[]).includes(opt)
                              }
                              onChange={() => handleMultiChoice(q.id, opt)}
                              className="accent-[#4249C9]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "text" && (
                      <input
                        type="text"
                        value={(customAnswers[q.id] as string) || ""}
                        onChange={(e) => handleSingleChoice(q.id, e.target.value)}
                        placeholder="Your answer..."
                        style={{ borderRadius }}
                        className="h-9 w-full border border-[#E1E5EB] bg-[#F7F9FC] px-3 text-[13px] focus:border-[#4249C9] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    )}

                    {formErrors[q.id] && (
                      <p className="mt-1 text-[12px] text-[#E05252]">{formErrors[q.id]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Open Feedback Textarea */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#161C26] dark:text-white">
                {form.open_feedback_prompt || "Tell us what you think"}
              </label>
              <textarea
                rows={3}
                value={openComment}
                onChange={(e) => setOpenComment(e.target.value)}
                placeholder={form.open_feedback_placeholder || "Your feedback..."}
                style={{ borderRadius }}
                className="w-full border border-[#E1E5EB] bg-[#F7F9FC] p-3 text-[13px] focus:border-[#4249C9] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* Contact Email Field */}
            {form.contact_field_mode !== "hidden" && (
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#161C26] dark:text-white">
                  Email Address{" "}
                  {form.contact_field_mode === "required" && (
                    <span className="text-[#E05252]">*</span>
                  )}
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ borderRadius }}
                  className="h-9 w-full border border-[#E1E5EB] bg-[#F7F9FC] px-3 text-[13px] focus:border-[#4249C9] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                {formErrors.contact && (
                  <p className="mt-1 text-[12px] text-[#E05252]">{formErrors.contact}</p>
                )}
              </div>
            )}

            {/* Turnstile Verification */}
            {form.turnstile_site_key && (
              <div
                ref={turnstileContainerRef}
                className="my-1 flex justify-center"
              />
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: primaryColor,
                borderRadius,
              }}
              className="mt-2 flex h-10 cursor-pointer items-center justify-center font-medium text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span>Submit Feedback</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Outcome Screen */}
      {!isLoading && isSubmitted && submissionOutcome && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#12B76A]/10 text-[#12B76A]">
            <Check className="size-7" />
          </div>

          <h2 className="mt-4 text-[18px] font-bold text-[#161C26] dark:text-white">
            {submissionOutcome.title}
          </h2>
          <p className="mt-2 text-[13px] text-[#556070] dark:text-[#8E8E93]">
            {submissionOutcome.message}
          </p>

          <div className="mt-6 flex w-full flex-col gap-2">
            {submissionOutcome.cta_text && submissionOutcome.cta_url && (
              <a
                href={submissionOutcome.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: primaryColor, borderRadius }}
                className="flex h-10 items-center justify-center gap-1.5 font-medium text-white shadow-xs transition-opacity hover:opacity-90"
              >
                <span>{submissionOutcome.cta_text}</span>
                <ExternalLink className="size-4" />
              </a>
            )}

            {submissionOutcome.support_text && submissionOutcome.support_url && (
              <a
                href={submissionOutcome.support_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderRadius }}
                className="flex h-10 items-center justify-center gap-1.5 border border-[#E1E5EB] bg-white font-medium text-[#161C26] transition-colors hover:bg-[#F3F5F9] dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <span>{submissionOutcome.support_text}</span>
                <ExternalLink className="size-4" />
              </a>
            )}

            <button
              type="button"
              onClick={handleClose}
              style={{ borderRadius }}
              className="mt-2 h-9 text-[13px] text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93] dark:hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
