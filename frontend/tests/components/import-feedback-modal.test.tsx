import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ImportFeedbackModal } from "@/components/workspace/import-feedback-modal";
import { feedbackRepository } from "@/repositories/feedback.repository";
import type { FeedbackCategory, FeedbackForm } from "@/types/feedback";

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    importSubmissions: vi.fn(),
  },
}));

describe("ImportFeedbackModal", () => {
  const wsId = "ws-123";
  const mockForms: FeedbackForm[] = [
    {
      id: "form-1",
      workspace_id: wsId,
      name: "Web App Widget",
      template_type: null,
      title: "Web App Widget",
      subtitle: null,
      slug: "web-app",
      is_active: true,
      rating_scale_type: "5_star",
      rating_required: true,
      category_pills: [],
      custom_questions: [],
      open_feedback_prompt: "Tell us more",
      open_feedback_placeholder: null,
      contact_field_mode: "optional",
      theme_config: {
        primary_color: "#4249C9",
        border_radius: 12,
        color_scheme: "system",
      },
      outcome_screen: {},
      widget_settings: {
        position: "bottom_right",
        button_text: "Feedback",
        delay_seconds: 0,
      },
      allowed_domains: [],
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
  ];

  const mockCategories: FeedbackCategory[] = [
    {
      id: "cat-1",
      workspace_id: wsId,
      name: "Pricing & Billing",
      slug: "pricing-billing",
      description: "Pricing and billing questions",
      color: "#3B82F6",
      icon: null,
      keywords: ["pricing", "invoice"],
      is_uncategorized: false,
      is_active: true,
      display_order: 1,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
  ];

  const mockedImportSubmissions = vi.mocked(feedbackRepository.importSubmissions);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CSV upload preview and submits csv_text import payload", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mockedImportSubmissions.mockResolvedValue({
      imported_count: 1,
      skipped_count: 0,
      categorized_count: 1,
      form_id: "form-1",
      errors: [],
    });

    render(
      <ImportFeedbackModal
        isOpen={true}
        workspaceId={wsId}
        forms={mockForms}
        categories={mockCategories}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const csvTextarea = screen.getByLabelText("CSV content");
    fireEvent.change(csvTextarea, {
      target: {
        value: 'comment,rating,plan_tier\n"Billing invoice was wrong",2,Enterprise',
      },
    });

    expect(screen.getByText(/Preview \(1 of/i)).toBeInTheDocument();
    expect(screen.getByText("Billing invoice was wrong")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target form"), {
      target: { value: "form-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Import responses" }));

    await waitFor(() => {
      expect(mockedImportSubmissions).toHaveBeenCalledWith(wsId, {
        form_id: "form-1",
        default_source: "csv_import",
        csv_text:
          'comment,rating,plan_tier\n"Billing invoice was wrong",2,Enterprise',
        default_rating: null,
        default_category_id: null,
      });
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("switches to Paste feedback tab and submits non-empty lines with defaults", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mockedImportSubmissions.mockResolvedValue({
      imported_count: 2,
      skipped_count: 0,
      categorized_count: 0,
      form_id: "form-1",
      errors: [],
    });

    render(
      <ImportFeedbackModal
        isOpen={true}
        workspaceId={wsId}
        forms={mockForms}
        categories={mockCategories}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Paste feedback" }));

    fireEvent.change(screen.getByLabelText("Pasted feedback lines"), {
      target: {
        value: "Great dark mode contrast\n\nNeeds keyboard shortcuts",
      },
    });
    expect(screen.getByText("2 lines ready")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fallback category"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByLabelText("Default rating"), {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Import responses" }));

    await waitFor(() => {
      expect(mockedImportSubmissions).toHaveBeenCalledWith(wsId, {
        form_id: null,
        default_source: "manual_paste",
        paste_lines: ["Great dark mode contrast", "Needs keyboard shortcuts"],
        default_rating: 5,
        default_category_id: "cat-1",
      });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays row-level errors on partial success and keeps modal open until Done", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mockedImportSubmissions.mockResolvedValue({
      imported_count: 1,
      skipped_count: 1,
      categorized_count: 0,
      form_id: "form-1",
      errors: [{ row_number: 3, reason: "Invalid rating 'abc'; expected a whole number" }],
    });

    render(
      <ImportFeedbackModal
        isOpen={true}
        workspaceId={wsId}
        forms={mockForms}
        categories={mockCategories}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText("CSV content"), {
      target: {
        value: 'comment,rating\n"Valid row",5\n"Broken row",abc',
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import responses" }));

    expect(
      await screen.findByText(/Row 3: Invalid rating 'abc'; expected a whole number/i)
    ).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays alert banner when import request fails", async () => {
    mockedImportSubmissions.mockRejectedValue(
      new Error("No valid feedback rows imported")
    );

    render(
      <ImportFeedbackModal
        isOpen={true}
        workspaceId={wsId}
        forms={mockForms}
        categories={mockCategories}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("CSV content"), {
      target: { value: "comment,rating\n," },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import responses" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No valid feedback rows imported"
    );
  });

  it("reads an uploaded .csv file into preview and submits it", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mockedImportSubmissions.mockResolvedValue({
      imported_count: 1,
      skipped_count: 0,
      categorized_count: 1,
      form_id: "form-1",
      errors: [],
    });

    render(
      <ImportFeedbackModal
        isOpen={true}
        workspaceId={wsId}
        forms={mockForms}
        categories={mockCategories}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const fileInput = screen.getByLabelText("Choose CSV file") as HTMLInputElement;
    const csvContent = 'comment,rating,source\n"Slow export speed",2,intercom';
    const file = new File([csvContent], "intercom-export.csv", {
      type: "text/csv",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText("intercom-export.csv")).toBeInTheDocument();
    expect(screen.getByText("Slow export speed")).toBeInTheDocument();
  });
});
