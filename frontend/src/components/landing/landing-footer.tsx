"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40 py-12 text-[13px] text-text-muted">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-border/60">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-[9px] bg-[#0071E3] text-white">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <span className="font-semibold text-text text-[15px]">Feedback System</span>
              <p className="text-[12px] text-text-muted">
                Voice of Customer & Decision Engine
              </p>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="flex items-center gap-6">
            <Link href="#features" className="hover:text-text transition-colors">
              Features
            </Link>
            <Link href="#demo" className="hover:text-text transition-colors">
              Playground Demo
            </Link>
            <Link href="#how-it-works" className="hover:text-text transition-colors">
              How It Works
            </Link>
            <Link href="/login" className="hover:text-text transition-colors">
              Sign In
            </Link>
          </div>

          {/* Status Indicator & Theme Toggle */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
            <ThemeToggle variant="icon" />
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-text-muted">
          <span>© {new Date().getFullYear()} Feedback System, Inc. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-text cursor-pointer">Privacy Policy</span>
            <span className="hover:text-text cursor-pointer">Terms of Service</span>
            <span className="hover:text-text cursor-pointer">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

