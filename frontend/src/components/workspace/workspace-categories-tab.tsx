"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Edit2,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { feedbackRepository } from "@/repositories/feedback.repository";
import type {
  FeedbackCategory,
  FeedbackCategoryCreate,
  FeedbackCategoryUpdate,
} from "@/types/feedback";

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#64748B", // Slate
  "#0284C7", // Sky
];

const PRESET_TEMPLATES = [
  {
    id: "saas",
    name: "SaaS & Software",
    description: "Bugs, Features, UX & Usability, Performance, Billing",
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    description: "Product Quality, Checkout & Payment, Shipping, Customer Care",
  },
  {
    id: "subscription",
    name: "Subscription & Media",
    description: "Content, Accounts & Auth, Subscriptions, Performance",
  },
  {
    id: "service",
    name: "Services & Agency",
    description: "Project Delivery, Communication, Timelines, Quality of Work",
  },
  {
    id: "general",
    name: "General / Starter",
    description: "Product Feedback, Usability Issues, Ideas & Suggestions",
  },
];

interface WorkspaceCategoriesTabProps {
  workspaceId: string;
  isOwner?: boolean;
}

export function WorkspaceCategoriesTab({
  workspaceId,
}: WorkspaceCategoriesTabProps) {
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<FeedbackCategory | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<FeedbackCategory | null>(null);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);

  // Add / Edit form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formKeywords, setFormKeywords] = useState("");

  // Seed form state
  const [selectedIndustry, setSelectedIndustry] = useState("saas");
  const [forceReset, setForceReset] = useState(false);

  // Load categories
  useEffect(() => {
    let isMounted = true;

    async function fetchCategories() {
      if (!workspaceId) return;
      setIsLoading(true);
      try {
        const data = await feedbackRepository.listCategories(workspaceId);
        if (isMounted) {
          setCategories(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : "Failed to load categories";
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(PRESET_COLORS[0]);
    setFormKeywords("");
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat: FeedbackCategory) => {
    setCategoryToEdit(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormColor(cat.color || PRESET_COLORS[0]);
    setFormKeywords((cat.keywords || []).join(", "));
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (cat: FeedbackCategory) => {
    if (cat.is_uncategorized) {
      toast.error("The default uncategorized category cannot be deleted.");
      return;
    }
    setCategoryToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  // Handle Add Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      const keywordsArray = formKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const payload: FeedbackCategoryCreate = {
        name: formName.trim(),
        description: formDescription.trim(),
        color: formColor,
        keywords: keywordsArray,
        display_order: categories.length + 1,
      };

      const created = await feedbackRepository.createCategory(
        workspaceId,
        payload
      );
      setCategories((prev) => [...prev, created]);
      setIsAddModalOpen(false);
      toast.success("Category created successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create category";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Update Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToEdit || !formName.trim()) return;

    setIsSubmitting(true);
    try {
      const keywordsArray = formKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const payload: FeedbackCategoryUpdate = {
        name: formName.trim(),
        description: formDescription.trim(),
        color: formColor,
        keywords: keywordsArray,
      };

      const updated = await feedbackRepository.updateCategory(
        workspaceId,
        categoryToEdit.id,
        payload
      );

      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setIsEditModalOpen(false);
      setCategoryToEdit(null);
      toast.success("Category updated successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update category";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsSubmitting(true);
    try {
      await feedbackRepository.deleteCategory(workspaceId, categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      toast.success("Category deleted. Feedback reassigned to default category.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete category";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Seed Presets
  const handleSeedPresets = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const seeded = await feedbackRepository.seedCategories(workspaceId, {
        industry: selectedIndustry,
        force_reset: forceReset,
      });
      setCategories(seeded);
      setIsSeedModalOpen(false);
      toast.success(
        forceReset
          ? "Categories successfully reset to preset template."
          : "Preset categories successfully applied."
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to seed preset categories";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reorder Up / Down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    // Build reorder items
    const reorderPayload = newCategories.map((cat, idx) => ({
      id: cat.id,
      display_order: idx + 1,
    }));

    // Optimistically update
    setCategories(newCategories);

    try {
      const updated = await feedbackRepository.reorderCategories(
        workspaceId,
        reorderPayload
      );
      setCategories(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to reorder categories";
      toast.error(msg);
      // Revert on error
      const restored = await feedbackRepository.listCategories(workspaceId);
      setCategories(restored);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-[#4249C9]" />
          <p className="text-sm font-medium text-[#556070] dark:text-[#8E8E93]">
            Loading feedback categories…
          </p>
        </div>
      </div>
    );
  }

  const defaultCategory = categories.find((c) => c.is_uncategorized);

  return (
    <div className="space-y-6">
      {/* Card Header & Controls */}
      <section className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
        <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="size-5 text-action" />
              <h2 className="text-[16px] font-semibold text-text">
                Feedback Categories
              </h2>
            </div>
            <p className="mt-1 text-[13px] text-text-muted">
              Organize user feedback into thematic buckets. Custom categories can be tagged, colored, and sorted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSeedModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-text transition-colors hover:bg-hover active:scale-[0.98]"
            >
              <FolderOpen className="size-4 text-action" />
              <span>Presets & Templates</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-action px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-action-hover active:scale-[0.98] shadow-xs"
            >
              <Plus className="size-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Categories List / Table */}
        <div className="border-t border-border">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-action-subtle text-action-subtle-fg">
                <FolderOpen className="size-6" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-text">
                No categories found
              </h3>
              <p className="mt-1 max-w-sm text-[13px] text-text-muted">
                Start by adding your first category or initialize with industry presets.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSeedModalOpen(true)}
                  className="rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-text hover:bg-hover active:scale-[0.98]"
                >
                  Apply Preset
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="rounded-[10px] bg-action px-3.5 py-2 text-[13px] font-medium text-white hover:bg-action-hover active:scale-[0.98]"
                >
                  Create Category
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-subtle text-[12px] font-semibold text-text-muted">
                    <th className="w-16 px-4 py-3 text-center">Order</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Keywords</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categories.map((cat, index) => (
                    <tr
                      key={cat.id}
                      className="group transition-colors hover:bg-hover"
                    >
                      {/* Order / Reorder */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="Move up"
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(index, "up")}
                            className="cursor-pointer rounded p-1 text-text-muted transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-30 active:scale-[0.98]"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Move down"
                            disabled={index === categories.length - 1}
                            onClick={() => handleMoveOrder(index, "down")}
                            className="cursor-pointer rounded p-1 text-text-muted transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-30 active:scale-[0.98]"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Name & Badge */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="size-3.5 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                            style={{ backgroundColor: cat.color || "#6366F1" }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-text">
                                {cat.name}
                              </span>
                              {cat.is_uncategorized && (
                                <span className="rounded-[6px] bg-action-subtle px-2 py-0.5 text-[11px] font-medium text-action-subtle-fg">
                                  Default Catch-all
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[12px] text-text-muted">
                              {cat.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="max-w-[260px] px-6 py-4">
                        <p className="line-clamp-2 text-[13px] text-text-muted">
                          {cat.description || "—"}
                        </p>
                      </td>

                      {/* Keywords */}
                      <td className="max-w-[200px] px-6 py-4">
                        {cat.keywords && cat.keywords.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cat.keywords.slice(0, 3).map((kw, i) => (
                              <span
                                key={i}
                                className="rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-text-muted"
                              >
                                {kw}
                              </span>
                            ))}
                            {cat.keywords.length > 3 && (
                              <span className="text-[11px] text-text-muted">
                                +{cat.keywords.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px] text-text-muted">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title={`Edit ${cat.name}`}
                            aria-label={`Edit ${cat.name}`}
                            onClick={() => handleOpenEditModal(cat)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-[0.98]"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            title={
                              cat.is_uncategorized
                                ? "Default category cannot be deleted"
                                : `Delete ${cat.name}`
                            }
                            aria-label={
                              cat.is_uncategorized
                                ? "Default category cannot be deleted"
                                : `Delete ${cat.name}`
                            }
                            disabled={cat.is_uncategorized}
                            onClick={() => handleOpenDeleteModal(cat)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-status-error transition-colors hover:bg-status-error-bg disabled:cursor-not-allowed disabled:opacity-30 active:scale-[0.98]"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex h-12 items-center justify-between border-t border-border bg-subtle px-6 text-[12px] tabular-nums text-text-muted">
                <span>
                  Total: {categories.length} {categories.length === 1 ? "category" : "categories"}
                </span>
                <span>
                  Catch-all fallback: <strong>{defaultCategory?.name || "Other / Uncategorized"}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= MODAL 1: ADD CATEGORY ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[500px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Add New Category
                </h3>
                <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                  Create a custom thematic bucket to organize feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Bug Reports or UI Improvements"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of what feedback belongs in this category"
                  className="w-full rounded-[10px] border border-[#E1E5EB] p-3 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Badge Color
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFormColor(hex)}
                        className={`size-7 rounded-full border-2 transition-transform cursor-pointer ${
                          formColor.toLowerCase() === hex.toLowerCase()
                            ? "scale-110 border-[#161C26] dark:border-white"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-8 w-24 rounded-[8px] border border-[#E1E5EB] px-2 text-[12px] font-mono text-[#161C26] uppercase focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Auto-categorization Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="e.g. bug, error, broken, glitch, crash"
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
                <p className="mt-1 text-[11px] text-[#556070] dark:text-[#8E8E93]">
                  Incoming feedback containing these keywords will automatically be suggested for this category.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-[10px] border border-[#E1E5EB] px-4 py-2 text-[14px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="flex items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#363BA6] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <span>Create Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT CATEGORY ================= */}
      {isEditModalOpen && categoryToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[500px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Edit Category
                </h3>
                <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                  Update category name, description, or color styling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>

            {categoryToEdit.is_uncategorized && (
              <div className="mt-4 flex items-center gap-2.5 rounded-[10px] bg-[#F0F2FE] p-3 text-[13px] text-[#363BA6] dark:bg-[#4249C9]/20 dark:text-[#7B82F6]">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  This is your default catch-all bucket. It captures unclassified feedback and cannot be deleted.
                </span>
              </div>
            )}

            <form onSubmit={handleUpdateCategory} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-[10px] border border-[#E1E5EB] p-3 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Badge Color
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFormColor(hex)}
                        className={`size-7 rounded-full border-2 transition-transform cursor-pointer ${
                          formColor.toLowerCase() === hex.toLowerCase()
                            ? "scale-110 border-[#161C26] dark:border-white"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-8 w-24 rounded-[8px] border border-[#E1E5EB] px-2 text-[12px] font-mono text-[#161C26] uppercase focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                  Auto-categorization Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] transition-colors focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#1C1C1E] dark:text-white"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-[10px] border border-[#E1E5EB] px-4 py-2 text-[14px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="flex items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#363BA6] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: DELETE CATEGORY ================= */}
      {isDeleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[460px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex size-11 items-center justify-center rounded-full bg-[#FDECEB] text-[#C0281B] dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle className="size-5" />
            </div>

            <h3 className="mt-4 text-[18px] font-semibold text-[#161C26] dark:text-white">
              Delete category &ldquo;{categoryToDelete.name}&rdquo;?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
              Are you sure you want to delete this category? Any feedback items currently tagged with this category will be automatically reassigned to your default <strong>{defaultCategory?.name || "Uncategorized"}</strong> category.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-[10px] border border-[#E1E5EB] px-4 py-2 text-[14px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isSubmitting}
                aria-label="Confirm delete category"
                className="flex items-center gap-2 rounded-[10px] bg-[#C0281B] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#A32216] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete Category</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: SEED PRESETS ================= */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]">
          <div className="w-full max-w-[520px] rounded-[20px] border border-[#E1E5EB] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(16,24,40,0.25)] dark:border-white/15 dark:bg-[#2C2C2E]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-[#161C26] dark:text-white">
                  Industry Category Presets
                </h3>
                <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                  Select an industry template to automatically configure standard feedback buckets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSeedModalOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSeedPresets} className="mt-5 space-y-4">
              <div className="space-y-2">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <label
                    key={tmpl.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-3 transition-colors ${
                      selectedIndustry === tmpl.id
                        ? "border-[#4249C9] bg-[#F0F2FE]/40 dark:border-[#7B82F6] dark:bg-[#4249C9]/10"
                        : "border-[#E1E5EB] hover:bg-[#F7F9FC] dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="preset-template"
                      value={tmpl.id}
                      checked={selectedIndustry === tmpl.id}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                      className="mt-0.5 size-4 text-[#4249C9]"
                    />
                    <div className="flex-1">
                      <span className="block text-[14px] font-semibold text-[#161C26] dark:text-white">
                        {tmpl.name}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-[#556070] dark:text-[#8E8E93]">
                        {tmpl.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Force reset option */}
              <div className="rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] p-3 dark:border-white/10 dark:bg-white/5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={forceReset}
                    onChange={(e) => setForceReset(e.target.checked)}
                    className="size-4 rounded text-[#4249C9]"
                  />
                  <div>
                    <span className="text-[13px] font-medium text-[#161C26] dark:text-white">
                      Replace all existing custom categories
                    </span>
                    <p className="text-[11px] text-[#556070] dark:text-[#8E8E93]">
                      If checked, non-default categories will be replaced. Any feedback will be safely moved to default Uncategorized.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSeedModalOpen(false)}
                  className="rounded-[10px] border border-[#E1E5EB] px-4 py-2 text-[14px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-[10px] bg-[#4249C9] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[#363BA6] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Applying…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Apply Template</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
