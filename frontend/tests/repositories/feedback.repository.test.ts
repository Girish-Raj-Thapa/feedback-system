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
});

