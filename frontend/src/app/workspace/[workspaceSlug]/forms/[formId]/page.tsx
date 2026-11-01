"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Laptop,
  Layers,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Share2,
  Smartphone,
  Smile,
  Sparkles,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { FormShareModal } from "@/components/workspace/form-share-modal";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { useWorkspaceStore } from "@/store/workspace.store";
import type { WorkspaceRead } from "@/types/auth";
import type {
  CategoryPillItem,
  CustomQuestionItem,
  FeedbackCategory,
  FeedbackForm,
  FeedbackFormUpdate,
} from "@/types/feedback";

const PALETTE_COLORS = [
  "#4249C9", // Brand Indigo
  "#2563EB", // Blue
  "#059669", // Emerald
  "#0284C7", // Sky
  "#7C3AED", // Violet
  "#DB2777", // Pink
  "#EA580C", // Orange
  "#161C26", // Dark Slate
];

const EMOJI_SCALE = [
  { value: 1, emoji: "😡", label: "Terrible" },
  { value: 2, emoji: "🙁", label: "Poor" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😍", label: "Amazing" },
];

export default function FormStudioPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;
  const formId = params?.formId as string;

  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceRead | null>(null);
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);

  // Studio Active Tab
  const [activeTab, setActiveTab] = useState<
    "content" | "pills" | "questions" | "styling" | "outcomes" | "settings"
  >("content");

  // Editable Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ratingScaleType, setRatingScaleType] = useState<
    "5_star" | "5_emoji" | "1_10_numeric"
  >("5_star");
  const [ratingRequired, setRatingRequired] = useState(true);
  const [openPrompt, setOpenPrompt] = useState("");
  const [openPlaceholder, setOpenPlaceholder] = useState("");
  const [contactMode, setContactMode] = useState<"optional" | "required" | "hidden">(
    "optional"
  );
  const [categoryPills, setCategoryPills] = useState<CategoryPillItem[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestionItem[]>([]);
  const [primaryColor, setPrimaryColor] = useState("#4249C9");
  const [borderRadius, setBorderRadius] = useState(12);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | "system">("system");

  // Outcome screen state
  const [lowTitle, setLowTitle] = useState("");
  const [lowMessage, setLowMessage] = useState("");
  const [highTitle, setHighTitle] = useState("");
  const [highMessage, setHighMessage] = useState("");
  const [highCtaText, setHighCtaText] = useState("");
  const [highCtaUrl, setHighCtaUrl] = useState("");

  // Widget trigger settings
  const [widgetPosition, setWidgetPosition] = useState<
    "bottom_right" | "bottom_left" | "custom_trigger"
  >("bottom_right");
  const [widgetButtonText, setWidgetButtonText] = useState("Feedback");

  // Live Preview Device Mode
  const [previewDevice, setPreviewDevice] = useState<"widget" | "mobile" | "standalone">(
    "widget"
  );

  // Live Preview Interactive State
  const [previewRating, setPreviewRating] = useState<number | null>(4);
  const [previewSelectedPill, setPreviewSelectedPill] = useState<string | null>(null);
  const [previewComment, setPreviewComment] = useState("");
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load form, workspace, and categories
  useEffect(() => {
    let isMounted = true;

    async function loadStudioData() {
      if (!workspaceSlug || !formId) return;

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
          router.replace("/dashboard/workspaces");
          return;
        }

        const [wsDetails, formData, categoriesList] = await Promise.all([
          authRepository.getWorkspace(membership.workspace_id),
          feedbackRepository.getForm(membership.workspace_id, formId),
          feedbackRepository.listCategories(membership.workspace_id),
        ]);

        if (!isMounted) return;

        setWorkspace(wsDetails);
        setForm(formData);
        setCategories(categoriesList);

        // Populate state
        setName(formData.name);
        setSlug(formData.slug);
        setTitle(formData.title);
        setSubtitle(formData.subtitle || "");
        setRatingScaleType(formData.rating_scale_type);
        setRatingRequired(formData.rating_required);
        setOpenPrompt(formData.open_feedback_prompt);
        setOpenPlaceholder(formData.open_feedback_placeholder || "");
        setContactMode(formData.contact_field_mode);
        setCategoryPills(formData.category_pills || []);
        setCustomQuestions(formData.custom_questions || []);

        const theme = formData.theme_config || {};
        setPrimaryColor(theme.primary_color || "#4249C9");
        setBorderRadius(theme.border_radius ?? 12);
        setColorScheme(theme.color_scheme || "system");

        const outcome = formData.outcome_screen || {};
        setLowTitle(outcome.low_score_title || "Thank you for the candid feedback");
        setLowMessage(
          outcome.low_score_message ||
            "We're sorry your experience wasn't ideal. Our team reviews all issues directly."
        );
        setHighTitle(outcome.high_score_title || "Thank you so much!");
        setHighMessage(
          outcome.high_score_message ||
            "We are thrilled you're having a great experience!"
        );
        setHighCtaText(outcome.high_score_cta_text || "");
        setHighCtaUrl(outcome.high_score_cta_url || "");

        const widget = formData.widget_settings || {};
        setWidgetPosition(widget.position || "bottom_right");
        setWidgetButtonText(widget.button_text || "Feedback");

        setIsLoading(false);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load form";
          toast.error(msg);
          setIsLoading(false);
        }
      }
    }

    loadStudioData();

    return () => {
      isMounted = false;
    };
  }, [workspaceSlug, formId, workspaces, router, setWorkspaces]);

  // Handle Save
  const handleSaveForm = async () => {
    if (!workspace || !form || isSaving) return;

    setIsSaving(true);
    try {
      const payload: FeedbackFormUpdate = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        rating_scale_type: ratingScaleType,
        rating_required: ratingRequired,
        open_feedback_prompt: openPrompt.trim(),
        open_feedback_placeholder: openPlaceholder.trim() || undefined,
        contact_field_mode: contactMode,
        category_pills: categoryPills,
        custom_questions: customQuestions,
        theme_config: {
          primary_color: primaryColor,
          border_radius: borderRadius,
          color_scheme: colorScheme,
        },
        outcome_screen: {
          low_score_title: lowTitle,
          low_score_message: lowMessage,
          high_score_title: highTitle,
          high_score_message: highMessage,
          high_score_cta_text: highCtaText.trim() || undefined,
          high_score_cta_url: highCtaUrl.trim() || undefined,
        },
        widget_settings: {
          position: widgetPosition,
          button_text: widgetButtonText.trim(),
          delay_seconds: 0,
        },
      };

      const updated = await feedbackRepository.updateForm(
        workspace.id,
        form.id,
        payload
      );
      setForm(updated);
      setSlug(updated.slug);
      toast.success("Form changes saved successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save form";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Add a Category Pill
  const handleAddPill = () => {
    const defaultCat = categories[0];
    const newPill: CategoryPillItem = {
      id: `pill_${Date.now()}`,
      label: defaultCat ? defaultCat.name : "New Category",
      category_id: defaultCat ? defaultCat.id : null,
    };
    setCategoryPills((prev) => [...prev, newPill]);
  };

  const handleRemovePill = (id: string) => {
    setCategoryPills((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePill = (
    id: string,
    field: "label" | "category_id",
    value: string
  ) => {
    setCategoryPills((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === "category_id") {
          const matched = categories.find((c) => c.id === value);
          return {
            ...p,
            category_id: value || null,
            label: matched ? matched.name : p.label,
          };
        }
        return { ...p, [field]: value };
      })
    );
  };

  // Add a Custom Question
  const handleAddQuestion = () => {
    if (customQuestions.length >= 3) {
      toast.error("A maximum of 3 custom questions is supported.");
      return;
    }
    const newQ: CustomQuestionItem = {
      id: `q_${Date.now()}`,
      label: "What is your main goal with our product?",
      type: "single_choice",
      options: ["Growth", "Efficiency", "Learning"],
      required: false,
    };
    setCustomQuestions((prev) => [...prev, newQ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#4249C9]" />
          <p className="text-sm font-medium text-[#556070] dark:text-[#8E8E93]">
            Loading Form Studio…
          </p>
        </div>
      </div>
    );
  }

  const isLowScorePreview = (previewRating ?? 5) <= 3;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-[#F9FAFC] dark:bg-[#161618]">
      {/* Studio Top Control Strip */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E1E5EB] bg-white px-6 dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${workspaceSlug}/forms`}
            className="flex size-8 items-center justify-center rounded-lg text-[#556070] hover:bg-[#F3F5F9] dark:text-[#8E8E93] dark:hover:bg-white/5"
            title="Back to Forms"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="h-4 w-px bg-[#E1E5EB] dark:bg-white/10" />
          <span className="text-[13px] text-[#556070] dark:text-[#8E8E93]">Forms</span>
          <span className="text-[13px] text-[#8E8E93]">/</span>
          <span className="text-[14px] font-semibold text-[#161C26] dark:text-white">
            {name || "Untitled Form"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[#E1E5EB] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#161C26] hover:bg-[#F3F5F9] dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white dark:hover:bg-white/10"
          >
            <Share2 className="size-4 text-[#4249C9] dark:text-[#7B82F6]" />
            <span>Share & Embed</span>
          </button>
          <button
            type="button"
            onClick={handleSaveForm}
            disabled={isSaving}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-[#4249C9] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#363BA6] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Body: 2 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* ================= LEFT COLUMN: CONFIGURATION INSPECTOR ================= */}
        <div className="flex w-[480px] shrink-0 flex-col border-r border-[#E1E5EB] bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#E1E5EB] px-4 dark:border-white/10 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "content"
                  ? "border-[#4249C9] text-[#4249C9] dark:border-[#7B82F6] dark:text-[#7B82F6]"
                  : "border-transparent text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pills")}
              className={`border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "pills"
                  ? "border-[#4249C9] text-[#4249C9] dark:border-[#7B82F6] dark:text-[#7B82F6]"
                  : "border-transparent text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              }`}
            >
              Category Pills
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "questions"
                  ? "border-[#4249C9] text-[#4249C9] dark:border-[#7B82F6] dark:text-[#7B82F6]"
                  : "border-transparent text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              }`}
            >
              Questions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("styling")}
              className={`border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "styling"
                  ? "border-[#4249C9] text-[#4249C9] dark:border-[#7B82F6] dark:text-[#7B82F6]"
                  : "border-transparent text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              }`}
            >
              Styling
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("outcomes")}
              className={`border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "outcomes"
                  ? "border-[#4249C9] text-[#4249C9] dark:border-[#7B82F6] dark:text-[#7B82F6]"
                  : "border-transparent text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              }`}
            >
              Outcomes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === "settings"
                  ? "border-[#4249C9] text-[#4249C9] dark:border-[#7B82F6] dark:text-[#7B82F6]"
                  : "border-transparent text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              }`}
            >
              Settings
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ================= TAB 1: CONTENT ================= */}
            {activeTab === "content" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Main Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="We read every single comment to improve."
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                </div>

                {/* Rating Scale Type */}
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Rating Scale Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRatingScaleType("5_star")}
                      className={`flex flex-col items-center justify-center rounded-[12px] border p-3 text-center transition-all ${
                        ratingScaleType === "5_star"
                          ? "border-[#4249C9] bg-[#F0F2FE]/50 font-semibold text-[#4249C9] dark:border-[#7B82F6] dark:bg-[#4249C9]/15 dark:text-[#7B82F6]"
                          : "border-[#E1E5EB] text-[#556070] hover:bg-[#F7F9FC] dark:border-white/10 dark:text-[#8E8E93]"
                      }`}
                    >
                      <span className="text-[18px]">★</span>
                      <span className="mt-1 text-[12px]">5 Stars</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRatingScaleType("5_emoji")}
                      className={`flex flex-col items-center justify-center rounded-[12px] border p-3 text-center transition-all ${
                        ratingScaleType === "5_emoji"
                          ? "border-[#4249C9] bg-[#F0F2FE]/50 font-semibold text-[#4249C9] dark:border-[#7B82F6] dark:bg-[#4249C9]/15 dark:text-[#7B82F6]"
                          : "border-[#E1E5EB] text-[#556070] hover:bg-[#F7F9FC] dark:border-white/10 dark:text-[#8E8E93]"
                      }`}
                    >
                      <span className="text-[18px]">😄</span>
                      <span className="mt-1 text-[12px]">5 Emojis</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRatingScaleType("1_10_numeric")}
                      className={`flex flex-col items-center justify-center rounded-[12px] border p-3 text-center transition-all ${
                        ratingScaleType === "1_10_numeric"
                          ? "border-[#4249C9] bg-[#F0F2FE]/50 font-semibold text-[#4249C9] dark:border-[#7B82F6] dark:bg-[#4249C9]/15 dark:text-[#7B82F6]"
                          : "border-[#E1E5EB] text-[#556070] hover:bg-[#F7F9FC] dark:border-white/10 dark:text-[#8E8E93]"
                      }`}
                    >
                      <span className="text-[16px] font-bold">1–10</span>
                      <span className="mt-1 text-[12px]">NPS Scale</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[10px] border border-[#E1E5EB] p-3 dark:border-white/10">
                  <span className="text-[13px] font-medium text-[#161C26] dark:text-white">
                    Rating is required
                  </span>
                  <input
                    type="checkbox"
                    checked={ratingRequired}
                    onChange={(e) => setRatingRequired(e.target.checked)}
                    className="size-4 rounded text-[#4249C9]"
                  />
                </div>

                {/* Open Feedback Field */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Comment Box Prompt
                  </label>
                  <input
                    type="text"
                    value={openPrompt}
                    onChange={(e) => setOpenPrompt(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Comment Box Placeholder
                  </label>
                  <input
                    type="text"
                    value={openPlaceholder}
                    onChange={(e) => setOpenPlaceholder(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] text-[#161C26] focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  />
                </div>

                {/* Contact Mode */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    User Contact Field
                  </label>
                  <select
                    value={contactMode}
                    onChange={(e) =>
                      setContactMode(e.target.value as "optional" | "required" | "hidden")
                    }
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] bg-white px-3 text-[14px] text-[#161C26] focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                  >
                    <option value="optional">Optional (Ask for Email & Name)</option>
                    <option value="required">Required (Must provide Email)</option>
                    <option value="hidden">Hidden (Anonymous or Passed via SDK)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ================= TAB 2: PILLS & TAXONOMY ================= */}
            {activeTab === "pills" && (
              <div className="space-y-4">
                <div className="rounded-[10px] border border-[#E1E5EB] bg-[#F7F9FC] p-3 text-[12px] text-[#556070] dark:border-white/10 dark:bg-white/5 dark:text-[#8E8E93]">
                  💡 <strong>Deterministic Tagging:</strong> Each pill links to one of your workspace Theme Buckets. When a customer taps a pill, their feedback is automatically classified with zero LLM costs.
                </div>

                <div className="space-y-3">
                  {categoryPills.map((pill, idx) => (
                    <div
                      key={pill.id}
                      className="flex items-center gap-2 rounded-[12px] border border-[#E1E5EB] p-3 dark:border-white/10"
                    >
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={pill.label}
                          onChange={(e) =>
                            handleUpdatePill(pill.id, "label", e.target.value)
                          }
                          placeholder="Pill label"
                          className="h-8 w-full rounded-[8px] border border-[#E1E5EB] px-2 text-[13px] font-medium focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E]"
                        />
                        <select
                          value={pill.category_id || ""}
                          onChange={(e) =>
                            handleUpdatePill(pill.id, "category_id", e.target.value)
                          }
                          className="h-8 w-full rounded-[8px] border border-[#E1E5EB] bg-white px-2 text-[12px] text-[#556070] dark:border-white/15 dark:bg-[#2C2C2E] dark:text-[#8E8E93]"
                        >
                          <option value="">Map to Category Bucket…</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} {cat.is_uncategorized ? "(Catch-all)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePill(pill.id)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#C0281B] hover:bg-[#FDECEB] dark:hover:bg-red-950/20"
                        title="Remove Pill"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddPill}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#E1E5EB] py-2.5 text-[13px] font-medium text-[#4249C9] hover:bg-[#F0F2FE]/50 dark:border-white/15 dark:text-[#7B82F6]"
                >
                  <Plus className="size-4" />
                  <span>Add Category Pill</span>
                </button>
              </div>
            )}

            {/* ================= TAB 3: CUSTOM QUESTIONS ================= */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                <p className="text-[13px] text-[#556070] dark:text-[#8E8E93]">
                  Add up to 3 optional or required questions to capture customer context (e.g. role, purchase intent).
                </p>

                {customQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-[12px] border border-[#E1E5EB] p-3 space-y-3 dark:border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#161C26] dark:text-white">
                        Question {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-[#C0281B] hover:text-red-700 text-[12px]"
                      >
                        Delete
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomQuestions((prev) =>
                          prev.map((item) =>
                            item.id === q.id ? { ...item, label: val } : item
                          )
                        );
                      }}
                      className="h-8 w-full rounded-[8px] border border-[#E1E5EB] px-2 text-[13px] dark:border-white/15 dark:bg-[#2C2C2E]"
                    />

                    <div className="flex items-center gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const val = e.target.value as "single_choice" | "multi_choice" | "text";
                          setCustomQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id ? { ...item, type: val } : item
                            )
                          );
                        }}
                        className="h-8 rounded-[8px] border border-[#E1E5EB] bg-white px-2 text-[12px] dark:border-white/15 dark:bg-[#2C2C2E]"
                      >
                        <option value="single_choice">Single Choice (Radio)</option>
                        <option value="multi_choice">Multi-Choice (Checkboxes)</option>
                        <option value="text">Short Text</option>
                      </select>

                      <label className="flex items-center gap-1.5 text-[12px] text-[#556070] dark:text-[#8E8E93]">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setCustomQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, required: val } : item
                              )
                            );
                          }}
                          className="size-3.5"
                        />
                        <span>Required</span>
                      </label>
                    </div>

                    {q.type !== "text" && (
                      <div>
                        <label className="text-[11px] text-[#556070] dark:text-[#8E8E93]">
                          Options (comma-separated):
                        </label>
                        <input
                          type="text"
                          value={q.options.join(", ")}
                          onChange={(e) => {
                            const opts = e.target.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean);
                            setCustomQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, options: opts } : item
                              )
                            );
                          }}
                          className="h-8 w-full rounded-[8px] border border-[#E1E5EB] px-2 text-[12px] dark:border-white/15 dark:bg-[#2C2C2E]"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {customQuestions.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#E1E5EB] py-2.5 text-[13px] font-medium text-[#4249C9] hover:bg-[#F0F2FE]/50 dark:border-white/15 dark:text-[#7B82F6]"
                  >
                    <Plus className="size-4" />
                    <span>Add Custom Question</span>
                  </button>
                )}
              </div>
            )}

            {/* ================= TAB 4: STYLING ================= */}
            {activeTab === "styling" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {PALETTE_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setPrimaryColor(hex)}
                          className={`size-7 rounded-full border-2 transition-transform cursor-pointer ${
                            primaryColor.toLowerCase() === hex.toLowerCase()
                              ? "scale-110 border-[#161C26] dark:border-white"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-8 w-24 rounded-[8px] border border-[#E1E5EB] px-2 font-mono text-[12px] uppercase dark:border-white/15 dark:bg-[#2C2C2E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Corner Radius: {borderRadius}px
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    step="2"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(Number(e.target.value))}
                    className="w-full accent-[#4249C9]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Color Scheme Mode
                  </label>
                  <select
                    value={colorScheme}
                    onChange={(e) =>
                      setColorScheme(e.target.value as "light" | "dark" | "system")
                    }
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] bg-white px-3 text-[14px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  >
                    <option value="system">Auto (Match User Device)</option>
                    <option value="light">Always Light</option>
                    <option value="dark">Always Dark</option>
                  </select>
                </div>
              </div>
            )}

            {/* ================= TAB 5: OUTCOMES ================= */}
            {activeTab === "outcomes" && (
              <div className="space-y-6">
                {/* High Score Screen */}
                <div className="rounded-[12px] border border-[#E1E5EB] p-4 space-y-3 dark:border-white/10">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="size-4" />
                    <span className="text-[14px] font-semibold">
                      High-Score Screen (4–5 Stars)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={highTitle}
                    onChange={(e) => setHighTitle(e.target.value)}
                    placeholder="Title"
                    className="h-8 w-full rounded-[8px] border border-[#E1E5EB] px-2 text-[13px] font-medium dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                  <textarea
                    rows={2}
                    value={highMessage}
                    onChange={(e) => setHighMessage(e.target.value)}
                    placeholder="Message"
                    className="w-full rounded-[8px] border border-[#E1E5EB] p-2 text-[13px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                  <div>
                    <label className="text-[11px] text-[#556070] dark:text-[#8E8E93]">
                      Review CTA Button (Optional Google / G2 / Trustpilot link):
                    </label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={highCtaText}
                        onChange={(e) => setHighCtaText(e.target.value)}
                        placeholder="Button Text (e.g. Rate on Google)"
                        className="h-8 rounded-[8px] border border-[#E1E5EB] px-2 text-[12px] dark:border-white/15 dark:bg-[#2C2C2E]"
                      />
                      <input
                        type="url"
                        value={highCtaUrl}
                        onChange={(e) => setHighCtaUrl(e.target.value)}
                        placeholder="https://g.page/r/review"
                        className="h-8 rounded-[8px] border border-[#E1E5EB] px-2 text-[12px] dark:border-white/15 dark:bg-[#2C2C2E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Low Score Screen */}
                <div className="rounded-[12px] border border-[#E1E5EB] p-4 space-y-3 dark:border-white/10">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Smile className="size-4" />
                    <span className="text-[14px] font-semibold">
                      Low-Score Screen (1–3 Stars)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={lowTitle}
                    onChange={(e) => setLowTitle(e.target.value)}
                    placeholder="Title"
                    className="h-8 w-full rounded-[8px] border border-[#E1E5EB] px-2 text-[13px] font-medium dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                  <textarea
                    rows={2}
                    value={lowMessage}
                    onChange={(e) => setLowMessage(e.target.value)}
                    placeholder="Message"
                    className="w-full rounded-[8px] border border-[#E1E5EB] p-2 text-[13px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                </div>
              </div>
            )}

            {/* ================= TAB 6: SETTINGS ================= */}
            {activeTab === "settings" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Internal Form Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 font-mono text-[13px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Widget Launcher Position
                  </label>
                  <select
                    value={widgetPosition}
                    onChange={(e) =>
                      setWidgetPosition(
                        e.target.value as "bottom_right" | "bottom_left" | "custom_trigger"
                      )
                    }
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] bg-white px-3 text-[14px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  >
                    <option value="bottom_right">Bottom Right (Default)</option>
                    <option value="bottom_left">Bottom Left</option>
                    <option value="custom_trigger">Custom Trigger Button</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-[#161C26] dark:text-white">
                    Widget Launcher Text
                  </label>
                  <input
                    type="text"
                    value={widgetButtonText}
                    onChange={(e) => setWidgetButtonText(e.target.value)}
                    className="h-10 w-full rounded-[10px] border border-[#E1E5EB] px-3.5 text-[14px] dark:border-white/15 dark:bg-[#2C2C2E]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: INTERACTIVE LIVE PREVIEW ================= */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#EDF0F5]/60 dark:bg-black/20">
          {/* Preview Device Bar */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#E1E5EB] bg-white px-6 dark:border-white/10 dark:bg-[#1C1C1E]">
            <div className="flex items-center gap-1 rounded-[8px] bg-[#F3F5F9] p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setPreviewDevice("widget")}
                className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-all ${
                  previewDevice === "widget"
                    ? "bg-white text-[#161C26] shadow-xs dark:bg-[#2C2C2E] dark:text-white"
                    : "text-[#556070] dark:text-[#8E8E93]"
                }`}
              >
                <Laptop className="size-3.5" />
                <span>Widget View</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-all ${
                  previewDevice === "mobile"
                    ? "bg-white text-[#161C26] shadow-xs dark:bg-[#2C2C2E] dark:text-white"
                    : "text-[#556070] dark:text-[#8E8E93]"
                }`}
              >
                <Smartphone className="size-3.5" />
                <span>Mobile Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("standalone")}
                className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-all ${
                  previewDevice === "standalone"
                    ? "bg-white text-[#161C26] shadow-xs dark:bg-[#2C2C2E] dark:text-white"
                    : "text-[#556070] dark:text-[#8E8E93]"
                }`}
              >
                <Globe className="size-3.5" />
                <span>Hosted Page</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewSubmitted(!previewSubmitted)}
                className="text-[12px] text-[#4249C9] hover:underline dark:text-[#7B82F6]"
              >
                {previewSubmitted ? "Preview Form State" : "Simulate Outcome State"}
              </button>
              <span className="text-[#8E8E93]">|</span>
              <button
                type="button"
                onClick={() => {
                  setPreviewRating(4);
                  setPreviewSelectedPill(null);
                  setPreviewComment("");
                  setPreviewSubmitted(false);
                }}
                className="flex items-center gap-1 text-[12px] text-[#556070] hover:text-[#161C26] dark:text-[#8E8E93]"
              >
                <RefreshCw className="size-3" />
                <span>Reset Preview</span>
              </button>
            </div>
          </div>

          {/* Interactive Frame Canvas */}
          <div className="flex flex-1 items-center justify-center p-6 overflow-y-auto">
            <div
              className={`transition-all duration-200 ${
                previewDevice === "mobile"
                  ? "w-[360px] rounded-[36px] border-[8px] border-[#161C26] bg-white shadow-2xl dark:border-[#2C2C2E] dark:bg-[#1C1C1E]"
                  : previewDevice === "standalone"
                  ? "w-full max-w-[540px] rounded-[24px] border border-[#E1E5EB] bg-white p-6 shadow-xl dark:border-white/15 dark:bg-[#1C1C1E]"
                  : "w-full max-w-[420px] rounded-[16px] border border-[#E1E5EB] bg-white p-5 shadow-2xl dark:border-white/15 dark:bg-[#1C1C1E]"
              }`}
              style={{
                borderRadius:
                  previewDevice === "mobile" ? "36px" : `${borderRadius}px`,
              }}
            >
              {/* Inner Form Content */}
              <div className="p-2 space-y-5">
                {/* Header */}
                <div>
                  <h3 className="text-[17px] font-semibold text-[#161C26] dark:text-white leading-snug">
                    {title || "How was your experience today?"}
                  </h3>
                  {subtitle && (
                    <p className="mt-1 text-[13px] text-[#556070] dark:text-[#8E8E93]">
                      {subtitle}
                    </p>
                  )}
                </div>

                {previewSubmitted ? (
                  /* ================= PREVIEW OUTCOME SCREEN ================= */
                  <div className="py-6 text-center space-y-4">
                    <div
                      className="mx-auto flex size-14 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Check className="size-7" />
                    </div>
                    <div>
                      <h4 className="text-[17px] font-semibold text-[#161C26] dark:text-white">
                        {isLowScorePreview ? lowTitle : highTitle}
                      </h4>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#556070] dark:text-[#8E8E93]">
                        {isLowScorePreview ? lowMessage : highMessage}
                      </p>
                    </div>

                    {!isLowScorePreview && highCtaText && (
                      <div className="pt-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span>{highCtaText}</span>
                          <ExternalLink className="size-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[#E1E5EB] dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setPreviewSubmitted(false)}
                        className="text-[12px] text-[#556070] hover:underline dark:text-[#8E8E93]"
                      >
                        Back to form
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ================= PREVIEW INPUT FIELDS ================= */
                  <div className="space-y-4">
                    {/* Rating Scale */}
                    <div>
                      {ratingScaleType === "5_star" && (
                        <div className="flex items-center justify-center gap-2 py-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setPreviewRating(star)}
                              className="cursor-pointer text-[28px] transition-transform hover:scale-110"
                            >
                              <span
                                style={{
                                  color:
                                    (previewRating ?? 0) >= star
                                      ? primaryColor
                                      : "#D1D5DB",
                                }}
                              >
                                ★
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {ratingScaleType === "5_emoji" && (
                        <div className="flex items-center justify-between py-1">
                          {EMOJI_SCALE.map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setPreviewRating(item.value)}
                              className={`flex flex-col items-center rounded-[8px] p-2 transition-transform cursor-pointer ${
                                previewRating === item.value
                                  ? "scale-110 bg-[#F0F2FE] dark:bg-white/10"
                                  : "hover:scale-105"
                              }`}
                            >
                              <span className="text-[24px]">{item.emoji}</span>
                              <span className="mt-1 text-[10px] text-[#556070] dark:text-[#8E8E93]">
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {ratingScaleType === "1_10_numeric" && (
                        <div className="space-y-1">
                          <div className="grid grid-cols-10 gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setPreviewRating(num)}
                                className={`flex h-8 items-center justify-center rounded-[6px] border text-[12px] font-semibold transition-all ${
                                  previewRating === num
                                    ? "text-white"
                                    : "border-[#E1E5EB] text-[#556070] hover:bg-[#F3F5F9] dark:border-white/10 dark:text-[#8E8E93]"
                                }`}
                                style={
                                  previewRating === num
                                    ? { backgroundColor: primaryColor, borderColor: primaryColor }
                                    : {}
                                }
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-[#8E8E93] px-1">
                            <span>Not likely</span>
                            <span>Extremely likely</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category Selector Pills */}
                    {categoryPills.length > 0 && (
                      <div>
                        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#8E8E93]">
                          What area is this regarding?
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {categoryPills.map((pill) => (
                            <button
                              key={pill.id}
                              type="button"
                              onClick={() =>
                                setPreviewSelectedPill(
                                  previewSelectedPill === pill.id ? null : pill.id
                                )
                              }
                              className={`cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                                previewSelectedPill === pill.id
                                  ? "text-white shadow-xs"
                                  : "bg-[#F3F5F9] text-[#556070] hover:bg-[#E1E5EB] dark:bg-white/10 dark:text-[#A1A1A6]"
                              }`}
                              style={
                                previewSelectedPill === pill.id
                                  ? { backgroundColor: primaryColor }
                                  : {}
                              }
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Questions Preview */}
                    {customQuestions.map((q) => (
                      <div key={q.id} className="space-y-1.5">
                        <label className="block text-[12px] font-medium text-[#161C26] dark:text-white">
                          {q.label} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        {q.type === "text" ? (
                          <input
                            type="text"
                            placeholder="Your answer..."
                            className="h-8 w-full rounded-[8px] border border-[#E1E5EB] px-2.5 text-[12px] dark:border-white/10 dark:bg-white/5"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt, i) => (
                              <label
                                key={i}
                                className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#556070] dark:text-[#8E8E93]"
                              >
                                <input
                                  type={q.type === "single_choice" ? "radio" : "checkbox"}
                                  name={q.id}
                                  className="size-3.5"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Open Feedback Textarea */}
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-[#161C26] dark:text-white">
                        {openPrompt || "What could we improve?"}
                      </label>
                      <textarea
                        rows={3}
                        value={previewComment}
                        onChange={(e) => setPreviewComment(e.target.value)}
                        placeholder={
                          openPlaceholder || "Tell us what you liked or what went wrong..."
                        }
                        className="w-full rounded-[10px] border border-[#E1E5EB] p-2.5 text-[13px] text-[#161C26] focus:border-[#4249C9] focus:outline-none dark:border-white/15 dark:bg-[#2C2C2E] dark:text-white"
                      />
                    </div>

                    {/* Contact Mode */}
                    {contactMode !== "hidden" && (
                      <div>
                        <input
                          type="email"
                          placeholder={
                            contactMode === "required"
                              ? "Your email address (required)"
                              : "Your email (optional, for follow-up)"
                          }
                          className="h-9 w-full rounded-[8px] border border-[#E1E5EB] px-3 text-[12px] dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewSubmitted(true)}
                      className="w-full cursor-pointer rounded-[10px] py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Send Feedback
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share / Embed Modal */}
      {isShareModalOpen && form && (
        <FormShareModal
          isOpen={true}
          onClose={() => setIsShareModalOpen(false)}
          workspaceSlug={workspaceSlug}
          formSlug={slug || form.slug}
          formName={name || form.name}
        />
      )}
    </div>
  );
}

