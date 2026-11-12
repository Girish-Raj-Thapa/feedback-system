import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import DashboardWorkspacesRedirectPage from "@/app/dashboard/workspaces/page";

describe("DashboardWorkspacesRedirectPage", () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it("redirects legacy /dashboard/workspaces route to /dashboard", async () => {
    render(<DashboardWorkspacesRedirectPage />);

    expect(screen.getByText("Redirecting to your workspace…")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });
});
