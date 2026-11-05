import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkspaceDashboardPage from "@/app/workspace/[workspaceSlug]/page";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { FeedbackInsightsResponse, FeedbackSubmissionRead } from "@/types/feedback";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
  },
}));

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    listSubmissions: vi.fn(),
    updateSubmission: vi.fn(),
    getCustomerHistory: vi.fn(),
    listCategories: vi.fn(),
    getInsights: vi.fn(),
    listForms: vi.fn(),
    loadSampleData: vi.fn(),
    clearSampleData: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe("WorkspaceDashboardPage (Insights & Score Drivers)", () => {
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

  const mockInsights: FeedbackInsightsResponse = {
    summary: {
      total_submissions: 30,
      rated_submissions_count: 28,
      average_rating: 4.1,
      sentiment_breakdown: {
        positive: 20,
        neutral: 6,
        negative: 4,
      },
      at_risk_count: 3,
      top_negative_driver: {
        category_id: "cat-pricing",
        category_name: "Pricing & Billing",
        average_rating: 2.3,
        score_impact: -1.8,
        count: 8,
      },
      top_positive_driver: {
        category_id: "cat-ux",
        category_name: "Speed & Performance",
        average_rating: 4.8,
        score_impact: 0.7,
        count: 15,
      },
    },
    categories: [
      {
        category_id: "cat-ux",
        category_name: "Speed & Performance",
        color: "#10B981",
        icon: null,
        count: 15,
        percentage: 50.0,
        average_rating: 4.8,
        score_impact: 0.7,
        sentiment_counts: { positive: 13, neutral: 2, negative: 0 },
      },
      {
        category_id: "cat-pricing",
        category_name: "Pricing & Billing",
        color: "#EF4444",
        icon: null,
        count: 8,
        percentage: 26.7,
        average_rating: 2.3,
        score_impact: -1.8,
        sentiment_counts: { positive: 1, neutral: 3, negative: 4 },
      },
    ],
  };

  const mockSubmissions: FeedbackSubmissionRead[] = [
    {
      id: "sub-1",
      workspace_id: wsId,
      form_id: "form-1",
      category_id: "cat-pricing",
      category_pill_label: "Pricing & Billing",
      rating: 2,
      rating_scale_type: "5_star",
      comment: "Pricing is way too steep for solopreneurs.",
      custom_answers: {},
      customer_email: "bob@example.com",
      customer_name: "Bob",
      customer_metadata: {},
      status: "new",
      sentiment: "negative",
      created_at: "2026-11-02T10:00:00Z",
      updated_at: "2026-11-02T10:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ workspaceSlug: wsSlug });
    (useRouter as any).mockReturnValue({ push: mockPush, replace: mockReplace });
    (useSearchParams as any).mockReturnValue({ get: () => null });
    useWorkspaceStore.setState({ workspaces: [mockMembership as any] });
    (authRepository.getWorkspace as any).mockResolvedValue(mockWorkspaceDetails);
    (feedbackRepository.listCategories as any).mockResolvedValue([]);
    (feedbackRepository.listForms as any).mockResolvedValue([]);
    (feedbackRepository.loadSampleData as any).mockResolvedValue({
      message: "Sample feedback loaded",
      count: 6,
    });
    (feedbackRepository.clearSampleData as any).mockResolvedValue({
      message: "Sample data cleared",
      count: 6,
    });
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 1,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.getInsights as any).mockResolvedValue(mockInsights);
  });

  it("renders Insights as the default view with Top Decision Cards", async () => {
    render(<WorkspaceDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByText(/How customers rate you, and what's moving the score/i)).toBeInTheDocument();

    // Overall satisfaction card
    expect(screen.getByText("4.1 ★")).toBeInTheDocument();
    expect(screen.getByText(/from 30 responses/i)).toBeInTheDocument();
    expect(screen.getByText(/20 positive/i)).toBeInTheDocument();
    expect(screen.getByText(/4 negative/i)).toBeInTheDocument();

    // Top Negative Driver card
    expect(screen.getAllByText("Pricing & Billing").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-1.8 ★ Drag")).toBeInTheDocument();

    // Top Positive Driver card
    expect(screen.getAllByText("Speed & Performance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("+0.7 ★ Boost")).toBeInTheDocument();

    // At-Risk Customers card
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("need a reply")).toBeInTheDocument();
  });

  it("renders Categories table with volume and score impact", async () => {
    render(<WorkspaceDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Categories" })).toBeInTheDocument();

    // Table rows
    expect(screen.getAllByText("Speed & Performance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pricing & Billing").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("4.8 ★")).toBeInTheDocument();
    expect(screen.getByText("2.3 ★")).toBeInTheDocument();
  });

  it("changes timeframe and fetches updated insights", async () => {
    render(<WorkspaceDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Insights" })).toBeInTheDocument();

    const last7DaysBtn = screen.getByRole("button", { name: "Last 7 days" });
    fireEvent.click(last7DaysBtn);

    await waitFor(() => {
      expect(feedbackRepository.getInsights).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({ days: 7 })
      );
    });
  });

  it("allows switching between Insights view and Feedback Inbox view", async () => {
    render(<WorkspaceDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Insights" })).toBeInTheDocument();

    // Click Inbox pill in view switcher
    const inboxBtn = screen.getByRole("button", { name: /^Inbox/i });
    fireEvent.click(inboxBtn);

    expect(await screen.findByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByText("Pricing is way too steep for solopreneurs.")).toBeInTheDocument();

    // Click back to Insights
    const insightsBtn = screen.getByRole("button", { name: "Insights" });
    fireEvent.click(insightsBtn);

    expect(await screen.findByRole("heading", { name: "Insights" })).toBeInTheDocument();
  });

  it("drills down into Inbox prefiltered by category when 'Inspect feedback' is clicked", async () => {
    render(<WorkspaceDashboardPage />);

    expect(await screen.findByRole("heading", { name: "Insights" })).toBeInTheDocument();

    const inspectBtn = screen.getByRole("button", { name: /Inspect feedback/i });
    fireEvent.click(inspectBtn);

    expect(await screen.findByRole("heading", { name: "Inbox" })).toBeInTheDocument();
  });

  it("renders empty state when no feedback exists in the selected timeframe", async () => {
    (feedbackRepository.getInsights as any).mockResolvedValue({
      summary: {
        total_submissions: 0,
        rated_submissions_count: 0,
        average_rating: null,
        sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
        at_risk_count: 0,
        top_negative_driver: null,
        top_positive_driver: null,
      },
      categories: [],
    });

    render(<WorkspaceDashboardPage />);

    expect(
      await screen.findByText("No feedback collected in this timeframe")
    ).toBeInTheDocument();
  });

  it("renders Sample Data Active notice when has_sample_data is true and triggers clearSampleData", async () => {
    (feedbackRepository.getInsights as any).mockResolvedValue({
      ...mockInsights,
      summary: {
        ...mockInsights.summary,
        has_sample_data: true,
      },
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText(/Sample Data Active/i)).toBeInTheDocument();

    const clearBtns = screen.getAllByRole("button", { name: /Clear Sample Data/i });
    expect(clearBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(clearBtns[0]);

    await waitFor(() => {
      expect(feedbackRepository.clearSampleData).toHaveBeenCalledWith(wsId);
    });
  });

  it("triggers loadSampleData when 'Load Sample Feedback' is clicked in empty state", async () => {
    (feedbackRepository.getInsights as any).mockResolvedValue({
      summary: {
        total_submissions: 0,
        rated_submissions_count: 0,
        average_rating: null,
        sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
        at_risk_count: 0,
        has_sample_data: false,
        top_negative_driver: null,
        top_positive_driver: null,
      },
      categories: [],
    });
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    render(<WorkspaceDashboardPage />);

    expect(
      await screen.findByText("No feedback collected in this timeframe")
    ).toBeInTheDocument();

    const loadBtns = screen.getAllByRole("button", { name: /Load Sample Feedback/i });
    expect(loadBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(loadBtns[0]);

    await waitFor(() => {
      expect(feedbackRepository.loadSampleData).toHaveBeenCalledWith(wsId);
    });
  });
});
