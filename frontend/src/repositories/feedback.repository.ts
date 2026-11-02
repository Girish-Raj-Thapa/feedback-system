import { apiClient } from "@/repositories/client";
import type {
  CustomerHistoryRead,
  FeedbackCategory,
  FeedbackCategoryCreate,
  FeedbackCategoryReorderItem,
  FeedbackCategorySeedRequest,
  FeedbackCategoryUpdate,
  FeedbackForm,
  FeedbackFormCreate,
  FeedbackFormUpdate,
  FeedbackSubmissionCreate,
  FeedbackSubmissionRead,
  FeedbackSubmissionResponse,
  FeedbackSubmissionUpdate,
  Page,
  PublicFeedbackForm,
} from "@/types/feedback";

export const feedbackRepository = {
  /**
   * List all active feedback categories for a workspace.
   */
  async listCategories(workspaceId: string): Promise<FeedbackCategory[]> {
    return apiClient<FeedbackCategory[]>(
      `/workspaces/${workspaceId}/feedback/categories`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  /**
   * Get a specific feedback category by ID.
   */
  async getCategory(
    workspaceId: string,
    categoryId: string
  ): Promise<FeedbackCategory> {
    return apiClient<FeedbackCategory>(
      `/workspaces/${workspaceId}/feedback/categories/${categoryId}`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  /**
   * Create a new custom feedback category.
   */
  async createCategory(
    workspaceId: string,
    payload: FeedbackCategoryCreate
  ): Promise<FeedbackCategory> {
    return apiClient<FeedbackCategory>(
      `/workspaces/${workspaceId}/feedback/categories`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Update an existing feedback category.
   */
  async updateCategory(
    workspaceId: string,
    categoryId: string,
    payload: FeedbackCategoryUpdate
  ): Promise<FeedbackCategory> {
    return apiClient<FeedbackCategory>(
      `/workspaces/${workspaceId}/feedback/categories/${categoryId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Soft-delete a feedback category.
   */
  async deleteCategory(
    workspaceId: string,
    categoryId: string
  ): Promise<void> {
    return apiClient<void>(
      `/workspaces/${workspaceId}/feedback/categories/${categoryId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  },

  /**
   * Initialize or reset feedback categories using an industry preset.
   */
  async seedCategories(
    workspaceId: string,
    payload: FeedbackCategorySeedRequest = {}
  ): Promise<FeedbackCategory[]> {
    return apiClient<FeedbackCategory[]>(
      `/workspaces/${workspaceId}/feedback/categories/seed`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Reorder feedback categories.
   */
  async reorderCategories(
    workspaceId: string,
    items: FeedbackCategoryReorderItem[]
  ): Promise<FeedbackCategory[]> {
    return apiClient<FeedbackCategory[]>(
      `/workspaces/${workspaceId}/feedback/categories/reorder`,
      {
        method: "POST",
        workspaceId,
        body: { items },
      }
    );
  },

  /**
   * List all active feedback forms for a workspace.
   */
  async listForms(workspaceId: string): Promise<FeedbackForm[]> {
    return apiClient<FeedbackForm[]>(
      `/workspaces/${workspaceId}/feedback/forms`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  /**
   * Get a specific feedback form by ID.
   */
  async getForm(
    workspaceId: string,
    formId: string
  ): Promise<FeedbackForm> {
    return apiClient<FeedbackForm>(
      `/workspaces/${workspaceId}/feedback/forms/${formId}`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  /**
   * Create a new feedback form or widget.
   */
  async createForm(
    workspaceId: string,
    payload: FeedbackFormCreate
  ): Promise<FeedbackForm> {
    return apiClient<FeedbackForm>(
      `/workspaces/${workspaceId}/feedback/forms`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Update an existing feedback form.
   */
  async updateForm(
    workspaceId: string,
    formId: string,
    payload: FeedbackFormUpdate
  ): Promise<FeedbackForm> {
    return apiClient<FeedbackForm>(
      `/workspaces/${workspaceId}/feedback/forms/${formId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Soft-delete a feedback form.
   */
  async deleteForm(workspaceId: string, formId: string): Promise<void> {
    return apiClient<void>(
      `/workspaces/${workspaceId}/feedback/forms/${formId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  },

  /**
   * Clone / duplicate an existing form.
   */
  async duplicateForm(
    workspaceId: string,
    formId: string,
    payload: { name?: string } = {}
  ): Promise<FeedbackForm> {
    return apiClient<FeedbackForm>(
      `/workspaces/${workspaceId}/feedback/forms/${formId}/duplicate`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Public unauthenticated fetch of form configuration for embed widgets and standalone links.
   */
  async getPublicForm(
    workspaceSlug: string,
    formSlug: string
  ): Promise<PublicFeedbackForm> {
    return apiClient<PublicFeedbackForm>(
      `/public/forms/${workspaceSlug}/${formSlug}`,
      {
        method: "GET",
      }
    );
  },

  /**
   * Public unauthenticated submission of feedback from a hosted page or widget.
   */
  async submitFeedback(
    workspaceSlug: string,
    formSlug: string,
    payload: FeedbackSubmissionCreate
  ): Promise<FeedbackSubmissionResponse> {
    return apiClient<FeedbackSubmissionResponse>(
      `/public/forms/${workspaceSlug}/${formSlug}/submit`,
      {
        method: "POST",
        body: payload,
      }
    );
  },

  /**
   * List feedback submissions for a workspace with pagination.
   */
  async listSubmissions(
    workspaceId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<Page<FeedbackSubmissionRead>> {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";

    return apiClient<Page<FeedbackSubmissionRead>>(
      `/workspaces/${workspaceId}/feedback/submissions${qs}`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  /**
   * Get a specific feedback submission by ID.
   */
  async getSubmission(
    workspaceId: string,
    submissionId: string
  ): Promise<FeedbackSubmissionRead> {
    return apiClient<FeedbackSubmissionRead>(
      `/workspaces/${workspaceId}/feedback/submissions/${submissionId}`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },

  /**
   * Update feedback submission status or classification.
   */
  async updateSubmission(
    workspaceId: string,
    submissionId: string,
    payload: FeedbackSubmissionUpdate
  ): Promise<FeedbackSubmissionRead> {
    return apiClient<FeedbackSubmissionRead>(
      `/workspaces/${workspaceId}/feedback/submissions/${submissionId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  },

  /**
   * Get all previous feedback submissions and metrics from the same customer.
   */
  async getCustomerHistory(
    workspaceId: string,
    submissionId: string
  ): Promise<CustomerHistoryRead> {
    return apiClient<CustomerHistoryRead>(
      `/workspaces/${workspaceId}/feedback/submissions/${submissionId}/customer-history`,
      {
        method: "GET",
        workspaceId,
      }
    );
  },
};

