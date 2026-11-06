/**
 * Notification Connections, Outbound Webhooks, and Alert Rules types.
 */

export type ProviderType = "slack_webhook";

export type ConnectionHealthStatus = "healthy" | "degraded" | "revoked";

export type AlertTriggerType = "detractors_only" | "all_feedback";

export interface NotificationConnection {
  id: string;
  workspace_id: string;
  name: string;
  provider_type: ProviderType;
  connection_method: "oauth" | "manual";
  destination_url_masked: string;
  is_active: boolean;
  health_status: ConnectionHealthStatus;
  failure_reason?: string | null;
  consecutive_failures: number;
  provider_metadata?: {
    app_id?: string;
    team_id?: string;
    team_name?: string;
    channel_id?: string;
    channel_name?: string;
    configuration_url?: string;
  } | null;
  last_dispatched_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlackOAuthAuthorizeResponse {
  authorize_url: string;
}

export interface SlackOAuthCallbackResponse {
  success: boolean;
  workspace_slug: string;
  channel_name: string;
  connection: NotificationConnection;
}

export interface NotificationConnectionCreate {
  name: string;
  provider_type?: ProviderType;
  destination_url: string;
}

export interface NotificationConnectionUpdate {
  name?: string;
  destination_url?: string;
  is_active?: boolean;
}

export interface NotificationConnectionTestResponse {
  success: boolean;
  status_code?: number | null;
  message: string;
}

export interface AlertRule {
  id: string;
  workspace_id: string;
  connection_id: string;
  name: string;
  trigger_type: AlertTriggerType;
  form_ids?: string[] | null;
  include_customer_email: boolean;
  is_active: boolean;
  connection_name?: string | null;
  connection_health?: ConnectionHealthStatus | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleCreate {
  connection_id: string;
  name: string;
  trigger_type: AlertTriggerType;
  form_ids?: string[] | null;
  include_customer_email?: boolean;
}

export interface AlertRuleUpdate {
  connection_id?: string;
  name?: string;
  trigger_type?: AlertTriggerType;
  form_ids?: string[] | null;
  include_customer_email?: boolean;
  is_active?: boolean;
}

export interface DeliveryAttempt {
  id: string;
  delivery_id: string;
  attempt_number: number;
  status_code?: number | null;
  response_snippet?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  attempted_at: string;
}

export interface OutboundDelivery {
  id: string;
  workspace_id: string;
  connection_id: string;
  alert_rule_id?: string | null;
  event_type: string;
  status:
    | "pending"
    | "processing"
    | "delivered"
    | "retry_scheduled"
    | "failed"
    | "cancelled";
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  attempts?: DeliveryAttempt[];
}

