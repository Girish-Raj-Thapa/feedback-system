"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Clock,
  Edit2,
  ExternalLink,
  Filter,
  Globe,
  History,
  KeyRound,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { notificationsRepository } from "@/repositories/notifications.repository";
import type { WorkspaceMemberRead } from "@/types/auth";
import type { FeedbackCategory, FeedbackForm } from "@/types/feedback";
import type {
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
  AlertTriggerType,
  ConnectionHealthStatus,
  NotificationConnection,
  NotificationConnectionCreate,
  NotificationConnectionUpdate,
  OutboundDelivery,
  ProviderType,
  WorkspaceNotificationQuota,
} from "@/types/notifications";

const PROVIDER_CONFIG: Record<
  ProviderType,
  {
    label: string;
    shortLabel: string;
    namePlaceholder: string;
    urlLabel: string;
    urlPlaceholder: string;
    urlHint: string;
    docsUrl: string | null;
    docsLabel: string | null;
  }
> = {
  slack_webhook: {
    label: "Slack",
    shortLabel: "Slack Webhook",
    namePlaceholder: "e.g. #customer-feedback or #churn-alerts",
    urlLabel: "Slack Incoming Webhook URL",
    urlPlaceholder: "https://hooks.slack.com/services/T.../B.../...",
    urlHint: "Must start with https://hooks.slack.com/services/.",
    docsUrl: "https://api.slack.com/apps",
    docsLabel: "Get webhook URL",
  },
  discord_webhook: {
    label: "Discord",
    shortLabel: "Discord Webhook",
    namePlaceholder: "e.g. #product-feedback or #bug-reports",
    urlLabel: "Discord Webhook URL",
    urlPlaceholder: "https://discord.com/api/webhooks/123456789/...",
    urlHint: "Must start with https://discord.com/api/webhooks/.",
    docsUrl:
      "https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks",
    docsLabel: "Discord webhook guide",
  },
  generic_webhook: {
    label: "Custom JSON",
    shortLabel: "JSON Webhook",
    namePlaceholder: "e.g. Zapier Lead Alerts or Linear Triage",
    urlLabel: "HTTPS Endpoint URL",
    urlPlaceholder: "https://api.example.com/webhooks/feedback",
    urlHint:
      "Must use HTTPS and resolve to a public internet address (Zapier, Make, n8n, or your API).",
    docsUrl: null,
    docsLabel: null,
  },
  email_alert: {
    label: "Email",
    shortLabel: "Email Alerts",
    namePlaceholder: "e.g. Owner Email Alerts",
    urlLabel: "Workspace Member Recipient",
    urlPlaceholder: "owner@company.com",
    urlHint:
      "Instant alerts are sent only to verified members of this workspace (defaults to Workspace Owner).",
    docsUrl: null,
    docsLabel: null,
  },
};

function getProviderBadgeLabel(conn: NotificationConnection): string {
  if (conn.provider_type === "discord_webhook") return "Discord Webhook";
  if (conn.provider_type === "generic_webhook") return "JSON Webhook";
  if (conn.provider_type === "email_alert") return "Email Alert";
  return conn.connection_method === "oauth" ? "OAuth ⚡" : "Manual Webhook";
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybeData = (err as { data?: { message?: unknown } }).data;
    if (typeof maybeData?.message === "string" && maybeData.message) {
      return maybeData.message;
    }
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage) {
      return maybeMessage;
    }
  }
  return fallback;
}

interface WorkspaceIntegrationsTabProps {
  workspaceId: string;
  isOwner?: boolean;
}

export function WorkspaceIntegrationsTab({
  workspaceId,
}: WorkspaceIntegrationsTabProps) {
  const [connections, setConnections] = useState<NotificationConnection[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberRead[]>([]);
  const [quota, setQuota] = useState<WorkspaceNotificationQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Connection Modals
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<NotificationConnection | null>(null);
  const [connProvider, setConnProvider] =
    useState<ProviderType>("slack_webhook");
  const [connName, setConnName] = useState("");
  const [connUrl, setConnUrl] = useState("");
  const [connSecret, setConnSecret] = useState("");
  const [autoCreateStarterRule, setAutoCreateStarterRule] = useState(false);
  const [isSubmittingConn, setIsSubmittingConn] = useState(false);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(
    null
  );

  // Rule Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleConnId, setRuleConnId] = useState("");
  const [ruleTrigger, setRuleTrigger] =
    useState<AlertTriggerType>("detractors_only");
  const [ruleFormScope, setRuleFormScope] = useState<"all" | "selected">("all");
  const [ruleSelectedForms, setRuleSelectedForms] = useState<string[]>([]);
  const [ruleCategoryScope, setRuleCategoryScope] = useState<"all" | "selected">(
    "all"
  );
  const [ruleSelectedCategories, setRuleSelectedCategories] = useState<string[]>(
    []
  );
  const [ruleIncludeEmail, setRuleIncludeEmail] = useState(true);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  // Delivery History Drawer
  const [historyConnection, setHistoryConnection] =
    useState<NotificationConnection | null>(null);
  const [deliveries, setDeliveries] = useState<OutboundDelivery[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Delete Modals
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "connection" | "rule";
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      notificationsRepository.listConnections(workspaceId),
      notificationsRepository.listAlertRules(workspaceId),
      feedbackRepository.listForms(workspaceId),
      Promise.resolve(
        feedbackRepository.listCategories
          ? feedbackRepository.listCategories(workspaceId)
          : []
      ).catch(() => [] as FeedbackCategory[]),
      Promise.resolve(
        authRepository?.listWorkspaceMembers
          ? authRepository.listWorkspaceMembers(workspaceId)
          : []
      ).catch(() => [] as WorkspaceMemberRead[]),
      Promise.resolve(
        notificationsRepository.getQuota
          ? notificationsRepository.getQuota(workspaceId)
          : null
      ).catch(() => null),
    ])
      .then(
        ([
          fetchedConnections,
          fetchedRules,
          fetchedForms,
          fetchedCategories,
          fetchedMembers,
          fetchedQuota,
        ]) => {
          if (!active) return;
          setConnections(fetchedConnections);
          setAlertRules(fetchedRules);
          setForms(fetchedForms);
          setCategories(fetchedCategories || []);
          setMembers(fetchedMembers || []);
          setQuota(fetchedQuota || null);
        }
      )
      .catch(() => {
        if (active) {
          toast.error("Failed to load integrations and alert rules");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  function getDefaultOwnerEmail(): string {
    const owner =
      members.find((m) => m.role_slug === "owner") || members[0];
    return owner?.email || "";
  }

  async function refreshQuota() {
    if (!notificationsRepository.getQuota) return;
    try {
      const updatedQuota = await notificationsRepository.getQuota(workspaceId);
      if (updatedQuota) {
        setQuota(updatedQuota);
      }
    } catch {
      // Keep existing quota display if refresh fails transiently
    }
  }

  // Connection Handlers
  async function handleConnectSlackOAuth() {
    setIsConnectingSlack(true);
    try {
      const res = await notificationsRepository.getSlackAuthorizeUrl(workspaceId);
      window.location.href = res.authorize_url;
    } catch (err: unknown) {
      toast.error(
        extractErrorMessage(err, "Failed to initiate Slack authorization")
      );
      setIsConnectingSlack(false);
    }
  }

  function openAddConnection(defaultProvider: ProviderType = "slack_webhook") {
    setEditingConnection(null);
    setConnProvider(defaultProvider);
    if (defaultProvider === "email_alert") {
      setConnName("Owner Email Alerts");
      setConnUrl(getDefaultOwnerEmail());
      setAutoCreateStarterRule(true);
    } else {
      setConnName("");
      setConnUrl("");
      setAutoCreateStarterRule(false);
    }
    setConnSecret("");
    setIsConnectionModalOpen(true);
  }

  function openEditConnection(conn: NotificationConnection) {
    setEditingConnection(conn);
    setConnProvider(conn.provider_type || "slack_webhook");
    setConnName(conn.name);
    setConnUrl(""); // Don't prefill masked URL, operator can leave blank to keep unchanged
    setConnSecret("");
    setAutoCreateStarterRule(false);
    setIsConnectionModalOpen(true);
  }

  async function handleSaveConnection(e: React.FormEvent) {
    e.preventDefault();
    const activeProvider = editingConnection
      ? editingConnection.provider_type
      : connProvider;
    const providerMeta = PROVIDER_CONFIG[activeProvider] || PROVIDER_CONFIG.slack_webhook;

    if (!connName.trim()) {
      toast.error("Please enter a connection name");
      return;
    }
    if (!editingConnection && !connUrl.trim()) {
      toast.error(`Please enter a valid ${providerMeta.label} webhook URL`);
      return;
    }

    setIsSubmittingConn(true);
    try {
      if (editingConnection) {
        const payload: NotificationConnectionUpdate = {
          name: connName.trim(),
        };
        if (connUrl.trim()) {
          payload.destination_url = connUrl.trim();
        }
        if (activeProvider === "generic_webhook" && connSecret.trim()) {
          payload.secret_token = connSecret.trim();
        }
        const updated = await notificationsRepository.updateConnection(
          workspaceId,
          editingConnection.id,
          payload
        );
        setConnections((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        toast.success(`${providerMeta.label} connection updated`);
      } else {
        const payload: NotificationConnectionCreate = {
          name: connName.trim(),
          provider_type: activeProvider,
          destination_url: connUrl.trim(),
          ...(activeProvider === "generic_webhook" && connSecret.trim()
            ? { secret_token: connSecret.trim() }
            : {}),
        };
        const created = await notificationsRepository.createConnection(
          workspaceId,
          payload
        );
        setConnections((prev) => [created, ...prev]);

        if (autoCreateStarterRule && notificationsRepository.createAlertRule) {
          try {
            const starterRule = await notificationsRepository.createAlertRule(
              workspaceId,
              {
                name: `${connName.trim()} (Low Ratings ≤ 3★)`,
                connection_id: created.id,
                trigger_type: "detractors_only",
                form_ids: null,
                category_ids: null,
                include_customer_email: true,
              }
            );
            if (starterRule) {
              setAlertRules((prev) => [starterRule, ...prev]);
            }
          } catch {
            // Connection succeeded; rule can still be added manually if rule quota reached
          }
        }
        toast.success(`${providerMeta.shortLabel} connected!`);
        void refreshQuota();
      }
      setIsConnectionModalOpen(false);
    } catch (err: unknown) {
      toast.error(
        extractErrorMessage(err, `Failed to save ${providerMeta.label} connection`)
      );
    } finally {
      setIsSubmittingConn(false);
    }
  }

  async function handleTestModalUrl() {
    if (!connUrl.trim()) {
      toast.error("Enter a webhook URL to test");
      return;
    }
    const activeProvider = editingConnection
      ? editingConnection.provider_type
      : connProvider;
    const providerMeta = PROVIDER_CONFIG[activeProvider] || PROVIDER_CONFIG.slack_webhook;

    setIsTestingUrl(true);
    try {
      const res = await notificationsRepository.testRawDestination(
        workspaceId,
        connUrl.trim(),
        activeProvider,
        activeProvider === "generic_webhook" && connSecret.trim()
          ? connSecret.trim()
          : undefined
      );
      if (res.success) {
        toast.success(`Test notification received by ${providerMeta.label}! ✅`);
      } else {
        toast.error(`${providerMeta.label} returned error: ${res.message}`);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Webhook test failed"));
    } finally {
      setIsTestingUrl(false);
    }
  }

  async function handleSendTestMessage(conn: NotificationConnection) {
    setTestingConnectionId(conn.id);
    const providerMeta =
      PROVIDER_CONFIG[conn.provider_type] || PROVIDER_CONFIG.slack_webhook;
    try {
      const res = await notificationsRepository.testConnection(
        workspaceId,
        conn.id
      );
      if (res.success) {
        toast.success(`Test ping delivered to ${conn.name} (${providerMeta.label})!`);
        // Refresh connection health
        const updated = await notificationsRepository.getConnection(
          workspaceId,
          conn.id
        );
        setConnections((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        toast.error(`${providerMeta.label} delivery failed: ${res.message}`);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Failed to send test message"));
    } finally {
      setTestingConnectionId(null);
    }
  }

  async function handleToggleConnectionActive(conn: NotificationConnection) {
    try {
      const updated = await notificationsRepository.updateConnection(
        workspaceId,
        conn.id,
        { is_active: !conn.is_active }
      );
      setConnections((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      toast.success(
        updated.is_active
          ? `${conn.name} resumed`
          : `${conn.name} paused`
      );
    } catch {
      toast.error("Failed to update connection status");
    }
  }

  async function openDeliveryHistory(conn: NotificationConnection) {
    setHistoryConnection(conn);
    setIsLoadingHistory(true);
    try {
      const list = await notificationsRepository.listConnectionDeliveries(
        workspaceId,
        conn.id
      );
      setDeliveries(list);
    } catch {
      toast.error("Failed to load delivery logs");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  // Alert Rule Handlers
  function openAddRule() {
    if (connections.length === 0) {
      toast.error("Connect a channel first before adding alert rules");
      return;
    }
    setEditingRule(null);
    setRuleName("Detractor Alerts (≤ 3★)");
    setRuleConnId(connections[0].id);
    setRuleTrigger("detractors_only");
    setRuleFormScope("all");
    setRuleSelectedForms([]);
    setRuleCategoryScope("all");
    setRuleSelectedCategories([]);
    setRuleIncludeEmail(true);
    setIsRuleModalOpen(true);
  }

  function openEditRule(rule: AlertRule) {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleConnId(rule.connection_id);
    setRuleTrigger(rule.trigger_type);
    if (rule.form_ids && rule.form_ids.length > 0) {
      setRuleFormScope("selected");
      setRuleSelectedForms(rule.form_ids);
    } else {
      setRuleFormScope("all");
      setRuleSelectedForms([]);
    }
    if (rule.category_ids && rule.category_ids.length > 0) {
      setRuleCategoryScope("selected");
      setRuleSelectedCategories(rule.category_ids);
    } else {
      setRuleCategoryScope("all");
      setRuleSelectedCategories([]);
    }
    setRuleIncludeEmail(rule.include_customer_email);
    setIsRuleModalOpen(true);
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleName.trim()) {
      toast.error("Please enter a rule name");
      return;
    }
    if (!ruleConnId) {
      toast.error("Please select a destination channel");
      return;
    }
    if (ruleFormScope === "selected" && ruleSelectedForms.length === 0) {
      toast.error("Please select at least one form or choose 'All Forms'");
      return;
    }
    if (
      ruleCategoryScope === "selected" &&
      ruleSelectedCategories.length === 0
    ) {
      toast.error(
        "Please select at least one category or choose 'All Categories'"
      );
      return;
    }

    setIsSubmittingRule(true);
    try {
      const targetFormIds =
        ruleFormScope === "all" ? null : ruleSelectedForms;
      const targetCategoryIds =
        ruleCategoryScope === "all" ? null : ruleSelectedCategories;

      if (editingRule) {
        const payload: AlertRuleUpdate = {
          name: ruleName.trim(),
          connection_id: ruleConnId,
          trigger_type: ruleTrigger,
          form_ids: targetFormIds,
          ...(targetCategoryIds !== null ||
          (editingRule.category_ids && editingRule.category_ids.length > 0)
            ? { category_ids: targetCategoryIds }
            : {}),
          include_customer_email: ruleIncludeEmail,
        };
        const updated = await notificationsRepository.updateAlertRule(
          workspaceId,
          editingRule.id,
          payload
        );
        setAlertRules((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        toast.success("Alert rule updated");
      } else {
        const payload: AlertRuleCreate = {
          name: ruleName.trim(),
          connection_id: ruleConnId,
          trigger_type: ruleTrigger,
          form_ids: targetFormIds,
          ...(targetCategoryIds !== null
            ? { category_ids: targetCategoryIds }
            : {}),
          include_customer_email: ruleIncludeEmail,
        };
        const created = await notificationsRepository.createAlertRule(
          workspaceId,
          payload
        );
        setAlertRules((prev) => [created, ...prev]);
        toast.success("Alert rule created!");
        void refreshQuota();
      }
      setIsRuleModalOpen(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Failed to save alert rule"));
    } finally {
      setIsSubmittingRule(false);
    }
  }

  async function handleToggleRuleActive(rule: AlertRule) {
    try {
      const updated = await notificationsRepository.updateAlertRule(
        workspaceId,
        rule.id,
        { is_active: !rule.is_active }
      );
      setAlertRules((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      toast.success(
        updated.is_active ? `Alert enabled` : `Alert paused`
      );
    } catch {
      toast.error("Failed to update alert rule status");
    }
  }

  // Deletion
  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "connection") {
        await notificationsRepository.deleteConnection(
          workspaceId,
          deleteTarget.id
        );
        setConnections((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        // Remove associated rules locally
        setAlertRules((prev) =>
          prev.filter((r) => r.connection_id !== deleteTarget.id)
        );
        toast.success("Integration connection deleted");
      } else {
        await notificationsRepository.deleteAlertRule(
          workspaceId,
          deleteTarget.id
        );
        setAlertRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        toast.success("Alert rule deleted");
      }
      void refreshQuota();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete target");
    }
  }

  function renderHealthBadge(status: ConnectionHealthStatus, failures: number) {
    if (status === "healthy") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Healthy
        </span>
      );
    }
    if (status === "degraded") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          Degraded ({failures} fails)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <ShieldAlert className="w-3 h-3 text-rose-500" />
        Revoked / Inactive
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Loading integrations and webhook routing...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Bell className="w-5 h-5" />
            </span>
            Outbound Integrations & Alert Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Broadcast real-time customer feedback to Slack, Discord, or custom
            JSON webhooks (Zapier, Make, n8n). Configure instant detractor
            alerts and selective form routing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleConnectSlackOAuth}
            disabled={isConnectingSlack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-[#4A154B] hover:bg-[#3F103F] text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isConnectingSlack ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="font-bold">#</span>
            )}
            Add to Slack
          </button>
          <button
            onClick={() => openAddConnection("email_alert")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
            title="Receive instant email notifications on negative feedback"
          >
            <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Email Alerts
          </button>
          <button
            onClick={() => openAddConnection("slack_webhook")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
            title="Connect Slack, Discord, or custom JSON webhook"
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Webhook
          </button>
          <button
            onClick={openAddRule}
            disabled={connections.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            New Alert Rule
          </button>
        </div>
      </div>

      {/* PLAN QUOTA USAGE STRIP */}
      {quota && (
        <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className={`px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
                quota.plan_tier === "pro"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-muted text-foreground border border-border"
              }`}
            >
              {quota.plan_tier === "pro" ? "Pro Plan" : "Free Plan"}
            </span>
            <span className="text-muted-foreground tabular-nums">
              Email Alerts:{" "}
              <strong className="text-foreground">
                {quota.monthly_email_used} / {quota.monthly_email_limit}
              </strong>{" "}
              this cycle
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground tabular-nums">
              Webhook Alerts:{" "}
              <strong className="text-foreground">
                {quota.monthly_webhook_used} / {quota.monthly_webhook_limit}
              </strong>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground tabular-nums">
              Channels:{" "}
              <strong className="text-foreground">
                {quota.connections_used} / {quota.max_connections}
              </strong>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground tabular-nums">
              Rules:{" "}
              <strong className="text-foreground">
                {quota.alert_rules_used} / {quota.max_alert_rules}
              </strong>
            </span>
          </div>
          {quota.plan_tier === "free" &&
            (quota.monthly_email_used >= quota.monthly_email_limit ||
              quota.monthly_webhook_used >= quota.monthly_webhook_limit) && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Free alert limit reached — upgrade to Pro for higher limits.
              </span>
            )}
        </div>
      )}

      {/* SECTION 1: SLACK CONNECTIONS */}
      <div className="space-y-4">
        {/* Revoked Connection Alert Banner */}
        {connections.some((c) => c.health_status === "revoked") && (
          <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Action Required: Integration Connection Revoked</p>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  One or more webhook destinations were deleted or revoked. Reconnect or update the webhook URL to restore instant notifications.
                </p>
              </div>
            </div>
            {connections.some(
              (c) =>
                c.health_status === "revoked" && c.provider_type === "slack_webhook"
            ) && (
              <button
                onClick={handleConnectSlackOAuth}
                disabled={isConnectingSlack}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer"
              >
                Reconnect Channel
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-foreground">
              Connected Channels & Webhooks
            </h3>
            <p className="text-xs text-muted-foreground">
              Slack, Discord, and custom JSON webhook endpoints. Destination URLs and signing secrets are masked and encrypted at rest.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {connections.length} {connections.length === 1 ? "connection" : "connections"} configured
          </span>
        </div>

        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 border border-dashed border-border rounded-xl bg-muted/20 text-center space-y-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">No channels or webhooks connected</p>
              <p className="text-xs text-muted-foreground max-w-md mt-0.5">
                Connect Slack, Discord, or a custom JSON webhook (Zapier, Make, n8n, Linear) to receive real-time VoC alerts when customers submit feedback.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <button
                onClick={handleConnectSlackOAuth}
                disabled={isConnectingSlack}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#4A154B] hover:bg-[#3F103F] text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isConnectingSlack ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="font-bold">#</span>
                )}
                1-Click Add to Slack
              </button>
              <button
                onClick={() => openAddConnection("email_alert")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Email Alerts to Me
              </button>
              <button
                onClick={() => openAddConnection("discord_webhook")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white transition shadow-sm cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Connect Discord
              </button>
              <button
                onClick={() => openAddConnection("generic_webhook")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
              >
                <Webhook className="w-3.5 h-3.5" />
                Custom JSON Webhook
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className={`p-5 rounded-xl border transition shadow-sm bg-card flex flex-col justify-between ${
                  !conn.is_active
                    ? "opacity-60 border-border"
                    : conn.health_status === "revoked"
                    ? "border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {conn.provider_type === "discord_webhook" ? (
                        <div className="w-9 h-9 rounded-lg bg-[#5865F2]/10 dark:bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                      ) : conn.provider_type === "generic_webhook" ? (
                        <div className="w-9 h-9 rounded-lg bg-slate-500/10 dark:bg-slate-400/15 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                          <Webhook className="w-4 h-4" />
                        </div>
                      ) : conn.provider_type === "email_alert" ? (
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#4A154B]/10 dark:bg-[#4A154B]/20 text-[#4A154B] dark:text-[#E01E5A] flex items-center justify-center font-bold text-lg">
                          #
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {conn.name}
                        </h4>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>{getProviderBadgeLabel(conn)}</span>
                          {conn.has_secret_token && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                <KeyRound className="w-2.5 h-2.5" />
                                HMAC Signed
                              </span>
                            </>
                          )}
                          {conn.provider_metadata?.team_name && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">
                                {conn.provider_metadata.team_name}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    {renderHealthBadge(conn.health_status, conn.consecutive_failures)}
                  </div>

                  {/* Masked URL snippet */}
                  <div className="p-2 rounded-lg bg-muted/50 border border-border/60 text-xs font-mono text-muted-foreground truncate">
                    {conn.destination_url_masked}
                  </div>

                  {conn.health_status === "revoked" ? (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {conn.failure_reason || "Webhook destination revoked or deleted"}
                        </span>
                      </div>
                      {conn.provider_type === "slack_webhook" ? (
                        <button
                          onClick={handleConnectSlackOAuth}
                          disabled={isConnectingSlack}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition shrink-0 cursor-pointer"
                        >
                          Reconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => openEditConnection(conn)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition shrink-0 cursor-pointer"
                        >
                          Update URL
                        </button>
                      )}
                    </div>
                  ) : conn.failure_reason ? (
                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/60">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{conn.failure_reason}</span>
                    </div>
                  ) : null}

                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {conn.last_dispatched_at
                      ? `Last active ${new Date(
                          conn.last_dispatched_at
                        ).toLocaleString()}`
                      : "Never dispatched"}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendTestMessage(conn)}
                      disabled={testingConnectionId === conn.id || !conn.is_active}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition disabled:opacity-50"
                      title="Send verification test ping"
                    >
                      {testingConnectionId === conn.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Test Ping
                    </button>
                    <button
                      onClick={() => openDeliveryHistory(conn)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted text-foreground transition"
                      title="View execution attempt logs"
                    >
                      <History className="w-3.5 h-3.5" />
                      Logs
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleConnectionActive(conn)}
                      className="px-2 py-1.5 text-xs font-medium rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
                      title={conn.is_active ? "Pause delivery" : "Resume delivery"}
                    >
                      {conn.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => openEditConnection(conn)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition"
                      title="Edit connection"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: "connection",
                          id: conn.id,
                          name: conn.name,
                        })
                      }
                      className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition"
                      title="Delete connection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ALERT RULES */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-foreground">
              Feedback Alert Routing Rules
            </h3>
            <p className="text-xs text-muted-foreground">
              Define which customer ratings trigger outbound alerts and route
              specific forms to Slack, Discord, or custom webhook endpoints.
            </p>
          </div>
          <button
            onClick={openAddRule}
            disabled={connections.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>

        {alertRules.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-xl text-center bg-muted/10 space-y-2">
            <Filter className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No alert rules configured</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create an alert rule to automatically broadcast negative detractor feedback or all incoming customer submissions to your connected channels.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border shadow-sm">
            <table className="w-full text-left text-sm divide-y divide-border">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Form Scope</th>
                  <th className="px-4 py-3">Categories</th>
                  <th className="px-4 py-3">Destination Channel</th>
                  <th className="px-4 py-3">Privacy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {alertRules.map((rule) => {
                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-muted/40 transition ${
                        !rule.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {rule.name}
                      </td>
                      <td className="px-4 py-3.5">
                        {rule.trigger_type === "detractors_only" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            Detractors Only (≤ 3★)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            All Feedback (1-5★)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {!rule.form_ids || rule.form_ids.length === 0 ? (
                          <span className="font-medium text-foreground">
                            All Forms
                          </span>
                        ) : (
                          <span>{rule.form_ids.length} specific forms</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {!rule.category_ids || rule.category_ids.length === 0 ? (
                          <span className="font-medium text-foreground">
                            All Categories
                          </span>
                        ) : (
                          <span>{rule.category_ids.length} selected</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                        {(() => {
                          const targetConn = connections.find(
                            (c) => c.id === rule.connection_id
                          );
                          const label =
                            targetConn?.provider_type === "discord_webhook"
                              ? "Discord"
                              : targetConn?.provider_type === "generic_webhook"
                              ? "Webhook"
                              : targetConn?.provider_type === "email_alert"
                              ? "Email"
                              : "Slack";
                          return (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {label}
                              </span>
                              <span>{rule.connection_name || "Unknown"}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {rule.include_customer_email ? (
                          <span className="text-foreground">Email included</span>
                        ) : (
                          <span className="text-muted-foreground">Email redacted</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleRuleActive(rule)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                            rule.is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Paused"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => openEditRule(rule)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition"
                          title="Edit rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: "rule",
                              id: rule.id,
                              name: rule.name,
                            })
                          }
                          className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT OUTBOUND CONNECTION */}
      {isConnectionModalOpen && (() => {
        const activeProvider = editingConnection
          ? editingConnection.provider_type
          : connProvider;
        const providerMeta =
          PROVIDER_CONFIG[activeProvider] || PROVIDER_CONFIG.slack_webhook;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingConnection
                      ? `Edit ${providerMeta.label} Connection`
                      : `Connect ${providerMeta.shortLabel}`}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send real-time Voice of Customer alerts to your team channel or automation workflow.
                  </p>
                </div>
                <button
                  onClick={() => setIsConnectionModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!editingConnection && (
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
                  {(
                    [
                      "slack_webhook",
                      "discord_webhook",
                      "generic_webhook",
                      "email_alert",
                    ] as ProviderType[]
                  ).map((ptype) => {
                    const cfg = PROVIDER_CONFIG[ptype];
                    const isSelected = connProvider === ptype;
                    return (
                      <button
                        key={ptype}
                        type="button"
                        onClick={() => {
                          setConnProvider(ptype);
                          setConnSecret("");
                          if (ptype === "email_alert") {
                            if (!connName.trim()) {
                              setConnName("Owner Email Alerts");
                            }
                            setConnUrl(getDefaultOwnerEmail());
                            setAutoCreateStarterRule(true);
                          } else {
                            setConnUrl("");
                            setAutoCreateStarterRule(false);
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-background text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {ptype === "discord_webhook" ? (
                          <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
                        ) : ptype === "generic_webhook" ? (
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                        ) : ptype === "email_alert" ? (
                          <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="font-bold text-[#4A154B] dark:text-[#E01E5A]">
                            #
                          </span>
                        )}
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleSaveConnection} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Channel / Connection Name
                  </label>
                  <input
                    type="text"
                    placeholder={providerMeta.namePlaceholder}
                    value={connName}
                    onChange={(e) => setConnName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      {providerMeta.urlLabel}
                    </label>
                    {providerMeta.docsUrl && (
                      <a
                        href={providerMeta.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        {providerMeta.docsLabel} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {activeProvider === "email_alert" && members.length > 0 ? (
                    <select
                      aria-label="Workspace Member Recipient"
                      value={connUrl}
                      onChange={(e) => setConnUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required={!editingConnection}
                    >
                      {editingConnection && (
                        <option value="">
                          Keep existing recipient ({editingConnection.destination_url_masked})
                        </option>
                      )}
                      {members.map((m) => (
                        <option key={m.user_id} value={m.email}>
                          {m.full_name ? `${m.full_name} (${m.email})` : m.email} •{" "}
                          {m.role_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={activeProvider === "email_alert" ? "email" : "url"}
                      placeholder={
                        editingConnection
                          ? "Leave blank to keep existing destination"
                          : providerMeta.urlPlaceholder
                      }
                      value={connUrl}
                      onChange={(e) => setConnUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required={!editingConnection}
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {providerMeta.urlHint}
                  </p>
                </div>

                {!editingConnection && (
                  <div className="p-3 rounded-xl border border-border bg-muted/30">
                    <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateStarterRule}
                        onChange={(e) =>
                          setAutoCreateStarterRule(e.target.checked)
                        }
                        className="mt-0.5 rounded text-primary focus:ring-primary"
                      />
                      <span>
                        <strong className="font-semibold">
                          Automatically alert on negative feedback (≤ 3★)
                        </strong>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          Creates a starter alert rule across all forms and categories immediately so you don&apos;t miss unhappy customers.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {activeProvider === "generic_webhook" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                      Signing Secret (Optional HMAC-SHA256)
                    </label>
                    <input
                      type="password"
                      placeholder={
                        editingConnection?.has_secret_token
                          ? "Leave blank to keep existing signing secret"
                          : "e.g. whsec_... (sent in X-FeedbackFlow-Signature)"
                      }
                      value={connSecret}
                      onChange={(e) => setConnSecret(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      When provided, requests include an{" "}
                      <code className="font-mono">X-FeedbackFlow-Signature: sha256=...</code>{" "}
                      header so your server can verify authenticity.
                    </p>
                  </div>
                )}

                {connUrl.trim() && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleTestModalUrl}
                      disabled={isTestingUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition disabled:opacity-50"
                    >
                      {isTestingUrl ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {activeProvider === "email_alert"
                        ? "Send Test Email"
                        : "Test Webhook URL"}
                    </button>
                  </div>
                )}

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConnectionModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingConn}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingConn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingConnection ? "Save Changes" : "Connect Channel"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADD / EDIT ALERT RULE */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingRule ? "Edit Alert Rule" : "Create Alert Rule"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Route customer feedback automatically to Slack, Discord, or custom webhooks.
                </p>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Rule Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Critical Detractor Alerts"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Destination Channel / Webhook
                </label>
                <select
                  value={ruleConnId}
                  onChange={(e) => setRuleConnId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  {connections.map((c) => {
                    const tag =
                      c.provider_type === "discord_webhook"
                        ? "Discord"
                        : c.provider_type === "generic_webhook"
                        ? "Webhook"
                        : c.provider_type === "email_alert"
                        ? "Email"
                        : "Slack";
                    return (
                      <option key={c.id} value={c.id}>
                        [{tag}] {c.name}{" "}
                        {c.health_status === "revoked" ? "(Revoked)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Trigger Condition Matrix */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Trigger Condition
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRuleTrigger("detractors_only")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      ruleTrigger === "detractors_only"
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground">
                      Detractors Only (≤ 3★)
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Alerts team for unhappy customers, complaints, and churn risks.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuleTrigger("all_feedback")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      ruleTrigger === "all_feedback"
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground">
                      All Submissions
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Broadcasts every score from 1★ to 5★ in real time.
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Form Scope
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="formScope"
                      checked={ruleFormScope === "all"}
                      onChange={() => setRuleFormScope("all")}
                      className="text-primary focus:ring-primary"
                    />
                    <span>All workspace forms</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="formScope"
                      checked={ruleFormScope === "selected"}
                      onChange={() => setRuleFormScope("selected")}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Selected forms</span>
                  </label>
                </div>

                {ruleFormScope === "selected" && (
                  <div className="max-h-36 overflow-y-auto p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                    {forms.map((f) => (
                      <label
                        key={f.id}
                        className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={ruleSelectedForms.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRuleSelectedForms((prev) => [...prev, f.id]);
                            } else {
                              setRuleSelectedForms((prev) =>
                                prev.filter((id) => id !== f.id)
                              );
                            }
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="truncate">{f.title || f.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Filter Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Which Categories? (Category Filter)
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryScope"
                      checked={ruleCategoryScope === "all"}
                      onChange={() => setRuleCategoryScope("all")}
                      className="text-primary focus:ring-primary"
                    />
                    <span>All categories</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryScope"
                      checked={ruleCategoryScope === "selected"}
                      onChange={() => setRuleCategoryScope("selected")}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Selected categories</span>
                  </label>
                </div>

                {ruleCategoryScope === "selected" && (
                  <div className="max-h-36 overflow-y-auto p-2.5 rounded-lg border border-border bg-muted/20 space-y-1.5">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No categories found in this workspace.
                      </p>
                    ) : (
                      categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={ruleSelectedCategories.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRuleSelectedCategories((prev) => [
                                  ...prev,
                                  cat.id,
                                ]);
                              } else {
                                setRuleSelectedCategories((prev) =>
                                  prev.filter((id) => id !== cat.id)
                                );
                              }
                            }}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || "#64748b" }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Privacy Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleIncludeEmail}
                    onChange={(e) => setRuleIncludeEmail(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Include customer email in alert payload</span>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  {isSubmittingRule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingRule ? "Save Changes" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: DELIVERY AUDIT LOGS */}
      {historyConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Delivery History: #{historyConnection.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Recent outbound webhook execution attempts and HTTP status codes.
                </p>
              </div>
              <button
                onClick={() => setHistoryConnection(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading delivery attempts...
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No outbound notifications have been dispatched to this channel yet.
                </div>
              ) : (
                deliveries.map((d) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-lg border border-border bg-muted/30 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                            d.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : d.status === "failed"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {d.status}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {d.event_type}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>
                        Attempts: {d.attempt_count} / {d.max_attempts}
                      </span>
                      {d.delivered_at && (
                        <span>
                          Delivered: {new Date(d.delivered_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {d.attempts && d.attempts.length > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Execution Attempts:
                        </span>
                        {d.attempts.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between font-mono text-[11px] bg-background/50 p-1.5 rounded border border-border/40"
                          >
                            <span className="flex items-center gap-2">
                              <span>#{att.attempt_number}</span>
                              <span
                                className={
                                  att.status_code !== null &&
                                  att.status_code !== undefined &&
                                  att.status_code >= 200 &&
                                  att.status_code < 300
                                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                    : "text-rose-600 dark:text-rose-400 font-semibold"
                                }
                              >
                                HTTP {att.status_code || "ERR"}
                              </span>
                              {att.error_message && (
                                <span className="text-rose-500 truncate max-w-xs">
                                  {att.error_message}
                                </span>
                              )}
                            </span>
                            <span>{att.duration_ms}ms</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Delete {deleteTarget.type === "connection" ? "Integration Connection" : "Alert Rule"}?
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteTarget.name}</strong>?
              {deleteTarget.type === "connection" &&
                " Any alert rules routing to this channel will be deactivated."}
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

