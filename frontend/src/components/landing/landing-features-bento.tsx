"use client";

import { useState } from "react";
import {
  Archive,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  History,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export function LandingFeaturesBento() {
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const embedCode = `<script\n  src="https://feedbacksystem.com/widget.js"\n  data-form="live-feedback"\n  data-workspace="acme-corp"\n  async>\n</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedSnippet(true);
    toast.success("Embed script copied to clipboard!");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <section id="features" className="py-24 sm:py-32 relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-subtle/50 px-3 py-1 text-[12px] font-semibold text-text shadow-2xs">
            <Layers className="size-3.5 text-[#0071E3] dark:text-[#2997FF]" />
            <span>Built for Modern Product Teams</span>
          </div>
          <h2 className="mt-4 text-[32px] sm:text-[44px] font-bold tracking-tight text-text leading-[1.15]">
            Everything you need to turn feedback into roadmap decisions.
          </h2>
          <p className="mt-4 text-[16px] text-text-muted leading-relaxed">
            Eliminate messy spreadsheets and costly AI token bills. Capture,
            triage, and act on customer sentiment with precision.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: 10-Second Embeds (Code snippet visual) */}
          <div className="group relative overflow-hidden rounded-[20px] border border-border/80 bg-surface p-6 shadow-sm transition-all hover:border-action/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF] mb-4">
                <Code2 className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-text">
                10-Second HTML Embeds
              </h3>
              <p className="mt-1.5 text-[13px] text-text-muted leading-relaxed">
                Paste one line of code into your Webflow, React, Next.js, or HTML site.
                Widgets look native and adapt to user dark/light themes.
              </p>
            </div>

            {/* Code Snippet Box */}
            <div className="mt-6 rounded-[12px] border border-border/80 bg-[#161B22] p-3 text-left font-mono text-[11px] text-slate-300 relative">
              <button
                type="button"
                onClick={handleCopyCode}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/20 transition-colors"
              >
                {copiedSnippet ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                <span>{copiedSnippet ? "Copied" : "Copy"}</span>
              </button>
              <pre className="overflow-x-auto pr-14 leading-relaxed text-emerald-400">
                {embedCode}
              </pre>
            </div>
          </div>

          {/* Card 2: Smart Triage Drawer */}
          <div className="group relative overflow-hidden rounded-[20px] border border-border/80 bg-surface p-6 shadow-sm transition-all hover:border-action/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#4249C9]/10 text-[#4249C9] dark:bg-[#4249C9]/20 dark:text-[#7B82F6] mb-4">
                <Sliders className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-text">
                Slide-Out Triage Drawer
              </h3>
              <p className="mt-1.5 text-[13px] text-text-muted leading-relaxed">
                Deeply inspect verbatim customer quotes, custom questions, browser
                metadata, and triage status without losing your place.
              </p>
            </div>

            {/* Visual Micro Drawer Mock */}
            <div className="mt-6 rounded-[14px] border border-border/80 bg-subtle/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-text">Status Triage</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Reviewed
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="flex-1 rounded-[8px] bg-action text-white py-1 text-center text-[10px] font-medium">
                  Mark Reviewed
                </span>
                <span className="rounded-[8px] border border-border bg-surface px-2.5 py-1 text-[10px] font-medium text-text">
                  Archive
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: $0 Keyword Categorizer */}
          <div className="group relative overflow-hidden rounded-[20px] border border-border/80 bg-surface p-6 shadow-sm transition-all hover:border-action/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 mb-4">
                <Zap className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-text">
                $0 Keyword Categorizer
              </h3>
              <p className="mt-1.5 text-[13px] text-text-muted leading-relaxed">
                Scan comments in-memory against your workspace keywords. Zero latency,
                zero third-party API dependencies, and \$0 token cost.
              </p>
            </div>

            {/* Keyword Pipeline Graphic */}
            <div className="mt-6 rounded-[14px] border border-border/80 bg-subtle/40 p-3 space-y-2 text-[11px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Rule Engine
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono">
                  "crash"
                </span>
                <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono">
                  "error"
                </span>
                <span className="text-text-muted">→</span>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  Bug Report
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Customer Profile History */}
          <div className="group relative overflow-hidden rounded-[20px] border border-border/80 bg-surface p-6 shadow-sm transition-all hover:border-action/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 mb-4">
                <History className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-text">
                Customer Profile History
              </h3>
              <p className="mt-1.5 text-[13px] text-text-muted leading-relaxed">
                Instantly identify repeat detractors or brand champions. Every submission
                links to lifetime feedback history and rating trends.
              </p>
            </div>

            <div className="mt-6 rounded-[14px] border border-border/80 bg-subtle/40 p-3 flex items-center justify-between text-[11px]">
              <div>
                <span className="font-semibold text-text block">jane@acme.com</span>
                <span className="text-[10px] text-text-muted">3 submissions over 6mo</span>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                Avg 4.7 ★
              </span>
            </div>
          </div>

          {/* Card 5: Tailored Outcome Screens */}
          <div className="group relative overflow-hidden rounded-[20px] border border-border/80 bg-surface p-6 shadow-sm transition-all hover:border-action/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mb-4">
                <Sparkles className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-text">
                Tailored Outcome Routing
              </h3>
              <p className="mt-1.5 text-[13px] text-text-muted leading-relaxed">
                Boost your online ratings automatically. Route high scorers directly to
                G2 or Capterra, and send detractors straight to customer support.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-[10px] border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                  Promoters (4-5★)
                </span>
                <span className="text-text-muted mt-0.5 block">Review link on G2</span>
              </div>
              <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 p-2.5 dark:border-amber-800/40 dark:bg-amber-950/20">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">
                  Detractors (1-3★)
                </span>
                <span className="text-text-muted mt-0.5 block">Direct VIP support</span>
              </div>
            </div>
          </div>

          {/* Card 6: Enterprise Tenant Isolation */}
          <div className="group relative overflow-hidden rounded-[20px] border border-border/80 bg-surface p-6 shadow-sm transition-all hover:border-action/40 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF] mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-text">
                Multi-Tenant Enterprise RBAC
              </h3>
              <p className="mt-1.5 text-[13px] text-text-muted leading-relaxed">
                Granular permission controls for Owner, Admin, Editor, and Viewer roles.
                Every workspace has strict database isolation.
              </p>
            </div>

            <div className="mt-6 rounded-[14px] border border-border/80 bg-subtle/40 p-3 space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Data Isolation:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Strict Workspace Scoping</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Role Hierarchy:</span>
                <span className="font-semibold text-text">4 System Roles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

