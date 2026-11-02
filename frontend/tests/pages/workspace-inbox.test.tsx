import { fireEvent, render, screen } from "@testing-library/react";
import WorkspaceDashboardPage from "@/app/workspace/[workspaceSlug]/page";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useParams, useRouter } from "next/navigation";
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
    updateSubmission: vi.fn(),
    getCustomerHistory: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
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
    useWorkspaceStore.setState({ workspaces: [mockMembership as any] });
    (authRepository.getWorkspace as any).mockResolvedValue(mockWorkspaceDetails);
    (feedbackRepository.getCustomerHistory as any).mockResolvedValue({
      customer_email: "alice@example.com",
      customer_name: "Alice",
      total_submissions: 2,
      avg_rating: 4.5,
      submissions: mockSubmissions,
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

    expect(await screen.findByText("Feedback Inbox")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Count badge

    // First submission
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Super smooth and fast!")).toBeInTheDocument();
    expect(screen.getByText("Bug Report")).toBeInTheDocument();
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getAllByText("Positive")).toHaveLength(2);

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
    expect(screen.getAllByText("Positive")).toHaveLength(3);

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

  it("allows triaging submission status by marking as reviewed", async () => {
    (feedbackRepository.listSubmissions as any).mockResolvedValue({
      items: mockSubmissions,
      total: 2,
      limit: 50,
      offset: 0,
    });
    (feedbackRepository.updateSubmission as any).mockResolvedValue({
      ...mockSubmissions[0],
      status: "reviewed",
    });

    render(<WorkspaceDashboardPage />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alice"));

    const markReviewedBtn = screen.getByRole("button", {
      name: /Mark Reviewed/i,
    });
    fireEvent.click(markReviewedBtn);

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { status: "reviewed" }
    );
    expect(await screen.findAllByText("Reviewed")).toHaveLength(2);
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

    const archiveBtn = screen.getByRole("button", { name: /Archive/i });
    fireEvent.click(archiveBtn);

    expect(feedbackRepository.updateSubmission).toHaveBeenCalledWith(
      wsId,
      "sub-1",
      { status: "archived" }
    );
    expect(await screen.findAllByText("Archived")).toHaveLength(2);
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
});

