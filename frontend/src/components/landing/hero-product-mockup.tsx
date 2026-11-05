"use client";

import {
  Archive,
  CheckCircle2,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";

export function HeroProductMockup() {
  return (
    <div className="relative mx-auto mt-12 w-full max-w-5xl">
      {/* Decorative ambient gradient backdrop glow */}
      <div
        className="pointer-events-none absolute -inset-x-10 -top-16 -bottom-10 rounded-[36px] bg-gradient-to-r from-[#0071E3]/20 via-[#4249C9]/15 to-[#8E44AD]/20 blur-3xl opacity-60 dark:opacity-40"
        aria-hidden="true"
      />

      {/* Main Browser Window Frame */}
      <div className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] border border-border/80 bg-surface shadow-[0_25px_65px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_65px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {/* Top Window Bar */}
        <div className="flex h-11 items-center justify-between border-b border-border/60 bg-subtle/50 px-4">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
            <span className="size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
            <span className="size-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-surface/90 px-3 py-1 text-[11px] font-mono text-text-muted">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>app.feedbacksystem.com/acme-corp/inbox</span>
          </div>

          <div className="flex items-center gap-1.5 text-text-muted">
            <span className="text-[11px] font-medium hidden sm:inline">Live Mode</span>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Dashboard Inner Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          {/* Main Inbox Feed (8 cols on large screens) */}
          <div className="p-5 lg:col-span-8 lg:border-r border-border/60 space-y-4">
            {/* Inbox Header & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-bold text-text">Customer Inbox</h3>
                  <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
                    128 submissions
                  </span>
                </div>
                <p className="text-[12px] text-text-muted">
                  Streaming incoming feedback from widgets and hosted links.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-subtle/50 p-0.5 text-[11px] font-medium">
                <span className="rounded-md bg-surface px-2.5 py-1 text-text shadow-2xs font-semibold">
                  All
                </span>
                <span className="rounded-md px-2 py-1 text-text-muted hover:text-text cursor-pointer">
                  New (14)
                </span>
                <span className="rounded-md px-2 py-1 text-text-muted hover:text-text cursor-pointer">
                  Reviewed
                </span>
              </div>
            </div>

            {/* Submissions Mock List */}
            <div className="divide-y divide-border/60 rounded-[14px] border border-border/70 overflow-hidden bg-surface">
              {/* Row 1: Positive Prompter */}
              <div className="flex items-start justify-between gap-3 p-3.5 bg-subtle/20 hover:bg-subtle/40 transition-colors cursor-pointer">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4249C9] text-white text-[12px] font-bold">
                    S
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-text truncate">
                        Sarah Jenkins
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <span className="size-1 rounded-full bg-emerald-500" />
                        Positive
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F5F9] px-2 py-0.5 text-[10px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                        <Tag className="size-2.5" />
                        UX & Design
                      </span>
                    </div>
                    <p className="text-[12px] text-text-muted line-clamp-1">
                      &ldquo;The checkout flow is seamless and fast now. Great job on the redesign!&rdquo;
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="size-3 fill-current" />
                    <span className="text-[11px] font-bold">5 / 5</span>
                  </div>
                  <span className="text-[10px] text-text-muted">2m ago</span>
                </div>
              </div>

              {/* Row 2: Performance Bug (Selected / Highlighted) */}
              <div className="flex items-start justify-between gap-3 p-3.5 bg-action/5 border-l-2 border-action transition-colors cursor-pointer">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-[12px] font-bold">
                    D
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-text truncate">
                        David K.
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        <span className="size-1 rounded-full bg-rose-500" />
                        Negative
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F5F9] px-2 py-0.5 text-[10px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                        <Tag className="size-2.5" />
                        Bug Report
                      </span>
                    </div>
                    <p className="text-[12px] text-text font-medium line-clamp-1">
                      &ldquo;Settings page freezes when exporting team CSV reports.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="size-3 fill-current" />
                    <span className="text-[11px] font-bold">2 / 5</span>
                  </div>
                  <span className="text-[10px] text-text-muted">14m ago</span>
                </div>
              </div>

              {/* Row 3: Feature Request */}
              <div className="flex items-start justify-between gap-3 p-3.5 bg-subtle/10 hover:bg-subtle/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[12px] font-bold">
                    M
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-text truncate">
                        Maya Lin
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                        <span className="size-1 rounded-full bg-slate-400" />
                        Neutral
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F5F9] px-2 py-0.5 text-[10px] font-medium text-[#556070] dark:bg-white/10 dark:text-[#8E8E93]">
                        <Tag className="size-2.5" />
                        Feature Idea
                      </span>
                    </div>
                    <p className="text-[12px] text-text-muted line-clamp-1">
                      &ldquo;Would love an API webhook to push alerts directly into Slack.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="rounded-md bg-subtle px-1.5 py-0.5 text-[11px] font-bold text-text">
                    8 / 10
                  </span>
                  <span className="block text-[10px] text-text-muted mt-0.5">1h ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Inspection Drawer Mockup (4 cols on large screens) */}
          <div className="p-5 lg:col-span-4 bg-subtle/30 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Inspection Drawer
                </span>
                <h4 className="text-[14px] font-bold text-text">David K.</h4>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                Status: New
              </span>
            </div>

            {/* Verbatim Feedback Card */}
            <div className="rounded-[12px] border border-border bg-surface p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Verbatim Customer Feedback
              </span>
              <p className="text-[12px] text-text leading-relaxed">
                &ldquo;Settings page freezes when exporting team CSV reports. Happening on Chrome 124.&rdquo;
              </p>
            </div>

            {/* Smart Categorizer Card */}
            <div className="rounded-[12px] border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0071E3] dark:text-[#2997FF]">
                <Sparkles className="size-3.5" />
                <span>$0 Auto Keyword Engine</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Matched keyword: <span className="font-semibold text-text">&ldquo;freezes&rdquo;</span> → Assigned to{" "}
                <span className="font-semibold text-text">Bug Report</span> bucket.
              </p>
            </div>

            {/* Customer History Mini Card */}
            <div className="rounded-[12px] border border-border bg-surface p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Customer Activity
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text font-medium">3 total submissions</span>
                <span className="font-semibold text-text">Avg: 3.3 ★</span>
              </div>
            </div>

            {/* Triage Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-[8px] bg-action py-1.5 text-[11px] font-semibold text-text-on-action shadow-xs hover:bg-action-hover"
              >
                <CheckCircle2 className="size-3" />
                <span>Mark Reviewed</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 rounded-[8px] border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text hover:bg-hover"
              >
                <Archive className="size-3" />
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

