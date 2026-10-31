import { apiClient } from "@/repositories/client";
import type {
  FeedbackCategory,
  FeedbackCategoryCreate,
  FeedbackCategoryReorderItem,
  FeedbackCategorySeedRequest,
  FeedbackCategoryUpdate,
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
};

