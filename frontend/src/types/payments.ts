/**
 * TypeScript types matching backend BillingOverviewRead, PortalSessionRead, and checkout config.
 */

export interface CheckoutConfigRead {
  environment: "sandbox" | "production";
  client_token: string;
  monthly_price_id: string;
  annual_price_id: string;
  is_configured: boolean;
}

export interface BillingOverviewRead {
  workspace_id: string;
  plan_tier: "free" | "pro";
  subscription_status: string;
  billing_interval: "month" | "year" | null;
  current_period_starts_at: string | null;
  current_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  has_portal_access: boolean;
  forms_used: number;
  forms_limit: number;
  submissions_used: number;
  submissions_limit: number;
  cycle_reset_at: string | null;
  checkout: CheckoutConfigRead;
}

export interface PortalSessionRead {
  url: string;
}
