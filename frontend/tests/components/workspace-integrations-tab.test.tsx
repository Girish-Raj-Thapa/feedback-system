import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceIntegrationsTab } from "@/components/workspace/workspace-integrations-tab";
import { authRepository } from "@/repositories/auth.repository";
import { feedbackRepository } from "@/repositories/feedback.repository";
import { notificationsRepository } from "@/repositories/notifications.repository";
import type { FeedbackCategory, FeedbackForm } from "@/types/feedback";
import type {
  AlertRule,
  NotificationConnection,
} from "@/types/notifications";

vi.mock("@/repositories/auth.repository", () => ({
  authRepository: {
    listWorkspaceMembers: vi.fn(),
  },
}));

vi.mock("@/repositories/feedback.repository", () => ({
  feedbackRepository: {
    listForms: vi.fn(),
    listCategories: vi.fn(),
  },
}));

vi.mock("@/repositories/notifications.repository", () => ({
  notificationsRepository: {
    getQuota: vi.fn(),
    listConnections: vi.fn(),
    getConnection: vi.fn(),
    getSlackAuthorizeUrl: vi.fn(),
    completeSlackOAuth: vi.fn(),
    createConnection: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
    testConnection: vi.fn(),
    testRawDestination: vi.fn(),
    listConnectionDeliveries: vi.fn(),
    listAlertRules: vi.fn(),
    createAlertRule: vi.fn(),
    updateAlertRule: vi.fn(),
    deleteAlertRule: vi.fn(),
  },
}));

describe("WorkspaceIntegrationsTab", () => {
  const workspaceId = "ws-123";

  const mockConnections: NotificationConnection[] = [
    {
      id: "conn-1",
      workspace_id: workspaceId,
      name: "churn-alerts",
      provider_type: "slack_webhook",
      connection_method: "manual",
      destination_url_masked:
        "https://hooks.slack.com/services/T111/B222/****3333",
      is_active: true,
      health_status: "healthy",
      failure_reason: null,
      consecutive_failures: 0,
      provider_metadata: null,
      last_dispatched_at: "2026-11-06T10:00:00Z",
      created_at: "2026-11-06T09:00:00Z",
      updated_at: "2026-11-06T09:00:00Z",
    },
  ];

  const mockAlertRules: AlertRule[] = [
    {
      id: "rule-1",
      workspace_id: workspaceId,
      connection_id: "conn-1",
      name: "Detractor Alerts",
      trigger_type: "detractors_only",
      form_ids: null,
      include_customer_email: true,
      is_active: true,
      connection_name: "churn-alerts",
      connection_health: "healthy",
      created_at: "2026-11-06T09:30:00Z",
      updated_at: "2026-11-06T09:30:00Z",
    },
  ];

  const mockForms: FeedbackForm[] = [
    {
      id: "form-1",
      workspace_id: workspaceId,
      name: "Exit Survey",
      slug: "exit-survey",
      title: "Exit Survey Form",
      subtitle: null,
      template_type: "saas",
      is_active: true,
      rating_scale_type: "5_star",
      rating_required: true,
      category_pills: [],
      custom_questions: [],
      open_feedback_prompt: "Tell us more",
      open_feedback_placeholder: null,
      contact_field_mode: "optional",
      theme_config: {
        primary_color: "#000",
        border_radius: 8,
        color_scheme: "system",
      },
      outcome_screen: {},
      widget_settings: {
        position: "bottom_right",
        button_text: "Feedback",
        delay_seconds: 0,
      },
      allowed_domains: [],
      created_at: "2026-11-06T08:00:00Z",
      updated_at: "2026-11-06T08:00:00Z",
    },
  ];

  const mockCategories: FeedbackCategory[] = [
    {
      id: "cat-bugs",
      workspace_id: workspaceId,
      name: "Bugs & Quality",
      slug: "bugs-quality",
      description: "Product bugs",
      color: "#ef4444",
      icon: "bug",
      keywords: ["bug", "crash"],
      display_order: 1,
      is_active: true,
      is_uncategorized: false,
      created_at: "2026-11-06T08:00:00Z",
      updated_at: "2026-11-06T08:00:00Z",
    },
    {
      id: "cat-pricing",
      workspace_id: workspaceId,
      name: "Pricing & Billing",
      slug: "pricing-billing",
      description: "Billing questions",
      color: "#f59e0b",
      icon: "dollar",
      keywords: ["price", "invoice"],
      display_order: 2,
      is_active: true,
      is_uncategorized: false,
      created_at: "2026-11-06T08:00:00Z",
      updated_at: "2026-11-06T08:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsRepository.listConnections).mockResolvedValue(
      mockConnections
    );
    vi.mocked(notificationsRepository.listAlertRules).mockResolvedValue(
      mockAlertRules
    );
    vi.mocked(feedbackRepository.listForms).mockResolvedValue(mockForms);
    vi.mocked(feedbackRepository.listCategories).mockResolvedValue(
      mockCategories
    );
    vi.mocked(authRepository.listWorkspaceMembers).mockResolvedValue([
      {
        id: "mem-1",
        workspace_id: workspaceId,
        user_id: "usr-1",
        email: "owner@acme.com",
        full_name: "Alex Founder",
        role_id: "role-1",
        role_name: "Owner",
        role_slug: "owner",
        overrides: {},
        effective_permissions: ["webhooks:manage"],
        created_at: "2026-11-06T08:00:00Z",
      },
    ]);
    vi.mocked(notificationsRepository.getQuota).mockResolvedValue({
      plan_tier: "free",
      max_connections: 2,
      connections_used: 1,
      max_alert_rules: 2,
      alert_rules_used: 1,
      monthly_email_limit: 25,
      monthly_email_used: 4,
      monthly_webhook_limit: 100,
      monthly_webhook_used: 18,
      hourly_email_burst_limit: 10,
      hourly_email_used: 0,
      hourly_webhook_burst_limit: 30,
      hourly_webhook_used: 0,
      cycle_starts_at: "2026-11-01T00:00:00Z",
    });
  });

  it("renders connections and alert rules correctly", async () => {
    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "churn-alerts" })
      ).toBeInTheDocument();
      expect(screen.getByText("Detractor Alerts")).toBeInTheDocument();
      expect(screen.getByText("Healthy")).toBeInTheDocument();
      expect(
        screen.getByText("https://hooks.slack.com/services/T111/B222/****3333")
      ).toBeInTheDocument();
    });
  });

  it("triggers test notification ping when Test Ping button is clicked", async () => {
    vi.mocked(notificationsRepository.testConnection).mockResolvedValue({
      success: true,
      status_code: 200,
      message: "ok",
    });
    vi.mocked(notificationsRepository.getConnection).mockResolvedValue(
      mockConnections[0]
    );

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText("Test Ping")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Test Ping"));

    await waitFor(() => {
      expect(notificationsRepository.testConnection).toHaveBeenCalledWith(
        workspaceId,
        "conn-1"
      );
    });
  });

  it("opens modal and connects a new Slack channel via manual webhook", async () => {
    const newConn: NotificationConnection = {
      id: "conn-2",
      workspace_id: workspaceId,
      name: "general-feedback",
      provider_type: "slack_webhook",
      connection_method: "manual",
      destination_url_masked:
        "https://hooks.slack.com/services/T111/B222/****9999",
      is_active: true,
      health_status: "healthy",
      failure_reason: null,
      consecutive_failures: 0,
      provider_metadata: null,
      last_dispatched_at: null,
      created_at: "2026-11-06T11:00:00Z",
      updated_at: "2026-11-06T11:00:00Z",
    };
    vi.mocked(notificationsRepository.createConnection).mockResolvedValue(newConn);

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Manual Webhook/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Manual Webhook/i }));

    const nameInput = screen.getByPlaceholderText(
      "e.g. #customer-feedback or #churn-alerts"
    );
    const urlInput = screen.getByPlaceholderText(
      "https://hooks.slack.com/services/T.../B.../..."
    );

    fireEvent.change(nameInput, { target: { value: "general-feedback" } });
    fireEvent.change(urlInput, {
      target: {
        value: "https://hooks.slack.com/services/T111/B222/token9999",
      },
    });

    fireEvent.click(screen.getByText("Connect Channel"));

    await waitFor(() => {
      expect(notificationsRepository.createConnection).toHaveBeenCalledWith(
        workspaceId,
        {
          name: "general-feedback",
          provider_type: "slack_webhook",
          destination_url:
            "https://hooks.slack.com/services/T111/B222/token9999",
        }
      );
    });
  });

  it("initiates Slack OAuth flow when Add to Slack button is clicked", async () => {
    vi.mocked(notificationsRepository.getSlackAuthorizeUrl).mockResolvedValue({
      authorize_url: "https://slack.com/oauth/v2/authorize?client_id=123&state=abc",
    });

    // Mock window.location.href assignment
    const originalLocation = window.location;
    // @ts-expect-error mock window.location
    delete window.location;
    window.location = { ...originalLocation, href: "" } as any;

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText("Add to Slack")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add to Slack"));

    await waitFor(() => {
      expect(notificationsRepository.getSlackAuthorizeUrl).toHaveBeenCalledWith(
        workspaceId
      );
      expect(window.location.href).toBe(
        "https://slack.com/oauth/v2/authorize?client_id=123&state=abc"
      );
    });

    // @ts-expect-error restore location
    window.location = originalLocation;
  });

  it("displays reconnect banner when a connection is revoked", async () => {
    const revokedConn: NotificationConnection = {
      ...mockConnections[0],
      health_status: "revoked",
      failure_reason: "HTTP 404/410 channel archived or webhook uninstalled",
      is_active: false,
    };
    vi.mocked(notificationsRepository.listConnections).mockResolvedValue([
      revokedConn,
    ]);

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Action Required: Integration Connection Revoked/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Reconnect Channel")).toBeInTheDocument();
    });
  });

  it("opens modal and connects a Discord webhook", async () => {
    const discordConn: NotificationConnection = {
      id: "conn-discord",
      workspace_id: workspaceId,
      name: "discord-bugs",
      provider_type: "discord_webhook",
      connection_method: "manual",
      destination_url_masked:
        "https://discord.com/api/webhooks/123456789/****abcd",
      is_active: true,
      health_status: "healthy",
      failure_reason: null,
      consecutive_failures: 0,
      provider_metadata: null,
      last_dispatched_at: null,
      created_at: "2026-11-15T10:00:00Z",
      updated_at: "2026-11-15T10:00:00Z",
    };
    vi.mocked(notificationsRepository.createConnection).mockResolvedValue(
      discordConn
    );

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Manual Webhook/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Manual Webhook/i }));
    fireEvent.click(screen.getByRole("button", { name: "Discord" }));

    const nameInput = screen.getByPlaceholderText(
      "e.g. #product-feedback or #bug-reports"
    );
    const urlInput = screen.getByPlaceholderText(
      "https://discord.com/api/webhooks/123456789/..."
    );

    fireEvent.change(nameInput, { target: { value: "discord-bugs" } });
    fireEvent.change(urlInput, {
      target: {
        value: "https://discord.com/api/webhooks/123456789/token_abcd",
      },
    });

    fireEvent.click(screen.getByText("Connect Channel"));

    await waitFor(() => {
      expect(notificationsRepository.createConnection).toHaveBeenCalledWith(
        workspaceId,
        {
          name: "discord-bugs",
          provider_type: "discord_webhook",
          destination_url:
            "https://discord.com/api/webhooks/123456789/token_abcd",
        }
      );
    });
  });

  it("opens modal and connects a Generic JSON webhook with HMAC secret", async () => {
    const genericConn: NotificationConnection = {
      id: "conn-generic",
      workspace_id: workspaceId,
      name: "Zapier Alerts",
      provider_type: "generic_webhook",
      connection_method: "manual",
      destination_url_masked: "https://hooks...****...abcd",
      has_secret_token: true,
      is_active: true,
      health_status: "healthy",
      failure_reason: null,
      consecutive_failures: 0,
      provider_metadata: null,
      last_dispatched_at: null,
      created_at: "2026-11-15T10:00:00Z",
      updated_at: "2026-11-15T10:00:00Z",
    };
    vi.mocked(notificationsRepository.createConnection).mockResolvedValue(
      genericConn
    );

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Manual Webhook/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Manual Webhook/i }));
    fireEvent.click(screen.getByRole("button", { name: "Custom JSON" }));

    const nameInput = screen.getByPlaceholderText(
      "e.g. Zapier Lead Alerts or Linear Triage"
    );
    const urlInput = screen.getByPlaceholderText(
      "https://api.example.com/webhooks/feedback"
    );
    const secretInput = screen.getByPlaceholderText(
      "e.g. whsec_... (sent in X-FeedbackFlow-Signature)"
    );

    fireEvent.change(nameInput, { target: { value: "Custom JSON Alerts" } });
    fireEvent.change(urlInput, {
      target: { value: "https://webhooks.example.com/feedback" },
    });
    fireEvent.change(secretInput, { target: { value: "whsec_test_123" } });

    fireEvent.click(screen.getByText("Connect Channel"));

    await waitFor(() => {
      expect(notificationsRepository.createConnection).toHaveBeenCalledWith(
        workspaceId,
        {
          name: "Custom JSON Alerts",
          provider_type: "generic_webhook",
          destination_url: "https://webhooks.example.com/feedback",
          secret_token: "whsec_test_123",
        }
      );
      expect(screen.getByText("HMAC Signed")).toBeInTheDocument();
    });
  });

  it("creates an Email Alerts connection defaulting to Workspace Owner and auto-creates a starter rule", async () => {
    const emailConn: NotificationConnection = {
      id: "conn-email",
      workspace_id: workspaceId,
      name: "Owner Email Alerts",
      provider_type: "email_alert",
      connection_method: "manual",
      destination_url_masked: "ow***@acme.com",
      has_secret_token: false,
      is_active: true,
      health_status: "healthy",
      failure_reason: null,
      consecutive_failures: 0,
      provider_metadata: null,
      last_dispatched_at: null,
      created_at: "2026-11-16T10:00:00Z",
      updated_at: "2026-11-16T10:00:00Z",
    };
    const starterRule: AlertRule = {
      id: "rule-email",
      workspace_id: workspaceId,
      connection_id: "conn-email",
      name: "Owner Email Alerts (Low Ratings ≤ 3★)",
      trigger_type: "detractors_only",
      form_ids: null,
      category_ids: null,
      include_customer_email: true,
      is_active: true,
      connection_name: "Owner Email Alerts",
      connection_health: "healthy",
      created_at: "2026-11-16T10:00:00Z",
      updated_at: "2026-11-16T10:00:00Z",
    };
    vi.mocked(notificationsRepository.createConnection).mockResolvedValue(
      emailConn
    );
    vi.mocked(notificationsRepository.createAlertRule).mockResolvedValue(
      starterRule
    );

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText("Free Plan")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Email Alerts$/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Email Alerts$/i }));

    // Recipient select is pre-populated with Workspace Owner email and starter rule checkbox is checked
    const recipientSelect = screen.getByLabelText("Workspace Member Recipient");
    expect(recipientSelect).toHaveValue("owner@acme.com");
    expect(
      screen.getByRole("button", { name: /Send Test Email/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Connect Channel"));

    await waitFor(() => {
      expect(notificationsRepository.createConnection).toHaveBeenCalledWith(
        workspaceId,
        {
          name: "Owner Email Alerts",
          provider_type: "email_alert",
          destination_url: "owner@acme.com",
        }
      );
      expect(notificationsRepository.createAlertRule).toHaveBeenCalledWith(
        workspaceId,
        {
          name: "Owner Email Alerts (Low Ratings ≤ 3★)",
          connection_id: "conn-email",
          trigger_type: "detractors_only",
          form_ids: null,
          category_ids: null,
          include_customer_email: true,
        }
      );
      expect(screen.getByText("Email Alert")).toBeInTheDocument();
      // Initial mount + refresh after connection creation
      expect(notificationsRepository.getQuota).toHaveBeenCalledTimes(2);
    });
  });

  it("creates an alert rule filtered by selected categories", async () => {
    const newRule: AlertRule = {
      id: "rule-cat",
      workspace_id: workspaceId,
      connection_id: "conn-1",
      name: "Bugs Only Alert",
      trigger_type: "detractors_only",
      form_ids: null,
      category_ids: ["cat-bugs"],
      include_customer_email: true,
      is_active: true,
      connection_name: "churn-alerts",
      connection_health: "healthy",
      created_at: "2026-11-16T10:05:00Z",
      updated_at: "2026-11-16T10:05:00Z",
    };
    vi.mocked(notificationsRepository.createAlertRule).mockResolvedValue(
      newRule
    );

    render(<WorkspaceIntegrationsTab workspaceId={workspaceId} isOwner={true} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /New Alert Rule/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /New Alert Rule/i }));

    const ruleNameInput = screen.getByPlaceholderText(
      "e.g. Critical Detractor Alerts"
    );
    fireEvent.change(ruleNameInput, { target: { value: "Bugs Only Alert" } });

    // Switch Category Filter to "Selected categories" and check "Bugs & Quality"
    fireEvent.click(screen.getByLabelText("Selected categories"));
    fireEvent.click(screen.getByLabelText("Bugs & Quality"));

    fireEvent.click(screen.getByRole("button", { name: "Create Rule" }));

    await waitFor(() => {
      expect(notificationsRepository.createAlertRule).toHaveBeenCalledWith(
        workspaceId,
        {
          name: "Bugs Only Alert",
          connection_id: "conn-1",
          trigger_type: "detractors_only",
          form_ids: null,
          category_ids: ["cat-bugs"],
          include_customer_email: true,
        }
      );
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });
  });
});

