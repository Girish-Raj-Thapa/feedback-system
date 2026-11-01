import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PublicFormPage from "@/app/f/[workspaceSlug]/[formSlug]/page";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useParams } from "next/navigation";
import type {
  FeedbackSubmissionResponse,
  PublicFeedbackForm,
} from "@/types/feedback";

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    getPublicForm: vi.fn(),
    submitFeedback: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

describe("PublicFormPage", () => {
  const wsSlug = "acme-corp";
  const formSlug = "website-feedback";

  const mockPublicForm: PublicFeedbackForm = {
    id: "form-123",
    workspace_slug: wsSlug,
    workspace_name: "Acme Corp",
    name: "Website Feedback",
    slug: formSlug,
    is_active: true,
    title: "How was your experience today?",
    subtitle: "We appreciate your honest thoughts.",
    rating_scale_type: "5_star",
    rating_required: true,
    category_pills: [
      { id: "pill-1", label: "Bug Report" },
      { id: "pill-2", label: "Feature Request" },
    ],
    custom_questions: [
      {
        id: "q-1",
        label: "What browser are you using?",
        type: "single_choice",
        options: ["Chrome", "Safari", "Firefox"],
        required: true,
      },
    ],
    open_feedback_prompt: "Tell us more details",
    open_feedback_placeholder: "Type your feedback here...",
    contact_field_mode: "required",
    theme_config: {
      primary_color: "#4249C9",
      border_radius: 12,
      color_scheme: "system",
    },
    outcome_screen: {
      low_score_title: "We are sorry we missed the mark",
      low_score_message: "Our engineering team has been alerted.",
      high_score_title: "Thank you for the review!",
      high_score_message: "We appreciate your support.",
      high_score_cta_text: "Share on Twitter",
      high_score_cta_url: "https://twitter.com/intent/tweet",
    },
    widget_settings: {
      position: "bottom_right",
      button_text: "Feedback",
      delay_seconds: 0,
    },
  };

  const mockSuccessSubmission: FeedbackSubmissionResponse = {
    id: "sub-123",
    workspace_slug: wsSlug,
    form_slug: formSlug,
    rating: 5,
    rating_scale_type: "5_star",
    category_pill_label: "Bug Report",
    category_id: null,
    status: "new",
    created_at: "2024-01-01T00:00:00Z",
    outcome: {
      title: "Thank you for the review!",
      message: "We appreciate your support.",
      is_high_score: true,
      cta_text: "Share on Twitter",
      cta_url: "https://twitter.com/intent/tweet",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({
      workspaceSlug: wsSlug,
      formSlug: formSlug,
    });
  });

  it("renders loading state then loads and displays form questions", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);

    render(<PublicFormPage />);

    expect(screen.getByText("Loading feedback form...")).toBeInTheDocument();

    expect(await screen.findByText("How was your experience today?")).toBeInTheDocument();
    expect(screen.getByText("We appreciate your honest thoughts.")).toBeInTheDocument();
    expect(screen.getByText("Bug Report")).toBeInTheDocument();
    expect(screen.getByText("Feature Request")).toBeInTheDocument();
    expect(screen.getByText(/What browser are you using\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Feedback" })).toBeInTheDocument();
  });

  it("renders unavailable state when form is not found or paused", async () => {
    (feedbackRepository.getPublicForm as any).mockRejectedValue({
      response: { data: { detail: "This feedback form has been paused." } },
    });

    render(<PublicFormPage />);

    expect(await screen.findByText("Form Unavailable")).toBeInTheDocument();
    expect(screen.getByText("This feedback form has been paused.")).toBeInTheDocument();
  });

  it("validates required fields before submitting", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);

    render(<PublicFormPage />);
    await screen.findByText("How was your experience today?");

    // Click submit without filling required fields
    const submitBtn = screen.getByRole("button", { name: "Send Feedback" });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Please select a rating.")).toBeInTheDocument();
    expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    expect(screen.getByText("This question is required.")).toBeInTheDocument();
  });

  it("submits successfully and transitions to the high score outcome screen", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);
    (feedbackRepository.submitFeedback as any).mockResolvedValue(mockSuccessSubmission);

    render(<PublicFormPage />);
    await screen.findByText("How was your experience today?");

    // Rate 5 stars
    const starBtn = screen.getByLabelText("5 stars");
    fireEvent.click(starBtn);

    // Select category pill
    const bugPill = screen.getByRole("button", { name: "Bug Report" });
    fireEvent.click(bugPill);

    // Answer custom question (Chrome radio)
    const chromeRadio = screen.getByRole("radio", { name: "Chrome" });
    fireEvent.click(chromeRadio);

    // Enter email
    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    // Enter comment
    const commentInput = screen.getByPlaceholderText("Type your feedback here...");
    fireEvent.change(commentInput, { target: { value: "Great experience overall!" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Send Feedback" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(feedbackRepository.submitFeedback).toHaveBeenCalledWith(
        wsSlug,
        formSlug,
        expect.objectContaining({
          rating: 5,
          category_pill_label: "Bug Report",
          comment: "Great experience overall!",
          customer_email: "user@example.com",
        })
      );
    });

    // Verify outcome screen transition
    expect(await screen.findByText("Thank you for the review!")).toBeInTheDocument();
    expect(screen.getByText("We appreciate your support.")).toBeInTheDocument();
    expect(screen.getByText("Share on Twitter")).toBeInTheDocument();

    // Verify "Submit another response" button resets form
    const resetBtn = screen.getByRole("button", { name: "Submit another response" });
    fireEvent.click(resetBtn);

    expect(await screen.findByText("How was your experience today?")).toBeInTheDocument();
  });

  it("shows low score outcome screen when rating <= 3", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);
    const lowScoreOutcome: FeedbackSubmissionResponse = {
      ...mockSuccessSubmission,
      rating: 2,
      outcome: {
        title: "We are sorry we missed the mark",
        message: "Our engineering team has been alerted.",
        is_high_score: false,
        cta_text: null,
        cta_url: null,
      },
    };
    (feedbackRepository.submitFeedback as any).mockResolvedValue(lowScoreOutcome);

    render(<PublicFormPage />);
    await screen.findByText("How was your experience today?");

    // Rate 2 stars
    const starBtn = screen.getByLabelText("2 stars");
    fireEvent.click(starBtn);

    // Answer custom question (Safari radio)
    const safariRadio = screen.getByRole("radio", { name: "Safari" });
    fireEvent.click(safariRadio);

    // Enter email
    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Send Feedback" });
    fireEvent.click(submitBtn);

    // Low score outcome screen
    expect(await screen.findByText("We are sorry we missed the mark")).toBeInTheDocument();
    expect(screen.getByText("Our engineering team has been alerted.")).toBeInTheDocument();
    // High score review CTA should not appear on low score
    expect(screen.queryByText("Share on Twitter")).not.toBeInTheDocument();
  });

  it("displays submission error banner if submission fails", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);
    (feedbackRepository.submitFeedback as any).mockRejectedValue({
      response: { data: { detail: "This form has just been deactivated." } },
    });

    render(<PublicFormPage />);
    await screen.findByText("How was your experience today?");

    // Rate 5 stars
    fireEvent.click(screen.getByLabelText("5 stars"));
    fireEvent.click(screen.getByRole("radio", { name: "Chrome" }));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Feedback" }));

    expect(
      await screen.findByText("This form has just been deactivated.")
    ).toBeInTheDocument();
  });
});
