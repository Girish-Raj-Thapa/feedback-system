import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkspaceDashboardPage from "@/app/workspace/[workspaceSlug]/page";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { FeedbackSubmissionRead } from "@/types/feedback";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
  },
}));

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    listSubmissions: vi.fn(),
    getSubmission: vi.fn(),
    updateSubmission: vi.fn(),
    getCustomerHistory: vi.fn(),
    listCategories: vi.fn(),
    getInsights: vi.fn(),
    listForms: vi.fn(),
    loadSampleData: vi.fn(),
    clearSampleData: vi.fn(),
    exportSubmissionsCsv: vi.fn(),
    importSubmissions: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe("WorkspaceDashboardPage (Inbox)", () => {
  const wsSlug = "acme-corp";
  const wsId = "ws-123";
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  const mockMembership = {
    workspace_id: wsId,
    workspace_name: "Acme Corp",
    workspace_slug: wsSlug,
    role_id: "role-1",
    role_slug: "owner",
    role_name: "Owner",
    effective_permissions: [],
  };

  const mockWorkspaceDetails = {
    id: wsId,
    name: "Acme Corp",
    slug: wsSlug,
    industry: "SaaS",
    timezone: "UTC",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockSubmissions: FeedbackSubmissionRead[] = [
    {
      id: "sub-1",
      workspace_id: wsId,
      form_id: "form-1",
      category_id: "cat-1",
      category_pill_label: "Bug Report",
      rating: 5,
      rating_scale_type: "5_star",
      comment: "Super smooth and fast!",
      custom_answers: { role: "Product Manager" },
      customer_email: "alice@example.com",
      customer_name: "Alice",
      customer_metadata: {
        page_url: "https://example.com/pricing",
        user_agent: "Mozilla/5.0 Chrome",
      },
      status: "new",
      sentiment: "positive",
      created_at: "2026-11-02T10:00:00Z",
      updated_at: "2026-11-02T10:00:00Z",
    },
    {
      id: "sub-2",
      workspace_id: wsId,
      form_id: "form-1",
      category_id: null,
      category_pill_label: null,
      rating: 4,
      rating_scale_type: "5_emoji",
      comment: "Nice experience overall",
      custom_answers: {},
      customer_email: null,
      customer_name: null,
      customer_metadata: {},
      status: "new",
      sentiment: "positive",
      created_at: "2026-11-02T11:00:00Z",
      updated_at: "2026-11-02T11:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ workspaceSlug: wsSlug });
    (useRouter as any).mockReturnValue({ push: mockPush, replace: mockReplace });
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => (key === "tab" ? "inbox" : null),
    });
    useWorkspaceStore.setState({ workspaces: [mockMembership as any] });
    (authRepository.getWorkspace as any).mockResolvedValue(mockWorkspaceDetails);
    (feedbackRepository.getCustomerHistory as any).mockResolvedValue({
      customer_email: "alice@example.com",
      customer_name: "Alice",
      total_submissions: 2,
      avg_rating: 4.5,
      submissions: mockSubmissions,
    });
    (feedbackRepository.listCategories as any).mockResolvedValue([
      {
        id: "cat-1",
        workspace_id: wsId,
        name: "Bug Report",
        slug: "bug-report",
        description: "Bugs and errors",
        color: "#EF4444",
        icon: null,
        keywords: ["bug", "error"],
        is_uncategorized: false,
        is_active: true,
        display_order: 1,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      },
    ]);
    (feedbackRepository.listForms as any).mockResolvedValue([]);
    (feedbackRepository.getInsights as any).mockResolvedValue(null);
    (feedbackRepository.loadSampleData as any).mockResolvedValue({
      message: "Sample feedback loaded",
      count: 6,
    });
    (feedbackRepository.clearSampleData as any).mockResolvedValue({
      message: "Sample data cleared",
      count: 6,
    });
  });

  it("renders empty state when no feedback submissions exist", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("No feedback submissions yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Share your form link or install the embed widget/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Forms & Share" })
    ).toBeInTheDocument();
  });

  it("renders submissions in table when items exist", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1); // Count badge

    // First submission
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Super smooth and fast!")).toBeInTheDocument();
    expect(screen.getAllByText("Bug Report").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getAllByText("Positive").length).toBeGreaterThanOrEqual(2);

    // Second anonymous submission
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("Nice experience overall")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();

    // Footer
    expect(screen.getByText("Showing 2 of 2 submissions")).toBeInTheDocument();
  });

  it("opens inspection drawer when a submission row is clicked and closes on close button", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Feedback submission details" })
    ).not.toBeInTheDocument();

    // Click row with Alice
    fireEvent.click(screen.getByText("Alice"));

    // Drawer opens
    expect(
      screen.getByRole("dialog", { name: "Feedback submission details" })
    ).toBeInTheDocument();
    expect(screen.getByText("Submission Details")).toBeInTheDocument();
    expect(screen.getByText("Verbatim Feedback")).toBeInTheDocument();
    expect(
      screen.getByText("Custom Questions & Responses")
    ).toBeInTheDocument();
    expect(screen.getByText("Product Manager")).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/pricing")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Positive").length).toBeGreaterThanOrEqual(2);

    // Close via close button
    const closeBtn = screen.getByLabelText("Close details drawer");
    fireEvent.click(closeBtn);

    expect(
      screen.queryByRole("dialog", { name: "Feedback submission details" })
    ).not.toBeInTheDocument();
  });

  it("closes drawer when Escape key is pressed", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));
    expect(
      screen.getByRole("dialog", { name: "Feedback submission details" })
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Feedback submission details" })
    ).not.toBeInTheDocument();
  });

  it("allows triaging submission status by marking as resolved or in progress", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.updateSubmission as any).mockResolvedValue({
      ...mockSubmissions[0],
      status: "resolved",
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    const markResolvedBtn = screen.getByRole("button", {
      name: /Mark Resolved/i,
    });
    fireEvent.click(markResolvedBtn);

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { status: "resolved" }
    );
    await waitFor(() => {
      expect(screen.getAllByText("Resolved").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("allows marking submission as in progress", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.updateSubmission as any).mockResolvedValue({
      ...mockSubmissions[0],
      status: "in_progress",
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    const markInProgressBtn = screen.getByRole("button", {
      name: /Mark In Progress/i,
    });
    fireEvent.click(markInProgressBtn);

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { status: "in_progress" }
    );
    await waitFor(() => {
      expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("provides 1-click mailto reply link when customer email is present", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    const replyLink = screen.getByRole("link", { name: /Reply to Customer/i });
    expect(replyLink).toBeInTheDocument();
    expect(replyLink).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:alice@example.com")
    );
    expect(replyLink.getAttribute("href")).toContain(
      encodeURIComponent("Super smooth and fast!")
    );
  });

  it("allows overriding category and sentiment directly from the drawer", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.updateSubmission as any).mockResolvedValue({
      ...mockSubmissions[0],
      category_id: "cat-1",
      category_pill_label: "Bug Report",
      sentiment: "negative",
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    // Category override
    const catSelect = screen.getByLabelText("Category");
    fireEvent.change(catSelect, { target: { value: "cat-1" } });

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { category_id: "cat-1" }
    );

    // Sentiment override
    const sentSelect = screen.getByLabelText("Sentiment");
    fireEvent.change(sentSelect, { target: { value: "negative" } });

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { sentiment: "negative" }
    );
  });

  it("allows triaging submission status by archiving", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.updateSubmission as any).mockResolvedValue({
      ...mockSubmissions[0],
      status: "archived",
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    const archiveBtn = screen.getByRole("button", { name: /^Archive$/i });
    fireEvent.click(archiveBtn);

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { status: "archived" }
    );
    expect((await screen.findAllByText("Archived")).length).toBeGreaterThanOrEqual(1);
  });

  it("loads and displays customer history when customer email is present", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    expect(await screen.findByText("Customer Activity")).toBeInTheDocument();
    expect(screen.getByText(/2 submissions • Avg 4.5 ★/i)).toBeInTheDocument();
    expect(
      screen.getByText("All submissions from this customer:")
    ).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("filters submissions when status tab is selected", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);
    expect(await screen.findByText("Alice")).toBeInTheDocument();

    const inProgressTab = screen.getByRole("button", { name: "In Progress" });
    fireEvent.click(inProgressTab);

    await waitFor(() => {
      expect(feedbackRepository.listSubmissions).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({
          status: "in_progress",
        })
      );
    });
  });

  it("filters submissions by category and sentiment dropdowns", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);
    expect(await screen.findByText("Alice")).toBeInTheDocument();

    // Select category
    const catSelect = screen.getByLabelText("Filter by category");
    fireEvent.change(catSelect, { target: { value: "cat-1" } });

    // Select sentiment
    const sentSelect = screen.getByLabelText("Filter by sentiment");
    fireEvent.change(sentSelect, { target: { value: "negative" } });

    await waitFor(() => {
      expect(feedbackRepository.listSubmissions).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({
          category_id: "cat-1",
          sentiment: "negative",
        })
      );
    });
  });

  it("renders filtered empty state when search finds no results", async () => {
    (feedbackRepository.listSubmissions as any)
      .mockResolvedValueOnce({
        items: mockSubmissions,
        total: 2,
        limit: 50,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

    render(<WorkspaceDashboardPage />);
    expect(await screen.findByText("Alice")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(
      "Search comments, customer, or email…"
    );
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(await screen.findByText("No matching feedback")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Reset Filters" }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("automatically opens FeedbackDetailDrawer when ?tab=inbox&id=... is present in searchParams", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "tab") return "inbox";
        if (key === "id") return "sub-1";
        return null;
      },
      toString: () => "tab=inbox&id=sub-1",
    });

    render(<WorkspaceDashboardPage />);
    const aliceNodes = await screen.findAllByText("Alice");
    expect(aliceNodes.length).toBeGreaterThanOrEqual(1);

    // Verify detail drawer header/content for sub-1 is rendered
    expect(await screen.findByText("Submission Details")).toBeInTheDocument();
    expect(screen.getByLabelText("Feedback submission details")).toBeInTheDocument();
  });

  it("filters by Quarantined and Spam tabs, shows held reasons, and allows marking spam", async () => {
    const quarantinedSubmission: FeedbackSubmissionRead = {
      ...mockSubmissions[0],
      id: "sub-q1",
      status: "quarantined",
      spam_score: 2,
      spam_reasons: ["suspicious_links", "heuristic_threshold"],
      comment: "Check out this weird promo link",
    };

    (feedbackRepository.listSubmissions as any).mockImplementation(
      async (_wsId: string, params?: { status?: string }) => {
        if (params?.status === "quarantined") {
          return {
            items: [quarantinedSubmission],
            total: 1,
            limit: 50,
            offset: 0,
          };
        }
        return {
          items: mockSubmissions,
          total: mockSubmissions.length,
          limit: 50,
          offset: 0,
        };
      }
    );
    (feedbackRepository.getSubmission as any).mockResolvedValue(quarantinedSubmission);
    (feedbackRepository.updateSubmission as any).mockResolvedValue({
      ...quarantinedSubmission,
      status: "spam",
    });

    render(<WorkspaceDashboardPage />);

    const quarantinedTab = await screen.findByRole("button", { name: "Quarantined" });
    const spamTab = screen.getByRole("button", { name: "Spam" });
    expect(quarantinedTab).toBeInTheDocument();
    expect(spamTab).toBeInTheDocument();

    fireEvent.click(quarantinedTab);

    await waitFor(() => {
      expect(feedbackRepository.listSubmissions).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({ status: "quarantined" })
      );
    });

    const row = await screen.findByText("Check out this weird promo link");
    fireEvent.click(row);

    expect(await screen.findByText("Held in Quarantine")).toBeInTheDocument();
    expect(
      screen.getByText("Signals: suspicious_links, heuristic_threshold")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark Spam" }));
    await waitFor(() => {
      expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(wsId, "sub-q1", {
        status: "spam",
      });
    });

    fireEvent.click(spamTab);
    await waitFor(() => {
      expect(feedbackRepository.listSubmissions).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({ status: "spam" })
      );
    });
  });

  it("exports filtered submissions to CSV from the inbox toolbar", async () => {
    const csvBlob = new Blob(["id,comment\n"], { type: "text/csv" });
    (feedbackRepository.exportSubmissionsCsv as any).mockResolvedValue(csvBlob);

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectUrlMock = vi.fn(() => "blob:mock-csv-url");
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectUrlMock,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    try {
      render(<WorkspaceDashboardPage />);

      const exportButton = await screen.findByRole("button", { name: "Export CSV" });
      fireEvent.click(screen.getByRole("button", { name: "Spam" }));
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(feedbackRepository.exportSubmissionsCsv).toHaveBeenCalledWith(
          wsId,
          expect.objectContaining({ status: "spam" })
        );
      });
      expect(createObjectUrlMock).toHaveBeenCalledWith(csvBlob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:mock-csv-url");
    } finally {
      clickSpy.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    }
  });

  it("opens ImportFeedbackModal from Inbox toolbar and refreshes submissions after import", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.importSubmissions as any).mockResolvedValue({
      imported_count: 1,
      skipped_count: 0,
      categorized_count: 0,
      form_id: "form-1",
      errors: [],
    });

    render(<WorkspaceDashboardPage />);

    const importToolbarBtn = await screen.findByRole("button", { name: "Import" });
    fireEvent.click(importToolbarBtn);

    expect(
      await screen.findByRole("dialog", { name: "Import customer feedback" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Paste feedback" }));
    fireEvent.change(screen.getByLabelText("Pasted feedback lines"), {
      target: { value: "Great onboarding walkthrough!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import responses" }));

    await waitFor(() => {
      expect(feedbackRepository.importSubmissions).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({
          default_source: "manual_paste",
          paste_lines: ["Great onboarding walkthrough!"],
        })
      );
    });
    await waitFor(() => {
      expect(feedbackRepository.listSubmissions).toHaveBeenCalledTimes(2);
    });
  });
});

