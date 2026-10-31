import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

interface AuthHeaderProps {
  promptText?: string;
  actionText?: string;
  actionHref?: string;
}

export function AuthHeader({
  promptText,
  actionText,
  actionHref,
}: AuthHeaderProps) {
  return (
    <header className="flex w-full shrink-0 items-center justify-between pt-3.5 pb-1.5 sm:pt-6 sm:pb-2.5 lg:py-4">
      {/* Brand Logo and Title */}
      <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 focus:outline-none">
        <div className="flex size-8 sm:size-9 items-center justify-center rounded-[9px] sm:rounded-[10px] bg-[#0071E3] text-white shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
          <svg
            className="size-4 sm:size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="text-[15.5px] sm:text-[17px] font-semibold tracking-[-0.015em] text-[#0F172A] dark:text-white">
          Feedback System
        </span>
      </Link>

      {/* Right Navigation: Auth switch link & Theme Toggle */}
      <div className="flex items-center gap-3 sm:gap-4 text-[13px] sm:text-[14px]">
        {actionText && actionHref ? (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {promptText ? (
                <span className="hidden sm:inline text-[#64748B] dark:text-[#A1A1A6]">
                  {promptText}
                </span>
              ) : null}
              <Link
                href={actionHref}
                className="font-medium text-[#0071E3] hover:text-[#0077ED] underline-offset-4 hover:underline transition-colors dark:text-[#2997FF]"
              >
                {actionText}
              </Link>
            </div>
            <div className="h-3.5 sm:h-4 w-px bg-slate-300 dark:bg-neutral-800" aria-hidden="true" />
          </>
        ) : null}
        <ThemeToggle />
      </div>
    </header>
  );
}
