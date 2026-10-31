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

