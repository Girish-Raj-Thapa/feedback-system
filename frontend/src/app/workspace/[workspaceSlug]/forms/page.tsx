"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Copy,
  Edit2,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Plus,
  Repeat,
  Share2,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { FormShareModal } from "@/components/workspace/form-share-modal";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import type { WorkspaceRead } from "@/types/auth";
import type { FeedbackForm, FeedbackFormCreate } from "@/types/feedback";

const STARTER_TEMPLATES = [
  {
    id: "saas",
    name: "SaaS Feedback & Bug Catcher",
    description: "5-Star rating, bug & feature request pills, and conditional review router.",
    icon: Layers,
    color: "#4249C9",
  },
  {
    id: "ecommerce",
    name: "E-Commerce Post-Purchase Check",
    description: "Quality, packaging, and delivery check with post-purchase discount CTA.",
    icon: ShoppingBag,
    color: "#059669",
  },
  {
    id: "subscription",
    name: "Cancellation / Exit Survey",
    description: "5-Emoji scale capturing churn reasons and missing features before leaving.",
    icon: Repeat,
    color: "#6366F1",
  },
  {
    id: "service",
    name: "Client Project Satisfaction",
    description: "1–10 NPS rating measuring communication, delivery timelines, and quality.",
    icon: Briefcase,
    color: "#2563EB",
  },
  {
    id: "general",
    name: "General Feedback Form",
    description: "Standard starter feedback form suitable for any website or app.",
    icon: Star,
    color: "#64748B",
  },
];

function getScaleBadgeLabel(scale: string) {
  switch (scale) {
    case "5_emoji":
      return "5 Emojis";
    case "1_10_numeric":
      return "1–10 Scale";
    case "5_star":
    default:
      return "5 Stars";
  }
}

export default function WorkspaceFormsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceRead | null>(null);
  const [forms, setForms] = useState<FeedbackForm[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("saas");
  const [newFormName, setNewFormName] = useState("Main Feedback Widget");
  const [newFormSlug, setNewFormSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Share Modal
  const [shareForm, setShareForm] = useState<FeedbackForm | null>(null);

  // Delete Modal
  const [deleteFormTarget, setDeleteFormTarget] = useState<FeedbackForm | null>(
    null
  );

  // Load workspace & forms
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!workspaceSlug) return;
      try {
        let wsList = workspaces;
        if (wsList.length === 0) {
          wsList = await authRepository.getWorkspaces();
          setWorkspaces(wsList);
        }

        const membership = wsList.find(
          (w) => w.workspace_slug.toLowerCase() === workspaceSlug.toLowerCase()
        );
        if (!membership) {
          if (wsList.length > 0) {
            router.replace(`/workspace/${wsList[0].workspace_slug}`);
          } else {
            router.replace("/create-workspace");
          }
          return;
        }

        const [wsDetails, formsList] = await Promise.all([
          authRepository.getWorkspace(membership.workspace_id),
          feedbackRepository.listForms(membership.workspace_id),
        ]);

        if (!isMounted) return;
        setWorkspace(wsDetails);
        setForms(formsList);
        setIsLoading(false);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load forms";
          toast.error(msg);
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, workspaces, router, setWorkspaces]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setSelectedTemplate("saas");
    setNewFormName("Website Feedback Widget");
    setNewFormSlug("");
    setIsCreateModalOpen(true);
  };

  // Submit Create Form
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !newFormName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: FeedbackFormCreate = {
        name: newFormName.trim(),
        template_type: selectedTemplate,
        slug: newFormSlug.trim() || undefined,
      };

      const created = await feedbackRepository.createForm(
        workspace.id,
        payload
      );
      toast.success("Form created successfully");
      setIsCreateModalOpen(false);
      // Navigate to studio builder for immediate customization
      router.push(`/workspace/${workspaceSlug}/forms/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create form";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  // Toggle Form Active Status
  const handleToggleActive = async (form: FeedbackForm) => {
    if (!workspace) return;
    try {
      const updated = await feedbackRepository.updateForm(
        workspace.id,
        form.id,
        {
          is_active: !form.is_active,
        }
      );
      setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast.success(
        updated.is_active ? "Form activated" : "Form paused"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update form status";
      toast.error(msg);
    }
  };

  // Duplicate Form
  const handleDuplicate = async (form: FeedbackForm) => {
    if (!workspace) return;
    try {
      const cloned = await feedbackRepository.duplicateForm(
        workspace.id,
        form.id
      );
      setForms((prev) => [cloned, ...prev]);
      toast.success(`Duplicated form as "${cloned.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to duplicate form";
      toast.error(msg);
    }
  };

  // Delete Form
  const handleDeleteForm = async () => {
    if (!workspace || !deleteFormTarget) return;

    setIsSubmitting(true);
    try {
      await feedbackRepository.deleteForm(workspace.id, deleteFormTarget.id);
      setForms((prev) => prev.filter((f) => f.id !== deleteFormTarget.id));
      setDeleteFormTarget(null);
      toast.success("Form deleted successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete form";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-action" />
          <p className="text-[14px] font-medium text-text-muted">
            Loading forms & widgets…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-text">
            Forms & widgets
          </h1>
          <p className="mt-0.5 text-[14px] text-text-muted">
            Design embeddable widgets, popups, and standalone feedback pages.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-action px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-action-hover active:scale-[0.98] shadow-xs"
        >
          <Plus className="size-4" />
          <span>New form</span>
        </button>
      </div>

      {/* Forms Card / Table */}
      <section className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
        {forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-action-subtle text-action-subtle-fg">
              <FileText className="size-6" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold text-text">
              No feedback forms created yet
            </h3>
            <p className="mt-1 max-w-sm text-[13px] text-text-muted">
              Create your first form using our pre-built SaaS, e-commerce, or exit survey templates.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-action px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-action-hover active:scale-[0.98] shadow-xs"
            >
              <Plus className="size-4" />
              <span>Create with template</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-subtle text-[12px] font-semibold text-text-muted">
                  <th className="px-6 py-3">Form</th>
                  <th className="px-6 py-3">Public link</th>
                  <th className="px-6 py-3">Scale</th>
                  <th className="px-6 py-3">Pills</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {forms.map((form) => (
                  <tr
                    key={form.id}
                    className="group transition-colors hover:bg-hover"
                  >
                    {/* Name & Title */}
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          href={`/workspace/${workspaceSlug}/forms/${form.id}`}
                          className="text-[14px] font-semibold text-text transition-colors hover:text-action"
                        >
                          {form.name}
                        </Link>
                        <p className="line-clamp-1 text-[12px] text-text-muted">
                          {form.title}
                        </p>
                      </div>
                    </td>

                    {/* Slug & Hosted Page */}
                    <td className="px-6 py-4">
                      <a
                        href={`/f/${workspaceSlug}/${form.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[12px] text-action hover:underline"
                      >
                        <span>/f/{form.slug}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </td>

                    {/* Rating Scale Badge */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-subtle px-2 py-0.5 text-[12px] font-medium text-text-muted">
                        {getScaleBadgeLabel(form.rating_scale_type)}
                      </span>
                    </td>

                    {/* Category Pills Count */}
                    <td className="px-6 py-4">
                      <span className="text-[13px] tabular-nums text-text-muted">
                        {form.category_pills.length} {form.category_pills.length === 1 ? "pill" : "pills"}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(form)}
                        className={`inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                          form.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}
                      >
                        {form.is_active ? "Active" : "Paused"}
                      </button>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Studio Edit */}
                        <Link
                          href={`/workspace/${workspaceSlug}/forms/${form.id}`}
                          title="Open Form Studio"
                          aria-label={`Open Form Studio for ${form.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-[0.98]"
                        >
                          <Edit2 className="size-4" />
                        </Link>

                        {/* Share & Embed */}
                        <button
                          type="button"
                          onClick={() => setShareForm(form)}
                          title="Share & Embed Widget"
                          aria-label={`Share ${form.name}`}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-[0.98]"
                        >
                          <Share2 className="size-4" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(form)}
                          title="Duplicate Form"
                          aria-label={`Duplicate ${form.name}`}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover hover:text-text active:scale-[0.98]"
                        >
                          <Copy className="size-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteFormTarget(form)}
                          title="Delete Form"
                          aria-label={`Delete ${form.name}`}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-status-error transition-colors hover:bg-status-error-bg active:scale-[0.98]"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="flex h-12 items-center justify-between border-t border-border bg-subtle px-6 text-[12px] tabular-nums text-text-muted">
              <span>
                Total: {forms.length} {forms.length === 1 ? "form" : "forms"}
              </span>
              <span>
                Active: {forms.filter((f) => f.is_active).length}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ================= MODAL 1: CREATE FORM (TEMPLATE SELECTOR) ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] p-4 backdrop-blur-xs">
          <div className="w-full max-w-[560px] rounded-[20px] border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-semibold text-text">
                  Create Feedback Form
                </h3>
                <p className="mt-1 text-[13px] text-text-muted">
                  Select an industry starter template or build a custom form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-muted hover:bg-hover active:scale-[0.98]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateForm} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">
                  Form name <span className="text-status-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="e.g. Website Feedback Widget"
                  className="h-10 w-full rounded-[10px] border border-border bg-surface px-3.5 text-[14px] text-text transition-colors focus:border-action focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">
                  URL slug (optional)
                </label>
                <div className="flex items-center rounded-[10px] border border-border bg-surface px-3">
                  <span className="font-mono text-[12px] text-text-muted">/f/{workspaceSlug}/</span>
                  <input
                    type="text"
                    value={newFormSlug}
                    onChange={(e) => setNewFormSlug(e.target.value)}
                    placeholder="feedback"
                    className="h-10 w-full bg-transparent px-1 font-mono text-[13px] text-text focus:outline-none"
                  />
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="mb-2 block text-[13px] font-medium text-text">
                  Starter template
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {STARTER_TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    return (
                      <label
                        key={tmpl.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-3 transition-colors ${
                          selectedTemplate === tmpl.id
                            ? "border-action bg-action-subtle"
                            : "border-border hover:bg-hover"
                        }`}
                      >
                        <input
                          type="radio"
                          name="form-starter-template"
                          value={tmpl.id}
                          checked={selectedTemplate === tmpl.id}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          className="mt-0.5 size-4 accent-action"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-action" />
                            <span className="text-[13px] font-semibold text-text">
                              {tmpl.name}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {tmpl.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-[10px] border border-border px-4 py-2 text-[14px] font-medium text-text hover:bg-hover active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newFormName.trim()}
                  className="flex items-center gap-2 rounded-[10px] bg-action px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-action-hover active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <span>Create & Open Studio</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: DELETE FORM CONFIRMATION ================= */}
      {deleteFormTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,24,40,0.45)] p-4 backdrop-blur-xs">
          <div className="w-full max-w-[460px] rounded-[20px] border border-border bg-surface p-6 shadow-xl">
            <div className="flex size-11 items-center justify-center rounded-full bg-status-error-bg text-status-error">
              <AlertTriangle className="size-5" />
            </div>

            <h3 className="mt-4 text-[18px] font-semibold text-text">
              Delete form &ldquo;{deleteFormTarget.name}&rdquo;?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
              Are you sure you want to delete this form? Any embedded widgets will stop loading. Historical feedback submissions already captured will remain preserved in your dashboard.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteFormTarget(null)}
                className="rounded-[10px] border border-border px-4 py-2 text-[14px] font-medium text-text hover:bg-hover active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteForm}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-[10px] bg-status-error px-4 py-2 text-[14px] font-medium text-white transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete Form</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SHARE / EMBED ================= */}
      {shareForm && (
        <FormShareModal
          isOpen={true}
          onClose={() => setShareForm(null)}
          workspaceSlug={workspaceSlug}
          formSlug={shareForm.slug}
          formName={shareForm.name}
        />
      )}
    </div>
  );
}

