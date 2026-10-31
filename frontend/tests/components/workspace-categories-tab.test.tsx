import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceCategoriesTab } from "@/components/workspace/workspace-categories-tab";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { toast } from "sonner";
import type { FeedbackCategory } from "@/types/feedback";

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    seedCategories: vi.fn(),
    reorderCategories: vi.fn(),
  },
}));

describe("WorkspaceCategoriesTab", () => {
  const workspaceId = "ws-test-123";

  const mockCategories: FeedbackCategory[] = [
    {
      id: "cat-1",
      workspace_id: workspaceId,
      name: "Bug Reports",
      slug: "bug-reports",
      description: "Errors and glitches",
      color: "#EF4444",
      icon: null,
      keywords: ["bug", "error"],
      is_uncategorized: false,
      is_active: true,
      display_order: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "cat-2",
      workspace_id: workspaceId,
      name: "Feature Requests",
      slug: "feature-requests",
      description: "New ideas",
      color: "#3B82F6",
      icon: null,
      keywords: ["idea", "request"],
      is_uncategorized: false,
      is_active: true,
      display_order: 2,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "cat-default",
      workspace_id: workspaceId,
      name: "Other / Uncategorized",
      slug: "other-uncategorized",
      description: "Default fallback bucket",
      color: "#64748B",
      icon: null,
      keywords: [],
      is_uncategorized: true,
      is_active: true,
      display_order: 3,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays loading indicator and fetches categories on mount", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    expect(screen.getByText("Loading feedback categories…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
    });

    expect(feedbackRepository.listCategories).toHaveBeenCalledWith(workspaceId);
    expect(screen.getByText("Feature Requests")).toBeInTheDocument();
    expect(screen.getAllByText("Other / Uncategorized").length).toBeGreaterThan(0);
    expect(screen.getByText("Default Catch-all")).toBeInTheDocument();
  });

  it("renders empty state when workspace has no categories", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue([]);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getByText("No categories found")).toBeInTheDocument();
    });

    expect(screen.getByText("Apply Preset")).toBeInTheDocument();
  });

  it("opens add category modal and creates a new category", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);
    const newCategory: FeedbackCategory = {
      id: "cat-new",
      workspace_id: workspaceId,
      name: "Performance",
      slug: "performance",
      description: "Speed issues",
      color: "#10B981",
      icon: null,
      keywords: ["slow", "lag"],
      is_uncategorized: false,
      is_active: true,
      display_order: 4,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    };
    (feedbackRepository.createCategory as any).mockResolvedValue(newCategory);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
    });

    // Click "Add Category" button
    fireEvent.click(screen.getByRole("button", { name: /Add Category/i }));

    expect(screen.getByText("Add New Category")).toBeInTheDocument();

    // Fill form
    fireEvent.change(
      screen.getByPlaceholderText("e.g. Bug Reports or UI Improvements"),
      {
        target: { value: "Performance" },
      }
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        "Brief description of what feedback belongs in this category"
      ),
      {
        target: { value: "Speed issues" },
      }
    );
    fireEvent.change(
      screen.getByPlaceholderText("e.g. bug, error, broken, glitch, crash"),
      {
        target: { value: "slow, lag" },
      }
    );

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /^Create Category$/i }));

    await waitFor(() => {
      expect(feedbackRepository.createCategory).toHaveBeenCalledWith(
        workspaceId,
        expect.objectContaining({
          name: "Performance",
          description: "Speed issues",
          keywords: ["slow", "lag"],
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Category created successfully");
    expect(screen.getByText("Performance")).toBeInTheDocument();
  });

  it("opens edit modal and updates an existing category", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);
    const updatedCategory: FeedbackCategory = {
      ...mockCategories[0],
      name: "Critical Bugs",
      description: "Severe issues",
    };
    (feedbackRepository.updateCategory as any).mockResolvedValue(
      updatedCategory
    );

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
    });

    // Click edit on first category
    fireEvent.click(screen.getByLabelText("Edit Bug Reports"));

    expect(screen.getByText("Edit Category")).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue("Bug Reports");
    fireEvent.change(nameInput, { target: { value: "Critical Bugs" } });

    // Submit edit
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(feedbackRepository.updateCategory).toHaveBeenCalledWith(
        workspaceId,
        "cat-1",
        expect.objectContaining({
          name: "Critical Bugs",
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Category updated successfully");
    expect(screen.getByText("Critical Bugs")).toBeInTheDocument();
  });

  it("shows informational notice when editing the default uncategorized category", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getAllByText("Other / Uncategorized").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByLabelText("Edit Other / Uncategorized"));

    expect(
      screen.getByText(
        /This is your default catch-all bucket. It captures unclassified feedback and cannot be deleted./i
      )
    ).toBeInTheDocument();
  });

  it("prevents deleting the default uncategorized category", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getAllByText("Other / Uncategorized").length).toBeGreaterThan(0);
    });

    const defaultDeleteBtn = screen.getByLabelText(
      "Default category cannot be deleted"
    );
    expect(defaultDeleteBtn).toBeDisabled();
  });

  it("opens delete confirmation modal and deletes a custom category", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);
    (feedbackRepository.deleteCategory as any).mockResolvedValue(undefined);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Delete Bug Reports"));

    expect(
      screen.getByText(/Delete category “Bug Reports”?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Any feedback items currently tagged with this category/i)
    ).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByLabelText("Confirm delete category"));

    await waitFor(() => {
      expect(feedbackRepository.deleteCategory).toHaveBeenCalledWith(
        workspaceId,
        "cat-1"
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Feedback reassigned to default category")
    );
    expect(screen.queryByText("Bug Reports")).not.toBeInTheDocument();
  });

  it("opens preset templates modal and applies industry template", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);
    const seededCategories = [
      ...mockCategories,
      {
        id: "cat-seeded",
        workspace_id: workspaceId,
        name: "Shipping & Delivery",
        slug: "shipping-delivery",
        description: "Delivery updates",
        color: "#F59E0B",
        icon: null,
        keywords: [],
        is_uncategorized: false,
        is_active: true,
        display_order: 4,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];
    (feedbackRepository.seedCategories as any).mockResolvedValue(
      seededCategories
    );

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
    });

    // Click Presets & Templates
    fireEvent.click(screen.getByRole("button", { name: /Presets & Templates/i }));

    expect(screen.getByText("Industry Category Presets")).toBeInTheDocument();

    // Select E-Commerce radio
    fireEvent.click(screen.getByLabelText(/E-Commerce/i));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Apply Template/i }));

    await waitFor(() => {
      expect(feedbackRepository.seedCategories).toHaveBeenCalledWith(
        workspaceId,
        {
          industry: "ecommerce",
          force_reset: false,
        }
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Preset categories successfully applied."
    );
    expect(screen.getByText("Shipping & Delivery")).toBeInTheDocument();
  });

  it("supports reordering categories up and down", async () => {
    (feedbackRepository.listCategories as any).mockResolvedValue(mockCategories);
    (feedbackRepository.reorderCategories as any).mockResolvedValue([
      mockCategories[1],
      mockCategories[0],
      mockCategories[2],
    ]);

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(screen.getByText("Bug Reports")).toBeInTheDocument();
    });

    // Move first down
    const moveDownButtons = screen.getAllByTitle("Move down");
    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(feedbackRepository.reorderCategories).toHaveBeenCalledWith(
        workspaceId,
        expect.arrayContaining([
          expect.objectContaining({ id: "cat-2", display_order: 1 }),
          expect.objectContaining({ id: "cat-1", display_order: 2 }),
        ])
      );
    });
  });

  it("handles fetch error gracefully", async () => {
    (feedbackRepository.listCategories as any).mockRejectedValue(
      new Error("Network failed")
    );

    render(<WorkspaceCategoriesTab workspaceId={workspaceId} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network failed");
    });
  });
});
