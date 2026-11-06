import { render, screen, waitFor, act } from "@testing-library/react";
import SlackOAuthCallbackPage from "@/app/integrations/slack/callback/page";
import { notificationsRepository } from "@/repositories/notifications.repository";
import { useRouter, useSearchParams } from "next/navigation";

vi.mock("@/repositories/notifications.repository", () => ({
  notificationsRepository: {
    completeSlackOAuth: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SlackOAuthCallbackPage", () => {
  const mockReplace = vi.fn();
  let mockSearchParams = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map<string, string>();

    (useRouter as any).mockReturnValue({
      replace: mockReplace,
    });

    (useSearchParams as any).mockImplementation(() => ({
      get: (key: string) => mockSearchParams.get(key) || null,
    }));
  });

  it("handles user cancellation (error=access_denied) and redirects to dashboard", async () => {
    vi.useFakeTimers();
    mockSearchParams.set("error", "access_denied");

    render(<SlackOAuthCallbackPage />);

    expect(screen.getByText("Installation Cancelled")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    vi.useRealTimers();
  });

  it("displays error when code or state is missing", async () => {
    mockSearchParams.set("code", "slack-code-123");
    // Missing state

    render(<SlackOAuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Connection Failed")).toBeInTheDocument();
      expect(
        screen.getByText("Missing authorization code or state token from Slack.")
      ).toBeInTheDocument();
    });
  });

  it("successfully completes OAuth exchange and redirects to workspace integrations tab", async () => {
    vi.useFakeTimers();
    mockSearchParams.set("code", "valid-code");
    mockSearchParams.set("state", "valid-state");

    vi.mocked(notificationsRepository.completeSlackOAuth).mockResolvedValue({
      connection_id: "conn-123",
      channel_name: "feedback-alerts",
      team_name: "Acme Corp",
      workspace_slug: "acme-hq",
    });

    render(<SlackOAuthCallbackPage />);

    // Initially shows Connecting
    expect(screen.getByText("Connecting Slack Channel...")).toBeInTheDocument();

    // Flush promises
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(notificationsRepository.completeSlackOAuth).toHaveBeenCalledWith({
      code: "valid-code",
      state: "valid-state",
    });
    expect(screen.getByText("Slack Channel Connected!")).toBeInTheDocument();

    // Advance 1200ms timer for the automatic redirect
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      "/workspace/acme-hq/settings?tab=integrations&connected=slack"
    );
    vi.useRealTimers();
  });

  it("displays API failure message when token exchange fails", async () => {
    mockSearchParams.set("code", "bad-code");
    mockSearchParams.set("state", "bad-state");

    vi.mocked(notificationsRepository.completeSlackOAuth).mockRejectedValue(
      new Error("State token expired or invalid")
    );

    render(<SlackOAuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Connection Failed")).toBeInTheDocument();
      expect(
        screen.getByText("State token expired or invalid")
      ).toBeInTheDocument();
    });
  });
});
