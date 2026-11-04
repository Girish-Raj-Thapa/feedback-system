"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Lock,
  Play,
  Sparkles,
  Zap,
} from "lucide-react";

import { AmbientBackground } from "@/components/auth/ambient-background";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Apple-style soft ambient background glow */}
      <AmbientBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* Eyebrow Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/90 px-3.5 py-1 text-[13px] font-medium text-text shadow-2xs backdrop-blur-md transition-all hover:border-action/40">
          <Sparkles className="size-3.5 text-[#0071E3] dark:text-[#2997FF]" />
          <span>The $0 AI & Smart Feedback Engine</span>
          <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
            v1.0
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="mt-6 text-[36px] font-bold tracking-tight text-text sm:text-[54px] lg:text-[66px] leading-[1.08]">
          Turn raw customer feedback into{" "}
          <span className="bg-gradient-to-r from-[#0071E3] via-[#4249C9] to-[#8E44AD] bg-clip-text text-transparent dark:from-[#2997FF] dark:via-[#7B82F6] dark:to-[#BA68C8]">
            high-impact product decisions.
          </span>
        </h1>

        {/* Subtitle / Value Proposition */}
        <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-text-muted sm:text-[19px]">
          Embed customizable feedback widgets on your website in 10 seconds.
          Automatically categorize feedback, detect customer sentiment, and
          triage issues in real time with zero token cost.
        </p>

        {/* Primary and Secondary CTA Buttons */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/register"
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] bg-action px-7 text-[15px] font-semibold text-text-on-action shadow-md transition-all hover:bg-action-hover hover:shadow-lg active:scale-[0.98]"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="size-4" />
          </Link>

          <Link
            href="#demo"
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] border border-border bg-surface/80 px-6 text-[15px] font-semibold text-text shadow-2xs backdrop-blur-sm transition-all hover:bg-hover active:scale-[0.98]"
          >
            <Play className="size-3.5 fill-current text-text-muted" />
            <span>Interactive Demo</span>
          </Link>
        </div>

        {/* Credibility / Trust Strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-text-muted">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-[#0071E3] dark:text-[#2997FF]" />
            <span>1-line HTML embed snippet</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            <span>$0 Deterministic AI overhead</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-emerald-500" />
            <span>Multi-tenant RBAC security</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#0071E3] dark:text-[#2997FF]" />
            <span>No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  );
}

