"use client";

import { Activity, Clock, Cpu, ShieldCheck } from "lucide-react";

export function LandingStats() {
  const stats = [
    {
      label: "Ingestion Latency",
      value: "< 10ms",
      subtext: "Instant in-memory processing",
      icon: Activity,
    },
    {
      label: "AI Token Costs",
      value: "$0.00",
      subtext: "Zero third-party model bills",
      icon: Cpu,
    },
    {
      label: "Data Isolation",
      value: "100%",
      subtext: "Strict tenant & RBAC separation",
      icon: ShieldCheck,
    },
    {
      label: "Time to Deploy",
      value: "10 sec",
      subtext: "1-line HTML snippet embed",
      icon: Clock,
    },
  ];

  return (
    <section className="border-y border-border/60 bg-surface/50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="size-4 text-action" />
                  <span className="text-[12px] font-medium text-text-muted">
                    {s.label}
                  </span>
                </div>
                <span className="text-[32px] sm:text-[38px] font-extrabold tracking-tight text-text">
                  {s.value}
                </span>
                <span className="text-[12px] text-text-muted mt-0.5">
                  {s.subtext}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

