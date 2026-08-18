export type Plan = 'free' | 'pro';

export type Feature =
  | 'remove_branding'
  | 'custom_domain'
  | 'export_feedback'
  | 'multiple_projects'
  | 'advanced_analytics';

export const FREE_TIER_LIMIT = parseInt(
  process.env.FREE_TIER_LIMIT || '50',
  10,
);

/**
 * Centralized feature flags matrix.
 * Define which plans have access to which features here.
 */
const PLAN_FEATURES: Record<Plan, Feature[]> = {
  free: [],
  pro: [
    'remove_branding',
    'custom_domain',
    'export_feedback',
    'multiple_projects',
    'advanced_analytics',
  ],
};

/**
 * Checks if a given plan has access to a specific feature.
 * @param plan The user's subscription plan
 * @param feature The feature to check
 * @returns boolean
 */
export function can(plan: Plan | undefined | null, feature: Feature): boolean {
  if (!plan) return false;

  // If the plan exists in our matrix, check if the feature is included
  const allowedFeatures = PLAN_FEATURES[plan] || [];
  return allowedFeatures.includes(feature);
}
