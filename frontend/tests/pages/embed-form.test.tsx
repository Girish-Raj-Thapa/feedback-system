import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import EmbedFormPage from "@/app/embed/[workspaceSlug]/[formSlug]/page";
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

describe("EmbedFormPage", () => {
  const wsSlug = "acme-corp";
  const formSlug = "website-feedback";

  const mockPublicForm: PublicFeedbackForm = {
    id: "form-123",
    workspace_slug: wsSlug,
    workspace_name: "Acme Corp",
    name: "Website Feedback",
    slug: formSlug,
    is_active: true,
    title: "Give us your thoughts",
    subtitle: "We love hearing from you.",
    rating_scale_type: "5_star",
    rating_required: true,
    category_pills: [
      { id: "pill-1", label: "Bug Report" },
      { id: "pill-2", label: "Feature Idea" },
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
      color_scheme: "light",
    },
    outcome_screen: {
      low_score_title: "We will make it right",
      low_score_message: "Our support team has been notified.",
      high_score_title: "Thank you for the 5 stars!",
      high_score_message: "We appreciate your kind words.",
      high_score_cta_text: "Rate on Google",
      high_score_cta_url: "https://google.com/review",
    },
    widget_settings: {
      position: "bottom_right",
      button_text: "Feedback",
      delay_seconds: 0,
    },
    form_token: "hmac-form-token-xyz",
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
      title: "Thank you for the 5 stars!",
      message: "We appreciate your kind words.",
      is_high_score: true,
      cta_text: "Rate on Google",
      cta_url: "https://google.com/review",
    },
  };

  let postMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({
      workspaceSlug: wsSlug,
      formSlug: formSlug,
    });

    postMessageSpy = vi.fn();
    window.parent.postMessage = postMessageSpy;
  });

  it("renders embed form, notifies parent of height via postMessage, and handles close", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);

    render(<EmbedFormPage />);

    await waitFor(() => {
      expect(screen.getByText("Give us your thoughts")).toBeInTheDocument();
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "feedback:resize" }),
      "*"
    );

    // Clicking close button posts message to parent
    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "feedback:close" },
      "*"
    );
  });

  it("validates required rating and contact email before submission", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);

    render(<EmbedFormPage />);

    await waitFor(() => {
      expect(screen.getByText("Give us your thoughts")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Please select a rating.")).toBeInTheDocument();
      expect(screen.getByText("Email address is required.")).toBeInTheDocument();
    });

    expect(feedbackRepository.submitFeedback).not.toHaveBeenCalled();
  });

  it("prefills contact email and name from feedback:identify message", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);

    render(<EmbedFormPage />);

    await waitFor(() => {
      expect(screen.getByText("Give us your thoughts")).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(
      "name@example.com"
    ) as HTMLInputElement;
    expect(emailInput.value).toBe("");

    // Dispatch feedback:identify message
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "feedback:identify",
            data: { email: "identified@company.com", name: "Alice" },
          },
        })
      );
    });

    await waitFor(() => {
      expect(emailInput.value).toBe("identified@company.com");
    });
  });

  it("submits feedback successfully with form_token and triggers outcome screen & feedback:submitted postMessage", async () => {
    (feedbackRepository.getPublicForm as any).mockResolvedValue(mockPublicForm);
    (feedbackRepository.submitFeedback as any).mockResolvedValue(
      mockSuccessSubmission
    );

    render(<EmbedFormPage />);

    await waitFor(() => {
      expect(screen.getByText("Give us your thoughts")).toBeInTheDocument();
    });

    // Select 5th star
    const starButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg polygon"));
    expect(starButtons.length).toBe(5);
    fireEvent.click(starButtons[4]);

    // Select category pill
    fireEvent.click(screen.getByText("Bug Report"));

    // Select single choice question option
    const radio = screen.getByLabelText("Chrome");
    fireEvent.click(radio);

    // Enter open feedback
    const commentArea = screen.getByPlaceholderText("Type your feedback here...");
    fireEvent.change(commentArea, { target: { value: "Awesome app!" } });

    // Enter email
    const emailInput = screen.getByPlaceholderText("name@example.com");
    fireEvent.change(emailInput, { target: { value: "tester@example.com" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Submit Feedback/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(feedbackRepository.submitFeedback).toHaveBeenCalledWith(
        wsSlug,
        formSlug,
        expect.objectContaining({
          rating: 5,
          category_pill_label: "Bug Report",
          comment: "Awesome app!",
          customer_email: "tester@example.com",
          form_token: "hmac-form-token-xyz",
          customer_metadata: expect.objectContaining({
            source: "embed",
          }),
        })
      );
    });

    // Verifies outcome screen
    await waitFor(() => {
      expect(screen.getByText("Thank you for the 5 stars!")).toBeInTheDocument();
      expect(screen.getByText("Rate on Google")).toBeInTheDocument();
    });

    // Verifies feedback:submitted notification to parent window
    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "feedback:submitted" },
      "*"
    );
  });
});
