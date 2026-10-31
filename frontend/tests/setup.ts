import "@testing-library/jest-dom";

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
jest.mock("next/navigation", () => {
  const actual = jest.requireActual("next/navigation");
  return {
    ...actual,
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    })),
    usePathname: jest.fn(() => "/dashboard/workspaces"),
    useSearchParams: jest.fn(() => new URLSearchParams()),
    useParams: jest.fn(() => ({})),
  };
});

// Mock sonner toast notifications
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

