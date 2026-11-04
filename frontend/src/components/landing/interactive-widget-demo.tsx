"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

type ScaleType = "5_star" | "5_emoji" | "1_10_numeric";

export function InteractiveWidgetDemo() {
  const [scaleType, setScaleType] = useState<ScaleType>("5_star");
  const [rating, setRating] = useState<number>(5);
  const [selectedPill, setSelectedPill] = useState<string>("Feature Idea");
  const [comment, setComment] = useState<string>(
    "The new triage workflow is ridiculously fast! Would love dark mode widgets next."
  );
  const [email, setEmail] = useState<string>("alex@company.com");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const emojiOptions = [
    { value: 1, emoji: "😡", label: "Terrible" },
    { value: 2, emoji: "🙁", label: "Poor" },
    { value: 3, emoji: "😐", label: "Okay" },
    { value: 4, emoji: "🙂", label: "Good" },
    { value: 5, emoji: "😍", label: "Amazing" },
  ];

  const categoryPills = [
    "Feature Idea",
    "Bug Report",
    "Performance",
    "Billing & Plans",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    toast.success("Demo feedback submitted successfully!");
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setRating(scaleType === "1_10_numeric" ? 9 : 5);
    setComment("The new triage workflow is ridiculously fast! Would love dark mode widgets next.");
  };

  const isHighScore =
    scaleType === "1_10_numeric" ? rating >= 7 : rating >= 4;

  return (
    <div className="relative mx-auto w-full max-w-2xl rounded-[24px] border border-border/80 bg-surface/90 p-5 sm:p-7 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* Top Bar with Widget Configuration Tabs */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
            <Sparkles className="size-3.5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text">
              Live Widget Playground
            </h3>
            <p className="text-[11px] text-text-muted">
              Interactive preview embedded on your website
            </p>
          </div>
        </div>

        {/* Scale Switcher Tabs */}
        <div className="flex rounded-lg border border-border/80 bg-subtle/60 p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => {
              setScaleType("5_star");
              setRating(5);
              setIsSubmitted(false);
            }}
            className={`rounded-md px-2.5 py-1 transition-all ${
              scaleType === "5_star"
                ? "bg-surface font-semibold text-text shadow-2xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            5-Star
          </button>
          <button
            type="button"
            onClick={() => {
              setScaleType("5_emoji");
              setRating(5);
              setIsSubmitted(false);
            }}
            className={`rounded-md px-2.5 py-1 transition-all ${
              scaleType === "5_emoji"
                ? "bg-surface font-semibold text-text shadow-2xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            5-Emoji
          </button>
          <button
            type="button"
            onClick={() => {
              setScaleType("1_10_numeric");
              setRating(9);
              setIsSubmitted(false);
            }}
            className={`rounded-md px-2.5 py-1 transition-all ${
              scaleType === "1_10_numeric"
                ? "bg-surface font-semibold text-text shadow-2xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            1–10 NPS
          </button>
        </div>
      </div>

      {/* Widget Card Body */}
      {isSubmitted ? (
        /* Tailored Outcome Screen Simulation */
        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`flex size-14 items-center justify-center rounded-full ${
              isHighScore
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            <CheckCircle2 className="size-7" />
          </div>

          <h4 className="mt-4 text-[18px] font-bold text-text">
            {isHighScore
              ? "Thank you for the love!"
              : "We're sorry we missed the mark."}
          </h4>
          <p className="mt-1.5 max-w-sm text-[13px] text-text-muted">
            {isHighScore
              ? "We truly appreciate your feedback! Because you rated us highly, would you consider leaving a quick review?"
              : "Our engineering and support team has been notified and is looking directly into this."}
          </p>

          {isHighScore && (
            <div className="mt-5 flex items-center gap-2">
              <a
                href="#demo"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Promoter CTA redirect clicked!");
                }}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-action px-4 py-2 text-[12px] font-medium text-text-on-action shadow-xs hover:bg-action-hover"
              >
                <span>Review us on G2</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-text"
          >
            <RotateCcw className="size-3" />
            <span>Reset Demo Form</span>
          </button>
        </div>
      ) : (
        /* Live Feedback Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header prompt */}
          <div>
            <h4 className="text-[16px] font-semibold text-text">
              How has your experience been?
            </h4>
            <p className="text-[12px] text-text-muted">
              Select your rating and let us know what we can improve.
            </p>
          </div>

          {/* Rating Control */}
          <div className="rounded-[14px] border border-border/80 bg-subtle/30 p-3.5">
            {scaleType === "5_star" && (
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-115 active:scale-95 focus:outline-none"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`size-7 transition-colors ${
                        rating >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-border hover:text-amber-200 dark:text-neutral-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}

            {scaleType === "5_emoji" && (
              <div className="flex items-center justify-around gap-1">
                {emojiOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRating(opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${
                      rating === opt.value
                        ? "bg-surface shadow-xs scale-105"
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <span className="text-[26px]">{opt.emoji}</span>
                    <span className="text-[10px] font-medium text-text-muted">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {scaleType === "1_10_numeric" && (
              <div>
                <div className="grid grid-cols-10 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-bold transition-all ${
                        rating === num
                          ? "bg-action text-text-on-action shadow-xs scale-105"
                          : "bg-surface text-text hover:bg-hover"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between px-1 text-[10px] text-text-muted">
                  <span>Not likely at all</span>
                  <span>Extremely likely</span>
                </div>
              </div>
            )}
          </div>

          {/* Category Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categoryPills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setSelectedPill(pill)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                    selectedPill === pill
                      ? "bg-[#0071E3] text-white shadow-2xs dark:bg-[#0077ED]"
                      : "border border-border bg-surface text-text hover:bg-hover"
                  }`}
                >
                  <Tag className="size-3" />
                  <span>{pill}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment text area */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Feedback Note
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you loved or what went wrong..."
              className="w-full rounded-[12px] border border-border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-text-muted/60 focus:border-action focus:outline-none focus:ring-2 focus:ring-focus-ring"
            />
          </div>

          {/* Customer Email & Submit */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com (optional)"
              className="flex-1 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-text-muted/60 focus:border-action focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-action px-5 py-2 text-[13px] font-semibold text-text-on-action shadow-sm transition-all hover:bg-action-hover active:scale-[0.98]"
            >
              <span>Submit Feedback</span>
              <Send className="size-3.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

