"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export function LandingCta() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-action/40 bg-gradient-to-b from-[#0071E3]/15 via-surface to-surface p-8 sm:p-14 text-center shadow-2xl backdrop-blur-xl">
          {/* Radial ambient glow effect */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 rounded-full bg-[#0071E3]/20 blur-3xl opacity-70"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-[12px] font-semibold text-text shadow-2xs">
              <Sparkles className="size-3.5 text-[#0071E3] dark:text-[#2997FF]" />
              <span>Instant Setup in 60 Seconds</span>
            </div>

            <h2 className="text-[32px] sm:text-[46px] font-bold tracking-tight text-text leading-[1.15]">
              Start capturing feedback that actually drives decisions.
            </h2>

            <p className="text-[16px] text-text-muted leading-relaxed">
              Create your first feedback widget today. Free forever tier with unlimited
              hosted forms and smart triage inbox.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] bg-action px-8 text-[15px] font-semibold text-text-on-action shadow-md transition-all hover:bg-action-hover active:scale-[0.98]"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] border border-border bg-surface px-6 text-[15px] font-semibold text-text shadow-2xs transition-all hover:bg-hover active:scale-[0.98]"
              >
                <span>Sign In</span>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 text-[12px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

