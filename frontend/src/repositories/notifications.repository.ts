/**
 * Repository client for Notification Connections and Feedback Alert Rules.
 */

import { apiClient } from "@/repositories/client";
import type {
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
  NotificationConnection,
  NotificationConnectionCreate,
  NotificationConnectionTestResponse,
  NotificationConnectionUpdate,
  OutboundDelivery,
  SlackOAuthAuthorizeResponse,
  SlackOAuthCallbackResponse,
} from "@/types/notifications";

export const notificationsRepository = {
  // Connections
  async listConnections(
    workspaceId: string
  ): Promise<NotificationConnection[]> {
    return apiClient<NotificationConnection[]>(
      `/workspaces/${workspaceId}/connections`,
      { workspaceId }
    );
  },

  async getConnection(
    workspaceId: string,
    connectionId: string
  ): Promise<NotificationConnection> {
    return apiClient<NotificationConnection>(
      `/workspaces/${workspaceId}/connections/${connectionId}`,
      { workspaceId }
    );
  },

  async createConnection(
    workspaceId: string,
    payload: NotificationConnectionCreate
  ): Promise<NotificationConnection> {
    return apiClient<NotificationConnection>(
      `/workspaces/${workspaceId}/connections`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  async updateConnection(
    workspaceId: string,
    connectionId: string,
    payload: NotificationConnectionUpdate
  ): Promise<NotificationConnection> {
    return apiClient<NotificationConnection>(
      `/workspaces/${workspaceId}/connections/${connectionId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  },

  async deleteConnection(
    workspaceId: string,
    connectionId: string
  ): Promise<void> {
    return apiClient<void>(
      `/workspaces/${workspaceId}/connections/${connectionId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  },

  async testConnection(
    workspaceId: string,
    connectionId: string
  ): Promise<NotificationConnectionTestResponse> {
    return apiClient<NotificationConnectionTestResponse>(
      `/workspaces/${workspaceId}/connections/${connectionId}/test`,
      {
        method: "POST",
        workspaceId,
      }
    );
  },

  async testRawDestination(
    workspaceId: string,
    destinationUrl: string,
    providerType: string = "slack_webhook"
  ): Promise<NotificationConnectionTestResponse> {
    return apiClient<NotificationConnectionTestResponse>(
      `/workspaces/${workspaceId}/connections/test-raw`,
      {
        method: "POST",
        workspaceId,
        body: { destination_url: destinationUrl, provider_type: providerType },
      }
    );
  },

  async listConnectionDeliveries(
    workspaceId: string,
    connectionId: string
  ): Promise<OutboundDelivery[]> {
    return apiClient<OutboundDelivery[]>(
      `/workspaces/${workspaceId}/connections/${connectionId}/deliveries`,
      { workspaceId }
    );
  },

  // Alert Rules
  async listAlertRules(workspaceId: string): Promise<AlertRule[]> {
    return apiClient<AlertRule[]>(
      `/workspaces/${workspaceId}/feedback/alerts`,
      { workspaceId }
    );
  },

  async getAlertRule(
    workspaceId: string,
    ruleId: string
  ): Promise<AlertRule> {
    return apiClient<AlertRule>(
      `/workspaces/${workspaceId}/feedback/alerts/${ruleId}`,
      { workspaceId }
    );
  },

  async createAlertRule(
    workspaceId: string,
    payload: AlertRuleCreate
  ): Promise<AlertRule> {
    return apiClient<AlertRule>(
      `/workspaces/${workspaceId}/feedback/alerts`,
      {
        method: "POST",
        workspaceId,
        body: payload,
      }
    );
  },

  async updateAlertRule(
    workspaceId: string,
    ruleId: string,
    payload: AlertRuleUpdate
  ): Promise<AlertRule> {
    return apiClient<AlertRule>(
      `/workspaces/${workspaceId}/feedback/alerts/${ruleId}`,
      {
        method: "PATCH",
        workspaceId,
        body: payload,
      }
    );
  },

  async deleteAlertRule(
    workspaceId: string,
    ruleId: string
  ): Promise<void> {
    return apiClient<void>(
      `/workspaces/${workspaceId}/feedback/alerts/${ruleId}`,
      {
        method: "DELETE",
        workspaceId,
      }
    );
  },

  // Slack 1-Click OAuth
  async getSlackAuthorizeUrl(
    workspaceId: string
  ): Promise<SlackOAuthAuthorizeResponse> {
    return apiClient<SlackOAuthAuthorizeResponse>(
      `/workspaces/${workspaceId}/connections/slack/authorize`,
      { workspaceId }
    );
  },

  async completeSlackOAuth(payload: {
    code: string;
    state: string;
  }): Promise<SlackOAuthCallbackResponse> {
    return apiClient<SlackOAuthCallbackResponse>(
      `/integrations/slack/callback`,
      {
        method: "POST",
        body: payload,
      }
    );
  },
};

