import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Polyfill Web Fetch APIs for next/server NextRequest/NextResponse in jsdom
if (typeof global.Request === "undefined" && typeof globalThis.Request !== "undefined") {
  global.Request = globalThis.Request;
}
if (typeof global.Response === "undefined" && typeof globalThis.Response !== "undefined") {
  global.Response = globalThis.Response;
}
if (typeof global.Headers === "undefined" && typeof globalThis.Headers !== "undefined") {
  global.Headers = globalThis.Headers;
}

// Mock window.matchMedia for responsive/dark mode tests
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock Next.js navigation hooks
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    })),
    usePathname: vi.fn(() => "/dashboard/workspaces"),
    useSearchParams: vi.fn(() => new URLSearchParams()),
    useParams: vi.fn(() => ({})),
  };
});

import React from "react";

// Mock next/link to prevent JSDOM navigation error on click
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...rest }: any) =>
    React.createElement(
      "a",
      {
        href,
        onClick: (e: any) => {
          e.preventDefault();
          onClick?.(e);
        },
        ...rest,
      },
      children
    ),
}));

// Mock sonner toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
