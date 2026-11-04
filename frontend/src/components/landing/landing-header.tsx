"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, MessageSquare, Sparkles, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/auth.store";

export function LandingHeader() {
  const { user, isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const dashboardHref =
    user?.workspaces && user.workspaces.length > 0
      ? `/workspace/${user.workspaces[0].workspace_slug}`
      : "/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-canvas/80 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 outline-none transition-transform active:scale-95"
        >
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0071E3] text-white shadow-sm transition-transform duration-200 group-hover:scale-105 dark:bg-[#0077ED]">
            <MessageSquare className="size-4.5 stroke-[2]" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-text">
            Feedback System
          </span>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-8 text-[14px] font-medium text-text-muted"
        >
          <Link
            href="#features"
            className="transition-colors hover:text-text focus-visible:outline-focus-ring"
          >
            Features
          </Link>
          <Link
            href="#demo"
            className="flex items-center gap-1.5 transition-colors hover:text-text focus-visible:outline-focus-ring"
          >
            <Sparkles className="size-3.5 text-[#0071E3] dark:text-[#2997FF]" />
            <span>Live Demo</span>
          </Link>
          <Link
            href="#how-it-works"
            className="transition-colors hover:text-text focus-visible:outline-focus-ring"
          >
            How It Works
          </Link>
        </nav>

        {/* Right CTA / Session buttons & Theme Toggle */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle variant="icon" />

          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-[10px] bg-subtle" />
          ) : isAuthenticated ? (
            <Link
              href={dashboardHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-action px-3.5 text-[13px] font-medium text-text-on-action shadow-xs transition-colors hover:bg-action-hover active:scale-[0.98]"
            >
              <span>Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-[10px] px-3 text-[13px] font-medium text-text-muted transition-colors hover:text-text hover:bg-hover"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-action px-3.5 text-[13px] font-medium text-text-on-action shadow-xs transition-colors hover:bg-action-hover active:scale-[0.98]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle variant="icon" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="flex size-9 items-center justify-center rounded-[10px] border border-border text-text hover:bg-hover"
          >
            {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-surface px-4 py-4 sm:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-3 text-[14px] font-medium text-text-muted">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-2 py-1.5 hover:bg-hover hover:text-text"
            >
              Features
            </Link>
            <Link
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover hover:text-text"
            >
              <Sparkles className="size-4 text-[#0071E3] dark:text-[#2997FF]" />
              <span>Live Demo</span>
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-2 py-1.5 hover:bg-hover hover:text-text"
            >
              How It Works
            </Link>

            <div className="my-2 border-t border-border pt-3">
              {isAuthenticated ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-action text-[13px] font-medium text-text-on-action shadow-xs"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-10 w-full items-center justify-center rounded-[10px] border border-border bg-surface text-[13px] font-medium text-text"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-action text-[13px] font-medium text-text-on-action shadow-xs"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

