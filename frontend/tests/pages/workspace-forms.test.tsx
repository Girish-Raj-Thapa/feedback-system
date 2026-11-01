import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WorkspaceFormsPage from "@/app/workspace/[workspaceSlug]/forms/page";
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
    listForms: vi.fn(),
    createForm: vi.fn(),
    updateForm: vi.fn(),
    deleteForm: vi.fn(),
    duplicateForm: vi.fn(),
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

describe("WorkspaceFormsPage", () => {
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

  const sampleForm: FeedbackForm = {
    id: "form-1",
    workspace_id: wsId,
    name: "Main Widget",
    slug: "main-widget",
    template_type: "saas",
    is_active: true,
    title: "How was your experience?",
    subtitle: "We value your input",
    rating_scale_type: "5_star",
    rating_required: true,
    category_pills: [{ id: "p1", label: "Bug Report" }],
    custom_questions: [],
    open_feedback_prompt: "Tell us more",
    open_feedback_placeholder: "Details...",
    contact_field_mode: "optional",
    theme_config: {
      primary_color: "#4249C9",
      border_radius: 12,
      color_scheme: "system",
    },
    outcome_screen: {
      high_score_title: "Thank you!",
    },
    widget_settings: {
      position: "bottom_right",
      button_text: "Feedback",
      delay_seconds: 0,
    },
    allowed_domains: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ workspaceSlug: wsSlug });
    (useRouter as any).mockReturnValue({ push: mockPush, replace: mockReplace });
    useWorkspaceStore.setState({ workspaces: [mockMembership as any] });
    (authRepository.getWorkspace as any).mockResolvedValue(mockWorkspaceDetails);
    (feedbackRepository.listForms as any).mockResolvedValue([sampleForm]);
  });

  it("renders page header and lists forms in table", async () => {
    render(<WorkspaceFormsPage />);

    expect(await screen.findByText("Main Widget")).toBeInTheDocument();
    expect(screen.getByText("/f/main-widget")).toBeInTheDocument();
    expect(screen.getByText("5 Stars")).toBeInTheDocument();
    expect(screen.getByText("1 pill")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
  });

  it("renders empty state when no forms exist", async () => {
    (feedbackRepository.listForms as any).mockResolvedValue([]);
    render(<WorkspaceFormsPage />);

    expect(await screen.findByText("No feedback forms created yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Create your first form using our pre-built SaaS/i)
    ).toBeInTheDocument();
  });

  it("toggles active status of a form", async () => {
    const updatedForm = { ...sampleForm, is_active: false };
    (feedbackRepository.updateForm as any).mockResolvedValue(updatedForm);

    render(<WorkspaceFormsPage />);
    const activeToggle = await screen.findByRole("button", { name: "Active" });
    fireEvent.click(activeToggle);

    await waitFor(() => {
      expect(feedbackRepository.updateForm).toHaveBeenCalledWith(wsId, sampleForm.id, {
        is_active: false,
      });
      expect(toast.success).toHaveBeenCalledWith("Form paused");
    });
  });

  it("duplicates a form", async () => {
    const duplicatedForm = {
      ...sampleForm,
      id: "form-2",
      name: "Main Widget (Copy)",
      slug: "main-widget-copy",
    };
    (feedbackRepository.duplicateForm as any).mockResolvedValue(duplicatedForm);

    render(<WorkspaceFormsPage />);
    const dupBtn = await screen.findByLabelText(`Duplicate ${sampleForm.name}`);
    fireEvent.click(dupBtn);

    await waitFor(() => {
      expect(feedbackRepository.duplicateForm).toHaveBeenCalledWith(wsId, sampleForm.id);
      expect(toast.success).toHaveBeenCalledWith('Duplicated form as "Main Widget (Copy)"');
    });
  });

  it("deletes a form through confirmation modal", async () => {
    (feedbackRepository.deleteForm as any).mockResolvedValue(undefined);

    render(<WorkspaceFormsPage />);
    const deleteBtn = await screen.findByLabelText(`Delete ${sampleForm.name}`);
    fireEvent.click(deleteBtn);

    // Modal opens
    expect(screen.getByText(/Delete form “Main Widget”?/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: "Delete Form" });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(feedbackRepository.deleteForm).toHaveBeenCalledWith(wsId, sampleForm.id);
      expect(toast.success).toHaveBeenCalledWith("Form deleted successfully");
    });
  });

  it("opens create form modal and submits to navigate to studio", async () => {
    const createdForm = {
      ...sampleForm,
      id: "form-new-id",
      name: "New Survey",
      slug: "new-survey",
    };
    (feedbackRepository.createForm as any).mockResolvedValue(createdForm);

    render(<WorkspaceFormsPage />);
    const newFormBtn = await screen.findByRole("button", { name: /New Form/i });
    fireEvent.click(newFormBtn);

    expect(screen.getByText("Create Feedback Form")).toBeInTheDocument();

    // Enter name
    const nameInput = screen.getByPlaceholderText("e.g. Website Feedback Widget");
    fireEvent.change(nameInput, { target: { value: "New Survey" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "Create & Open Studio" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(feedbackRepository.createForm).toHaveBeenCalledWith(
        wsId,
        expect.objectContaining({
          name: "New Survey",
          template_type: "saas",
        })
      );
      expect(mockPush).toHaveBeenCalledWith(`/workspace/${wsSlug}/forms/${createdForm.id}`);
    });
  });

  it("opens share modal when clicking share button", async () => {
    render(<WorkspaceFormsPage />);
    const shareBtn = await screen.findByLabelText(`Share ${sampleForm.name}`);
    fireEvent.click(shareBtn);

    expect(screen.getByText(/Share & Embed “Main Widget”/i)).toBeInTheDocument();
  });
});
