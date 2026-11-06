"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Filter,
  History,
  Layers,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { feedbackRepository } from "@/repositories/feedback.repository";
import { notificationsRepository } from "@/repositories/notifications.repository";
import type { FeedbackForm } from "@/types/feedback";
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
} from "@/types/notifications";

interface WorkspaceIntegrationsTabProps {
  workspaceId: string;
  isOwner?: boolean;
}

export function WorkspaceIntegrationsTab({
  workspaceId,
  isOwner = false,
}: WorkspaceIntegrationsTabProps) {
  const [connections, setConnections] = useState<NotificationConnection[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Connection Modals
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<NotificationConnection | null>(null);
  const [connName, setConnName] = useState("");
  const [connUrl, setConnUrl] = useState("");
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
    loadData();
  }, [workspaceId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [fetchedConnections, fetchedRules, fetchedForms] =
        await Promise.all([
          notificationsRepository.listConnections(workspaceId),
          notificationsRepository.listAlertRules(workspaceId),
          feedbackRepository.listForms(workspaceId),
        ]);
      setConnections(fetchedConnections);
      setAlertRules(fetchedRules);
      setForms(fetchedForms);
    } catch {
      toast.error("Failed to load integrations and alert rules");
    } finally {
      setIsLoading(false);
    }
  }

  // Connection Handlers
  async function handleConnectSlackOAuth() {
    setIsConnectingSlack(true);
    try {
      const res = await notificationsRepository.getSlackAuthorizeUrl(workspaceId);
      window.location.href = res.authorize_url;
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to initiate Slack authorization"
      );
      setIsConnectingSlack(false);
    }
  }

  function openAddConnection() {
    setEditingConnection(null);
    setConnName("");
    setConnUrl("");
    setIsConnectionModalOpen(true);
  }

  function openEditConnection(conn: NotificationConnection) {
    setEditingConnection(conn);
    setConnName(conn.name);
    setConnUrl(""); // Don't prefill masked URL, operator can leave blank to keep unchanged
    setIsConnectionModalOpen(true);
  }

  async function handleSaveConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!connName.trim()) {
      toast.error("Please enter a connection name");
      return;
    }
    if (!editingConnection && !connUrl.trim()) {
      toast.error("Please enter a valid Slack incoming webhook URL");
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
        const updated = await notificationsRepository.updateConnection(
          workspaceId,
          editingConnection.id,
          payload
        );
        setConnections((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        toast.success("Slack connection updated");
      } else {
        const payload: NotificationConnectionCreate = {
          name: connName.trim(),
          provider_type: "slack_webhook",
          destination_url: connUrl.trim(),
        };
        const created = await notificationsRepository.createConnection(
          workspaceId,
          payload
        );
        setConnections((prev) => [created, ...prev]);
        toast.success("Slack incoming webhook connected!");
      }
      setIsConnectionModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || err.message || "Failed to save Slack connection");
    } finally {
      setIsSubmittingConn(false);
    }
  }

  async function handleTestModalUrl() {
    if (!connUrl.trim()) {
      toast.error("Enter a webhook URL to test");
      return;
    }
    setIsTestingUrl(true);
    try {
      const res = await notificationsRepository.testRawDestination(
        workspaceId,
        connUrl.trim()
      );
      if (res.success) {
        toast.success("Test notification received by Slack! ✅");
      } else {
        toast.error(`Slack returned error: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err.message || "Webhook test failed");
    } finally {
      setIsTestingUrl(false);
    }
  }

  async function handleSendTestMessage(conn: NotificationConnection) {
    setTestingConnectionId(conn.id);
    try {
      const res = await notificationsRepository.testConnection(
        workspaceId,
        conn.id
      );
      if (res.success) {
        toast.success(`Test card sent to ${conn.name}! Check your Slack channel.`);
        // Refresh connection health
        const updated = await notificationsRepository.getConnection(
          workspaceId,
          conn.id
        );
        setConnections((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        toast.error(`Slack delivery failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err.message || "Failed to send test message");
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
      toast.error("Connect a Slack channel first before adding alert rules");
      return;
    }
    setEditingRule(null);
    setRuleName("Detractor Alerts (≤ 3★)");
    setRuleConnId(connections[0].id);
    setRuleTrigger("detractors_only");
    setRuleFormScope("all");
    setRuleSelectedForms([]);
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
      toast.error("Please select a destination Slack channel");
      return;
    }
    if (ruleFormScope === "selected" && ruleSelectedForms.length === 0) {
      toast.error("Please select at least one form or choose 'All Forms'");
      return;
    }

    setIsSubmittingRule(true);
    try {
      const targetFormIds =
        ruleFormScope === "all" ? null : ruleSelectedForms;

      if (editingRule) {
        const payload: AlertRuleUpdate = {
          name: ruleName.trim(),
          connection_id: ruleConnId,
          trigger_type: ruleTrigger,
          form_ids: targetFormIds,
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
          include_customer_email: ruleIncludeEmail,
        };
        const created = await notificationsRepository.createAlertRule(
          workspaceId,
          payload
        );
        setAlertRules((prev) => [created, ...prev]);
        toast.success("Alert rule created!");
      }
      setIsRuleModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || err.message || "Failed to save alert rule");
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
        toast.success("Slack connection deleted");
      } else {
        await notificationsRepository.deleteAlertRule(
          workspaceId,
          deleteTarget.id
        );
        setAlertRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        toast.success("Alert rule deleted");
      }
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
            Broadcast real-time customer feedback into Slack. Configure
            instant detractor alerts and selective form routing.
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
            onClick={openAddConnection}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
            title="Connect via manual webhook URL"
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
                <p className="font-semibold text-sm">Action Required: Slack Connection Revoked</p>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  One or more channels were uninstalled or removed in Slack. Reconnect to restore instant feedback notifications.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectSlackOAuth}
              disabled={isConnectingSlack}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer"
            >
              Reconnect Channel
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-foreground">
              Connected Channels & Webhooks
            </h3>
            <p className="text-xs text-muted-foreground">
              Incoming webhooks securely authenticated with Slack. URLs are masked to protect channel credentials.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {connections.length} {connections.length === 1 ? "channel" : "channels"} configured
          </span>
        </div>

        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 border border-dashed border-border rounded-xl bg-muted/20 text-center space-y-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">No Slack channels connected</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                Connect an incoming webhook from your Slack workspace to receive real-time VoC cards when customers submit feedback.
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
                onClick={openAddConnection}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Manual Webhook
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
                      <div className="w-9 h-9 rounded-lg bg-[#4A154B]/10 dark:bg-[#4A154B]/20 text-[#4A154B] dark:text-[#E01E5A] flex items-center justify-center font-bold text-lg">
                        #
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">
                          {conn.name}
                        </h4>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>
                            {conn.connection_method === "oauth"
                              ? "OAuth ⚡"
                              : "Manual Webhook"}
                          </span>
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
                          {conn.failure_reason || "Webhook revoked in Slack"}
                        </span>
                      </div>
                      <button
                        onClick={handleConnectSlackOAuth}
                        disabled={isConnectingSlack}
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition shrink-0 cursor-pointer"
                      >
                        Reconnect
                      </button>
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
                      title="Send verification card to Slack"
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
              Define which customer ratings trigger outbound cards and route specific forms to dedicated Slack channels.
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
              Create an alert rule to automatically broadcast negative detractor feedback or all incoming customer submissions into Slack.
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
                      <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                        #{rule.connection_name || "Unknown"}
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

      {/* MODAL: ADD / EDIT SLACK CONNECTION */}
      {isConnectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingConnection ? "Edit Slack Connection" : "Connect Slack Webhook"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send real-time Voice of Customer cards to a dedicated channel.
                </p>
              </div>
              <button
                onClick={() => setIsConnectionModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Channel / Connection Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. #customer-feedback or #churn-alerts"
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Slack Incoming Webhook URL
                  </label>
                  <a
                    href="https://api.slack.com/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    Get webhook URL <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  placeholder={
                    editingConnection
                      ? "Leave blank to keep existing webhook URL"
                      : "https://hooks.slack.com/services/T.../B.../..."
                  }
                  value={connUrl}
                  onChange={(e) => setConnUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required={!editingConnection}
                />
                <p className="text-[11px] text-muted-foreground">
                  Must start with <code className="font-mono">https://hooks.slack.com/services/</code>.
                </p>
              </div>

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
                    Test Webhook URL
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
      )}

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
                  Route customer feedback automatically to Slack.
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
                  Destination Slack Channel
                </label>
                <select
                  value={ruleConnId}
                  onChange={(e) => setRuleConnId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name} {c.health_status === "revoked" ? "(Revoked)" : ""}
                    </option>
                  ))}
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

              {/* Privacy Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleIncludeEmail}
                    onChange={(e) => setRuleIncludeEmail(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Include customer email in Slack alert card</span>
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
                                  att.status_code === 200
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
                Delete {deleteTarget.type === "connection" ? "Slack Channel" : "Alert Rule"}?
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

