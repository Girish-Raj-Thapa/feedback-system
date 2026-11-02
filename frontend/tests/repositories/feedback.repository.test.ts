import { feedbackRepository } from "@/repositories/feedback.repository";
import { apiClient } from "@/repositories/client";

vi.mock("@/repositories/client", () => ({
  apiClient: vi.fn(),
}));

describe("feedbackRepository", () => {
  const workspaceId = "ws-test-uuid";

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("listCategories calls GET with workspaceId", async () => {
    const mockCategories = [
      { id: "cat-1", name: "Bugs", color: "#E05252", is_uncategorized: false },
      { id: "cat-2", name: "Other / Uncategorized", color: "#6B7280", is_uncategorized: true },
    ];
    (apiClient as any).mockResolvedValue(mockCategories);

    const result = await feedbackRepository.listCategories(workspaceId);
    expect(result).toEqual(mockCategories);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/categories`,
      {
        method: "GET",
        workspaceId,
      }
    );
  });

  it("createCategory calls POST with payload", async () => {
    const payload = {
      name: "Hardware",
      description: "Hardware issues",
      color: "#10B981",
      keywords: ["iot", "firmware"],
    };
    const mockCreated = { id: "cat-new", ...payload, is_uncategorized: false };
    (apiClient as any).mockResolvedValue(mockCreated);

    const result = await feedbackRepository.createCategory(workspaceId, payload);
    expect(result).toEqual(mockCreated);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/categories`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  });

  it("updateCategory calls PATCH with payload", async () => {
    const categoryId = "cat-update-id";
    const payload = { color: "#3B82F6", description: "Updated description" };
    const mockUpdated = { id: categoryId, name: "Bugs", ...payload };
    (apiClient as any).mockResolvedValue(mockUpdated);

    const result = await feedbackRepository.updateCategory(workspaceId, categoryId, payload);
    expect(result).toEqual(mockUpdated);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/categories/${categoryId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  });

  it("deleteCategory calls DELETE", async () => {
    const categoryId = "cat-delete-id";
    (apiClient as any).mockResolvedValue({});

    await feedbackRepository.deleteCategory(workspaceId, categoryId);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/categories/${categoryId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  });

  it("seedCategories calls POST to seed endpoint", async () => {
    const payload = { industry: "SaaS and software", force_reset: true };
    const mockSeeded = [{ id: "cat-s1", name: "Bugs" }];
    (apiClient as any).mockResolvedValue(mockSeeded);

    const result = await feedbackRepository.seedCategories(workspaceId, payload);
    expect(result).toEqual(mockSeeded);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/categories/seed`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  });

  it("reorderCategories calls POST to reorder endpoint", async () => {
    const items = [
      { id: "cat-1", display_order: 1 },
      { id: "cat-2", display_order: 2 },
    ];
    (apiClient as any).mockResolvedValue([]);

    await feedbackRepository.reorderCategories(workspaceId, items);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/categories/reorder`,
      {
        method: "POST",
        workspaceId,
        body: { items },
      }
    );
  });

  it("listForms calls GET with workspaceId", async () => {
    const mockForms = [
      { id: "form-1", name: "Main Widget", slug: "main-widget" },
    ];
    (apiClient as any).mockResolvedValue(mockForms);

    const result = await feedbackRepository.listForms(workspaceId);
    expect(result).toEqual(mockForms);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/forms`,
      {
        method: "GET",
        workspaceId,
      }
    );
  });

  it("getForm calls GET with workspaceId and formId", async () => {
    const formId = "form-123";
    const mockForm = { id: formId, name: "Main Widget", slug: "main-widget" };
    (apiClient as any).mockResolvedValue(mockForm);

    const result = await feedbackRepository.getForm(workspaceId, formId);
    expect(result).toEqual(mockForm);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/forms/${formId}`,
      {
        method: "GET",
        workspaceId,
      }
    );
  });

  it("createForm calls POST with payload", async () => {
    const payload = {
      name: "SaaS Feedback",
      slug: "saas-feedback",
      template: "saas" as const,
    };
    const mockCreated = { id: "form-new", ...payload };
    (apiClient as any).mockResolvedValue(mockCreated);

    const result = await feedbackRepository.createForm(workspaceId, payload);
    expect(result).toEqual(mockCreated);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/forms`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  });

  it("updateForm calls PATCH with payload", async () => {
    const formId = "form-update-id";
    const payload = { title: "Updated Feedback Title" };
    const mockUpdated = { id: formId, ...payload };
    (apiClient as any).mockResolvedValue(mockUpdated);

    const result = await feedbackRepository.updateForm(workspaceId, formId, payload);
    expect(result).toEqual(mockUpdated);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/forms/${formId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  });

  it("deleteForm calls DELETE", async () => {
    const formId = "form-delete-id";
    (apiClient as any).mockResolvedValue({});

    await feedbackRepository.deleteForm(workspaceId, formId);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/forms/${formId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  });

  it("duplicateForm calls POST to duplicate endpoint", async () => {
    const formId = "form-dup-id";
    const payload = { name: "Main Widget (Copy)" };
    const mockDuplicated = { id: "form-new-dup", ...payload };
    (apiClient as any).mockResolvedValue(mockDuplicated);

    const result = await feedbackRepository.duplicateForm(workspaceId, formId, payload);
    expect(result).toEqual(mockDuplicated);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/forms/${formId}/duplicate`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  });

  it("getPublicForm calls GET on public route without workspaceId auth", async () => {
    const wsSlug = "acme";
    const formSlug = "survey";
    const mockPublic = { id: "form-pub", slug: formSlug, title: "Acme Survey" };
    (apiClient as any).mockResolvedValue(mockPublic);

    const result = await feedbackRepository.getPublicForm(wsSlug, formSlug);
    expect(result).toEqual(mockPublic);
    expect(apiClient).toHaveBeenCalledWith(
      `/public/forms/${wsSlug}/${formSlug}`,
      {
        method: "GET",
      }
    );
  });

  it("submitFeedback calls POST on public submit route with payload", async () => {
    const wsSlug = "acme";
    const formSlug = "survey";
    const payload = {
      rating: 5,
      comment: "Super smooth experience!",
      customer_email: "test@example.com",
    };
    const mockResponse = {
      id: "sub-123",
      workspace_slug: wsSlug,
      form_slug: formSlug,
      rating: 5,
      status: "new",
      outcome: {
        title: "Thank you!",
        message: "We appreciate your feedback.",
        is_high_score: true,
      },
    };
    (apiClient as any).mockResolvedValue(mockResponse);

    const result = await feedbackRepository.submitFeedback(wsSlug, formSlug, payload);
    expect(result).toEqual(mockResponse);
    expect(apiClient).toHaveBeenCalledWith(
      `/public/forms/${wsSlug}/${formSlug}/submit`,
      {
        method: "POST",
        body: payload,
      }
    );
  });

  it("listSubmissions calls GET with pagination parameters", async () => {
    const mockPage = {
      items: [{ id: "sub-1", comment: "Great app!", rating: 5 }],
      total: 1,
      limit: 20,
      offset: 0,
    };
    (apiClient as any).mockResolvedValue(mockPage);

    const result = await feedbackRepository.listSubmissions(workspaceId, { limit: 20, offset: 0 });
    expect(result).toEqual(mockPage);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/submissions?limit=20&offset=0`,
      {
        method: "GET",
        workspaceId,
      }
    );
  });

  it("getSubmission calls GET with workspaceId and submissionId", async () => {
    const submissionId = "sub-123";
    const mockSubmission = { id: submissionId, comment: "Love it!", rating: 5 };
    (apiClient as any).mockResolvedValue(mockSubmission);

    const result = await feedbackRepository.getSubmission(workspaceId, submissionId);
    expect(result).toEqual(mockSubmission);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/submissions/${submissionId}`,
      {
        method: "GET",
        workspaceId,
      }
    );
  });

  it("updateSubmission calls PATCH with workspaceId, submissionId, and payload", async () => {
    const submissionId = "sub-123";
    const payload = { status: "reviewed" as const };
    const mockUpdated = { id: submissionId, status: "reviewed" };
    (apiClient as any).mockResolvedValue(mockUpdated);

    const result = await feedbackRepository.updateSubmission(
      workspaceId,
      submissionId,
      payload
    );
    expect(result).toEqual(mockUpdated);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/submissions/${submissionId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  });

  it("getCustomerHistory calls GET with workspaceId and submissionId", async () => {
    const submissionId = "sub-123";
    const mockHistory = {
      customer_email: "test@example.com",
      customer_name: "Test User",
      total_submissions: 2,
      avg_rating: 4.5,
      submissions: [],
    };
    (apiClient as any).mockResolvedValue(mockHistory);

    const result = await feedbackRepository.getCustomerHistory(
      workspaceId,
      submissionId
    );
    expect(result).toEqual(mockHistory);
    expect(apiClient).toHaveBeenCalledWith(
      `/workspaces/${workspaceId}/feedback/submissions/${submissionId}/customer-history`,
      {
        method: "GET",
        workspaceId,
      }
    );
  });
});

