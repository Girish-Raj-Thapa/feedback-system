import { cn } from "@/utils/cn";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    expect(cn("base-class", true && "active", false && "disabled")).toBe("base-class active");
  });

  it("deduplicates conflicting Tailwind classes using tailwind-merge", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles null, undefined, and empty strings gracefully", () => {
    expect(cn("px-2", null, undefined, "")).toBe("px-2");
  });
});

