"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "segmented";
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // SSR-safe mounted check using useSyncExternalStore without cascading setState
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div
        className={
          variant === "icon"
            ? "size-9 rounded-[10px] border border-border bg-surface"
            : "h-9 w-28 rounded-full border border-border bg-subtle"
        }
        aria-hidden="true"
      />
    );
  }

  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label="Appearance mode"
        className={`inline-flex items-center rounded-full border border-border bg-subtle p-0.5 text-xs ${className || ""}`}
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-all ${
            theme === "light"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
          aria-pressed={theme === "light"}
        >
          <Sun className="size-3.5" aria-hidden="true" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-all ${
            theme === "dark"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
          aria-pressed={theme === "dark"}
        >
          <Moon className="size-3.5" aria-hidden="true" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-all ${
            theme === "system"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
          aria-pressed={theme === "system"}
        >
          <Monitor className="size-3.5" aria-hidden="true" />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  // Default: Compact Apple-style Icon Toggle Button
  const handleToggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className={`size-9 p-0 rounded-[10px] border-border bg-surface text-text hover:bg-hover active:scale-[0.98] ${className || ""}`}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-4 text-action" aria-hidden="true" />
      ) : (
        <Moon className="size-4 text-text-muted" aria-hidden="true" />
      )}
    </Button>
  );
}

