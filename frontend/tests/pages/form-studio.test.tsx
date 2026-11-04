import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FormStudioPage from "@/app/workspace/[workspaceSlug]/forms/[formId]/page";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FeedbackForm } from "@/types/feedback";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    getWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
  },
}));

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    getForm: vi.fn(),
    updateForm: vi.fn(),
    listCategories: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("FormStudioPage", () => {
  const wsSlug = "acme-corp";
  const wsId = "ws-123";
  const formId = "form-abc-123";
  const mockPush = vi.fn();

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

  const mockForm: FeedbackForm = {
    id: formId,
    workspace_id: wsId,
    name: "Customer Survey",
    slug: "customer-survey",
    template_type: "saas",
    is_active: true,
    title: "How likely are you to recommend us?",
    subtitle: "Your voice shapes our roadmap",
    rating_scale_type: "5_star",
    rating_required: true,
    category_pills: [
      { id: "pill-1", label: "Bug Report", category_id: "cat-1" },
    ],
    custom_questions: [],
    open_feedback_prompt: "Tell us more about your experience",
    open_feedback_placeholder: "Any details...",
    contact_field_mode: "optional",
    theme_config: {
      primary_color: "#4249C9",
      border_radius: 12,
      color_scheme: "system",
    },
    outcome_screen: {
      low_score_title: "Sorry about that",
      low_score_message: "We will make it right.",
      high_score_title: "Thank you so much!",
      high_score_message: "We appreciate your kind words.",
      high_score_cta_text: "Leave a Google Review",
      high_score_cta_url: "https://google.com/review",
    },
    widget_settings: {
      position: "bottom_right",
      button_text: "Feedback",
      delay_seconds: 2,
    },
    allowed_domains: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockCategories = [
    { id: "cat-1", name: "Bugs", color: "#E05252", is_uncategorized: false },
    { id: "cat-2", name: "Feature Requests", color: "#4249C9", is_uncategorized: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({
      workspaceSlug: wsSlug,
      formId: formId,
    });
    (useRouter as any).mockReturnValue({ push: mockPush });
    useWorkspaceStore.setState({ workspaces: [mockMembership as any] });
    (authRepository.getWorkspace as any).mockResolvedValue(mockWorkspaceDetails);
    (feedbackRepository.getForm as any).mockResolvedValue(mockForm);
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);
  });

  it("loads and renders the form studio top bar and preview", async () => {
    render(<FormStudioPage />);

    expect(await screen.findByText("Customer Survey")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share & Embed/i })).toBeInTheDocument();

    // Verify live preview renders title
    expect(screen.getAllByText("How likely are you to recommend us?").length).toBeGreaterThan(0);
  });

  it("navigates through configuration tabs", async () => {
    render(<FormStudioPage />);
    await screen.findByText("Customer Survey");

    // Click Category Pills Tab
    const pillsTab = screen.getByRole("button", { name: "Category Pills" });
    fireEvent.click(pillsTab);
    expect(screen.getByRole("button", { name: "Add Category Pill" })).toBeInTheDocument();

    // Click Questions Tab
    const questionsTab = screen.getByRole("button", { name: "Questions" });
    fireEvent.click(questionsTab);
    expect(screen.getByRole("button", { name: "Add Custom Question" })).toBeInTheDocument();

    // Click Styling Tab
    const stylingTab = screen.getByRole("button", { name: "Styling" });
    fireEvent.click(stylingTab);
    expect(screen.getByText("Primary Brand Color")).toBeInTheDocument();

    // Click Outcomes Tab
    const outcomesTab = screen.getByRole("button", { name: "Outcomes" });
    fireEvent.click(outcomesTab);
    expect(screen.getByText(/High-Score Screen/i)).toBeInTheDocument();

    // Click Settings Tab
    const settingsTab = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsTab);
    expect(screen.getByText("Widget Launcher Position")).toBeInTheDocument();
  });

  it("allows adding a custom question in Questions tab", async () => {
    render(<FormStudioPage />);
    await screen.findByText("Customer Survey");

    // Switch to Questions tab
    const questionsTab = screen.getByRole("button", { name: "Questions" });
    fireEvent.click(questionsTab);

    // Click Add Custom Question button
    const addQBtn = screen.getByRole("button", { name: "Add Custom Question" });
    fireEvent.click(addQBtn);

    expect(screen.getByDisplayValue("What is your main goal with our product?")).toBeInTheDocument();
  });

  it("saves form changes when clicking Save Changes", async () => {
    (feedbackRepository.updateForm as any).mockResolvedValue(mockForm);

    render(<FormStudioPage />);
    await screen.findByText("Customer Survey");

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(feedbackRepository.updateForm).toHaveBeenCalledWith(
        wsId,
        formId,
        expect.objectContaining({
          name: "Customer Survey",
          title: "How likely are you to recommend us?",
          rating_scale_type: "5_star",
        })
      );
      expect(toast.success).toHaveBeenCalledWith("Form changes saved successfully");
    });
  });

  it("toggles outcome state simulation in live preview", async () => {
    render(<FormStudioPage />);
    await screen.findByText("Customer Survey");

    const simulateBtn = screen.getByRole("button", { name: "Simulate Outcome State" });
    fireEvent.click(simulateBtn);

    expect(screen.getByText("Thank you so much!")).toBeInTheDocument();
    expect(screen.getByText("Leave a Google Review")).toBeInTheDocument();

    // Toggle back
    const formStateBtn = screen.getByRole("button", { name: "Preview Form State" });
    fireEvent.click(formStateBtn);

    expect(screen.queryByText("Leave a Google Review")).not.toBeInTheDocument();
  });

  it("switches to Outcomes tab and renders compliant outcome configuration", async () => {
    render(<FormStudioPage />);
    await screen.findByText("Customer Survey");

    const outcomesTab = screen.getByRole("button", { name: "Outcomes" });
    fireEvent.click(outcomesTab);

    expect(screen.getByText(/FTC & Platform Policy Compliant/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority Support Button/i)).toBeInTheDocument();
  });
});
