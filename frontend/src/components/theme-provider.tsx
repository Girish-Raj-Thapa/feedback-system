"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    mediaQuery.removeEventListener("change", callback);
  };
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && ["light", "dark", "system"].includes(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access error
  }
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore<Theme>(
    subscribeToTheme,
    getStoredTheme,
    () => "system" as Theme
  );

  const [localTheme, setLocalTheme] = React.useState<Theme | null>(null);
  const activeTheme = localTheme ?? theme;

  const resolvedTheme: "light" | "dark" = React.useMemo(() => {
    if (activeTheme === "dark") return "dark";
    if (activeTheme === "light") return "light";
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  }, [activeTheme]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-transitioning");
    const timeout = setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 180);

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    return () => clearTimeout(timeout);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setLocalTheme(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
      document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore persistence error
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
