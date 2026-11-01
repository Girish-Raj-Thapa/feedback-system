export interface FeedbackCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string | null;
  keywords: string[];
  is_uncategorized: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCategoryCreate {
  name: string;
  description: string;
  color: string;
  icon?: string | null;
  keywords?: string[];
  display_order?: number;
}

export interface FeedbackCategoryUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string | null;
  keywords?: string[];
  is_active?: boolean;
  display_order?: number;
}

export interface FeedbackCategorySeedRequest {
  industry?: string | null;
  force_reset?: boolean;
}

export interface FeedbackCategoryReorderItem {
  id: string;
  display_order: number;
}

export interface CategoryPillItem {
  id: string;
  label: string;
  category_id?: string | null;
}

export interface CustomQuestionItem {
  id: string;
  label: string;
  type: "single_choice" | "multi_choice" | "text";
  options: string[];
  required: boolean;
}

export interface ThemeConfig {
  primary_color: string;
  border_radius: number;
  color_scheme: "light" | "dark" | "system";
}

export interface OutcomeScreenConfig {
  low_score_title?: string;
  low_score_message?: string;
  high_score_title?: string;
  high_score_message?: string;
  high_score_cta_text?: string;
  high_score_cta_url?: string;
}

export interface WidgetSettingsConfig {
  position: "bottom_right" | "bottom_left" | "custom_trigger";
  button_text: string;
  delay_seconds: number;
}

export interface FeedbackForm {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  template_type: string | null;
  title: string;
  subtitle: string | null;
  rating_scale_type: "5_star" | "5_emoji" | "1_10_numeric";
  rating_required: boolean;
  category_pills: CategoryPillItem[];
  custom_questions: CustomQuestionItem[];
  open_feedback_prompt: string;
  open_feedback_placeholder: string | null;
  contact_field_mode: "hidden" | "optional" | "required";
  theme_config: ThemeConfig;
  outcome_screen: OutcomeScreenConfig;
  widget_settings: WidgetSettingsConfig;
  allowed_domains: string[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackFormCreate {
  name: string;
  slug?: string;
  template_type?: string;
  title?: string;
  subtitle?: string;
  rating_scale_type?: "5_star" | "5_emoji" | "1_10_numeric";
  rating_required?: boolean;
  category_pills?: CategoryPillItem[];
  custom_questions?: CustomQuestionItem[];
  open_feedback_prompt?: string;
  open_feedback_placeholder?: string;
  contact_field_mode?: "hidden" | "optional" | "required";
  theme_config?: Partial<ThemeConfig>;
  outcome_screen?: Partial<OutcomeScreenConfig>;
  widget_settings?: Partial<WidgetSettingsConfig>;
  allowed_domains?: string[];
}

export interface FeedbackFormUpdate {
  name?: string;
  slug?: string;
  is_active?: boolean;
  title?: string;
  subtitle?: string;
  rating_scale_type?: "5_star" | "5_emoji" | "1_10_numeric";
  rating_required?: boolean;
  category_pills?: CategoryPillItem[];
  custom_questions?: CustomQuestionItem[];
  open_feedback_prompt?: string;
  open_feedback_placeholder?: string;
  contact_field_mode?: "hidden" | "optional" | "required";
  theme_config?: Partial<ThemeConfig>;
  outcome_screen?: Partial<OutcomeScreenConfig>;
  widget_settings?: Partial<WidgetSettingsConfig>;
  allowed_domains?: string[];
}

export interface PublicFeedbackForm {
  id: string;
  workspace_slug: string;
  workspace_name: string;
  name: string;
  slug: string;
  is_active: boolean;
  title: string;
  subtitle: string | null;
  rating_scale_type: "5_star" | "5_emoji" | "1_10_numeric";
  rating_required: boolean;
  category_pills: CategoryPillItem[];
  custom_questions: CustomQuestionItem[];
  open_feedback_prompt: string;
  open_feedback_placeholder: string | null;
  contact_field_mode: "hidden" | "optional" | "required";
  theme_config: ThemeConfig;
  outcome_screen: OutcomeScreenConfig;
  widget_settings: WidgetSettingsConfig;
}

export interface FeedbackSubmissionCreate {
  rating?: number | null;
  category_pill_label?: string | null;
  comment?: string | null;
  custom_answers?: Record<string, any>;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_metadata?: Record<string, any>;
}

export interface FeedbackOutcomeResponse {
  title: string;
  message: string;
  is_high_score: boolean;
  cta_text?: string | null;
  cta_url?: string | null;
}

export interface FeedbackSubmissionResponse {
  id: string;
  workspace_slug: string;
  form_slug: string;
  rating: number | null;
  rating_scale_type: string;
  category_pill_label: string | null;
  category_id: string | null;
  status: string;
  created_at: string;
  outcome: FeedbackOutcomeResponse;
}

