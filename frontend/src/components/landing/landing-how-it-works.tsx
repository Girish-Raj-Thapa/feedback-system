"use client";

import { ArrowRight, Code2, Paintbrush, Sliders, Zap } from "lucide-react";

export function LandingHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Customize in Form Studio",
      description:
        "Select your rating scale (5-Star, 5-Emoji, or 1–10 NPS), add custom questions, and set up brand colors in under 60 seconds.",
      icon: Paintbrush,
      accent: "from-blue-500 to-indigo-600",
    },
    {
      number: "02",
      title: "Embed with 1 Line of Code",
      description:
        "Copy your lightweight widget script tag into your website, or share hosted feedback URLs directly via email and social channels.",
      icon: Code2,
      accent: "from-indigo-600 to-purple-600",
    },
    {
      number: "03",
      title: "Triage & Drive Decisions",
      description:
        "Watch live feedback stream into your inbox. Automatically tag keywords, monitor customer sentiment, and inspect customer history.",
      icon: Zap,
      accent: "from-purple-600 to-pink-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 border-t border-border/60 bg-subtle/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[12px] font-bold uppercase tracking-wider text-action">
            Simple 3-Step Flow
          </span>
          <h2 className="mt-2 text-[32px] sm:text-[42px] font-bold tracking-tight text-text">
            From setup to live feedback in under 2 minutes.
          </h2>
          <p className="mt-3 text-[15px] text-text-muted">
            No engineering bottlenecks or complex SDK integrations required.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative rounded-[20px] border border-border/80 bg-surface p-7 shadow-xs hover:border-action/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[28px] font-extrabold font-mono text-text/30 dark:text-white/20">
                      {step.number}
                    </span>
                    <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#2997FF]">
                      <Icon className="size-5" />
                    </div>
                  </div>

                  <h3 className="text-[18px] font-bold text-text">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[13px] text-text-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center text-[12px] font-semibold text-action">
                  <span>Fast and automated</span>
                  <ArrowRight className="size-3.5 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

