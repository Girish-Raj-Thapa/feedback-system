import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DecisionLogDialog } from "@/components/workspace/decision-log-dialog";
import { WorkspaceInsightsTab } from "@/components/workspace/workspace-insights-tab";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { toast } from "sonner";
import type {
  DecisionLogRead,
  FeedbackCategory,
  FeedbackInsightsResponse,
} from "@/types/feedback";

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    listDecisionLogs: vi.fn(),
    createDecisionLog: vi.fn(),
    updateDecisionLog: vi.fn(),
    deleteDecisionLog: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Decision Log Feature", () => {
  const workspaceId = "ws-test-123";

  const mockCategories: FeedbackCategory[] = [
    {
      id: "cat-pricing",
      workspace_id: workspaceId,
      name: "Pricing & Billing",
      slug: "pricing-billing",
      description: "Subscriptions and pricing",
      color: "#10B981",
      icon: null,
      keywords: ["pricing", "cost"],
      is_uncategorized: false,
      is_active: true,
      display_order: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "cat-bugs",
      workspace_id: workspaceId,
      name: "Bugs & Errors",
      slug: "bugs-errors",
      description: "Software bugs",
      color: "#EF4444",
      icon: null,
      keywords: ["bug", "crash"],
      is_uncategorized: false,
      is_active: true,
      display_order: 2,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockDecisionLog: DecisionLogRead = {
    id: "dl-1",
    workspace_id: workspaceId,
    category_id: "cat-pricing",
    category_name: "Pricing & Billing",
    category_color: "#10B981",
    title: "Simplified Pricing Tiers & Added Annual Discount",
    description: "Replaced confusing add-ons with 3 standard tiers.",
    decision_date: "2024-02-15",
    created_by_user_id: "usr-admin",
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-02-15T10:00:00Z",
    impact: {
      before: {
        start_date: "2024-01-16T00:00:00Z",
        end_date: "2024-02-15T00:00:00Z",
        total_submissions: 24,
        average_rating: 3.2,
        negative_count: 9,
        negative_percentage: 37.5,
      },
      after: {
        start_date: "2024-02-15T00:00:00Z",
        end_date: "2024-03-16T00:00:00Z",
        total_submissions: 30,
        average_rating: 4.4,
        negative_count: 3,
        negative_percentage: 10.0,
      },
      score_delta: 1.2,
      complaint_share_delta: -27.5,
      status: "positive_impact",
    },
  };

  const mockInsights: FeedbackInsightsResponse = {
    summary: {
      total_submissions: 54,
      rated_submissions_count: 50,
      average_rating: 4.1,
      sentiment_breakdown: { positive: 40, neutral: 5, negative: 9 },
      at_risk_count: 2,
      has_sample_data: false,
      top_negative_driver: null,
      top_positive_driver: null,
    },
    categories: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DecisionLogDialog", () => {
    it("renders modal dialog in create mode", () => {
      render(
        <DecisionLogDialog
          isOpen={true}
          onClose={vi.fn()}
          workspaceId={workspaceId}
          categories={mockCategories}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByText("Log Business Milestone")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Redesigned pricing page/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Record Milestone" })).toBeInTheDocument();
    });

    it("validates required fields before submitting", async () => {
      render(
        <DecisionLogDialog
          isOpen={true}
          onClose={vi.fn()}
          workspaceId={workspaceId}
          categories={mockCategories}
          onSuccess={vi.fn()}
        />
      );

      // Clear title and submit
      fireEvent.click(screen.getByRole("button", { name: "Record Milestone" }));

      expect(await screen.findByText("Decision title is required.")).toBeInTheDocument();
      expect(feedbackRepository.createDecisionLog).not.toHaveBeenCalled();
    });

    it("successfully creates a new decision milestone", async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      (feedbackRepository.createDecisionLog as any).mockResolvedValue(mockDecisionLog);

      render(
        <DecisionLogDialog
          isOpen={true}
          onClose={onClose}
          workspaceId={workspaceId}
          categories={mockCategories}
          onSuccess={onSuccess}
        />
      );

      fireEvent.change(
        screen.getByPlaceholderText(/e\.g\. Redesigned pricing page/i),
        { target: { value: "New Checkout Flow" } }
      );
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "cat-pricing" },
      });
      fireEvent.change(
        screen.getByPlaceholderText(/What problem were you solving\?/i),
        { target: { value: "Hypothesis: checkout dropoff was due to friction." } }
      );

      fireEvent.click(screen.getByRole("button", { name: "Record Milestone" }));

      await waitFor(() => {
        expect(feedbackRepository.createDecisionLog).toHaveBeenCalledWith(
          workspaceId,
          expect.objectContaining({
            title: "New Checkout Flow",
            category_id: "cat-pricing",
            description: "Hypothesis: checkout dropoff was due to friction.",
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Decision milestone recorded successfully");
      expect(onSuccess).toHaveBeenCalledWith(mockDecisionLog);
      expect(onClose).toHaveBeenCalled();
    });

    it("prefills data in edit mode and updates milestone", async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      const updatedLog = { ...mockDecisionLog, title: "Updated Title" };
      (feedbackRepository.updateDecisionLog as any).mockResolvedValue(updatedLog);

      render(
        <DecisionLogDialog
          isOpen={true}
          onClose={onClose}
          workspaceId={workspaceId}
          categories={mockCategories}
          existingDecision={mockDecisionLog}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText("Edit Decision Milestone")).toBeInTheDocument();
      const titleInput = screen.getByDisplayValue(mockDecisionLog.title);
      fireEvent.change(titleInput, { target: { value: "Updated Title" } });

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(feedbackRepository.updateDecisionLog).toHaveBeenCalledWith(
          workspaceId,
          mockDecisionLog.id,
          expect.objectContaining({
            title: "Updated Title",
            category_id: "cat-pricing",
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Decision milestone updated successfully");
      expect(onSuccess).toHaveBeenCalledWith(updatedLog);
      expect(onClose).toHaveBeenCalled();
    });

    it("handles API error gracefully on save", async () => {
      (feedbackRepository.createDecisionLog as any).mockRejectedValue(
        new Error("Network timeout")
      );

      render(
        <DecisionLogDialog
          isOpen={true}
          onClose={vi.fn()}
          workspaceId={workspaceId}
          categories={mockCategories}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(
        screen.getByPlaceholderText(/e\.g\. Redesigned pricing page/i),
        { target: { value: "New Feature" } }
      );
      fireEvent.click(screen.getByRole("button", { name: "Record Milestone" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network timeout");
      });
    });
  });

  describe("WorkspaceInsightsTab Decision Milestones Section", () => {
    it("renders empty state when no decisions recorded yet", async () => {
      (feedbackRepository.listDecisionLogs as any).mockResolvedValue({
        items: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      render(
        <WorkspaceInsightsTab
          insights={mockInsights}
          isLoading={false}
          selectedDays={30}
          onDaysChange={vi.fn()}
          onDrillDownCategory={vi.fn()}
          onDrillDownAtRisk={vi.fn()}
          workspaceId={workspaceId}
          workspaceCategories={mockCategories}
        />
      );

      expect(screen.getByRole("heading", { name: /Decision Milestones/i })).toBeInTheDocument();
      expect(
        await screen.findByText("No decision milestones recorded yet")
      ).toBeInTheDocument();
      expect(screen.getByText("Record your first decision")).toBeInTheDocument();
    });

    it("renders decision log cards with Before vs After 30d impact comparison", async () => {
      (feedbackRepository.listDecisionLogs as any).mockResolvedValue({
        items: [mockDecisionLog],
        total: 1,
        limit: 50,
        offset: 0,
      });

      render(
        <WorkspaceInsightsTab
          insights={mockInsights}
          isLoading={false}
          selectedDays={30}
          onDaysChange={vi.fn()}
          onDrillDownCategory={vi.fn()}
          onDrillDownAtRisk={vi.fn()}
          workspaceId={workspaceId}
          workspaceCategories={mockCategories}
        />
      );

      // Card Header & Meta
      expect(
        await screen.findByText(mockDecisionLog.title)
      ).toBeInTheDocument();
      expect(screen.getByText("Pricing & Billing")).toBeInTheDocument();
      expect(screen.getByText("Positive Impact")).toBeInTheDocument();

      // Before vs After Metrics
      expect(screen.getByText("3.2 ★")).toBeInTheDocument();
      expect(screen.getByText("4.4 ★")).toBeInTheDocument();
      expect(screen.getByText(/\+1\.2/)).toBeInTheDocument();
      expect(screen.getByText(/-28% complaints/)).toBeInTheDocument();
    });

    it("deletes decision log when delete button is confirmed", async () => {
      (feedbackRepository.listDecisionLogs as any).mockResolvedValue({
        items: [mockDecisionLog],
        total: 1,
        limit: 50,
        offset: 0,
      });
      (feedbackRepository.deleteDecisionLog as any).mockResolvedValue(undefined);

      render(
        <WorkspaceInsightsTab
          insights={mockInsights}
          isLoading={false}
          selectedDays={30}
          onDaysChange={vi.fn()}
          onDrillDownCategory={vi.fn()}
          onDrillDownAtRisk={vi.fn()}
          workspaceId={workspaceId}
          workspaceCategories={mockCategories}
        />
      );

      expect(await screen.findByText(mockDecisionLog.title)).toBeInTheDocument();

      // Find and click delete button
      const deleteBtn = screen.getByTitle("Delete Milestone");
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(feedbackRepository.deleteDecisionLog).toHaveBeenCalledWith(
          workspaceId,
          mockDecisionLog.id
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Decision milestone removed");
      expect(screen.queryByText(mockDecisionLog.title)).not.toBeInTheDocument();
    });
  });
});
