# Graph Report - feedback-system  (2026-11-16)

## Corpus Check
- 312 files · ~192,368 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 7, .woff2 3, .example 1)

## Summary
- 3006 nodes · 7887 edges · 101 communities (83 shown, 18 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 1020 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4b9c8ed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- weekly_digest.py
- Component Composition
- auth/services.py
- DecisionLogService
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- services/forms.py
- ProviderResult
- Backend Architecture
- test_slack_provider.py
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- main.py
- httpx
- collections_abc
- encryption.py
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- NotificationDeliveryService
- auth.repository.ts
- routers/submissions.py
- payments/services.py
- feedback.ts
- Add an Endpoint
- notifications/dependencies.py
- Voice of Customer (VoC) Feedback & Decision Platform
- SubmissionService
- routers/connections.py
- NotificationConnectionService
- test_payments.py
- react
- test_submissions.py
- components.json
- FormRepository
- test_discord_provider.py
- Agent Docs Index
- Workspace
- Web Interface Guidelines
- next
- User
- NotificationConnection
- ValidationError
- workspace-billing-tab.tsx
- scripts
- dependencies
- frontend/AGENTS.md
- frontend/README.md
- AuthRepository
- test_email_connection_member_verification_and_quota_in_db
- AuthService
- feedback-backend
- presets.py
- pytest
- workspace-integrations-tab.tsx
- schemas/__init__.py
- Frontend Design System & UI Specification
- test_email_provider.py
- test_forms.py
- create_alert_rule
- auth/dependencies.py
- health.py
- Frontend Workflow
- FeedbackSubmission
- NotificationQuotaRepository
- test_categories.py
- Critical Rules
- FeedbackWidget
- forms/page.tsx
- connection_service.py
- test_impact_metrics_before_vs_after_math
- is_domain_allowed
- Button
- Frontend Architecture
- WorkspaceIntegrationsTab
- public_forms.py
- shadcn/SKILL.md
- frontend/postcss.config.mjs
- FeedbackCategoryRepository
- invite/page.tsx
- .submit_feedback
- Frontend Conventions
- feedback/tasks.py
- get_form_template
- mask_webhook_url
- run_async_migrations
- workspace-onboarding-checklist.tsx
- get_preset_categories
- run_migrations_offline
- Form

## God Nodes (most connected - your core abstractions)
1. `Workspace` - 120 edges
2. `AuthService` - 93 edges
3. `FeedbackSubmission` - 83 edges
4. `ValidationError` - 64 edges
5. `AlertRule` - 64 edges
6. `NotificationConnection` - 63 edges
7. `AuthRepository` - 58 edges
8. `next` - 58 edges
9. `User` - 57 edges
10. `SubmissionService` - 49 edges

## Surprising Connections (you probably didn't know these)
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `No sizing classes on icons inside components` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/icons.md → frontend/src/components/ui/button.tsx
- `Icons → [icons.md](./rules/icons.md)` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → frontend/src/components/ui/button.tsx
- `Card structure` --references--> `CardContent()`  [INFERRED]
  .agents/skills/shadcn/rules/composition.md → frontend/src/components/ui/card.tsx
- `Tooling & Standards` --references--> `cn()`  [INFERRED]
  .agents/frontend/conventions.md → frontend/src/utils/cn.ts

## Import Cycles
- None detected.

## Communities (101 total, 18 thin omitted)

### Community 0 - "weekly_digest.py"
Cohesion: 0.06
Nodes (25): CategoryInsightItem, FeedbackInsightsResponse, InsightSegments, InsightSummary, ScoreDriverItem, SentimentBreakdown, _normalize_rating(), _compute_avg_rating() (+17 more)

### Community 1 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 2 - "auth/services.py"
Cohesion: 0.06
Nodes (61): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+53 more)

### Community 3 - "DecisionLogService"
Cohesion: 0.07
Nodes (13): create_decision_log(), delete_decision_log(), get_decision_log(), list_decision_logs(), update_decision_log(), DecisionImpactMetrics, DecisionLogCreate, DecisionLogRead (+5 more)

### Community 4 - "Group B: Dynamic RBAC, Invites & Audit Logging"
Cohesion: 0.06
Nodes (33): 10. `audit_logs`, 11. `workspace_customers`, 12. `forms`, 13. `submissions`, 14. `theme_buckets`, 15. `bucket_topic_suggestions`, 16. `decision_logs`, 17. `workspace_daily_stats` (+25 more)

### Community 5 - "Feedback System: Frontend Design System"
Cohesion: 0.07
Nodes (28): 1. How to use this document, 2. Design principles, 3. Surfaces and density, 4.1 What users can change, 4.2 Three token layers, 4.3 Generating a brand scale from one color, 4.4 Contrast guarantees, 4.5 Presets (+20 more)

### Community 6 - "Product Specification: Customer Feedback & Decision Insights SaaS (V1)"
Cohesion: 0.09
Nodes (21): 1.1 What We Are Building, 1.2 Target Customers, 1.3 Core Value Proposition, 1. Product Overview & Positioning, 2.1 The "Core Signal Trio" (How Custom Forms Produce Clean Analytics), 2.2 Locked-Bucket Taxonomy (No Free-Form Tag Invention), 2. Core System Principles, 3. Core Feature Modules (V1 Scope) (+13 more)

### Community 7 - "cn"
Cohesion: 0.27
Nodes (11): Component Structure → [composition.md](./rules/composition.md), Card(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), Label() (+3 more)

### Community 8 - "package.json"
Cohesion: 0.07
Nodes (25): eslintConfig, name, private, version, DashboardWorkspacesRedirectPage(), cn, eslint, eslint-config-next (+17 more)

### Community 9 - "services/forms.py"
Cohesion: 0.13
Nodes (13): create_form(), delete_form(), duplicate_form(), get_form(), list_forms(), update_form(), CategoryPillSchema, CustomQuestionSchema (+5 more)

### Community 10 - "ProviderResult"
Cohesion: 0.08
Nodes (7): Notifications & Provider Extensibility, BaseNotificationProvider, ProviderResult, DiscordWebhookProvider, EmailAlertProvider, ProviderRegistry, SlackWebhookProvider

### Community 11 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 12 - "test_slack_provider.py"
Cohesion: 0.08
Nodes (9): test_build_test_payload(), test_dispatch_channel_not_found_404_permanent(), test_dispatch_rate_limit_429_with_retry_after(), test_dispatch_server_error_503_transient(), test_dispatch_success_200_ok(), test_dispatch_timeout_transient(), test_provider_registry_registration(), test_slack_webhook_ssrf_and_url_validation_rejections() (+1 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)"
Cohesion: 0.11
Nodes (17): 1.1 What This System Is, 1.2 What This System Is NOT (Category Boundaries), 1. Executive Summary & Category Definition, 2. Core Architectural Pillars, 3. V1 Feature Specification (The 5 Core Modules), 4. End-to-End System Workflows, 5. V1 Scope Guardrails (What Not to Build Yet), 6. Recommended Tech Stack & Module Mapping (+9 more)

### Community 15 - "Rules"
Cohesion: 0.10
Nodes (20): Accessibility, Animation, Anti-patterns (flag these), Content & Copy, Content Handling, Dark Mode & Theming, Focus States, Forms (+12 more)

### Community 16 - "main.py"
Cohesion: 0.07
Nodes (15): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), register_error_handlers(), PublicCORSMiddleware, RequestContextMiddleware, send_wrapper() (+7 more)

### Community 17 - "httpx"
Cohesion: 0.07
Nodes (11): GenericWebhookProvider, _is_forbidden_ip(), test_generic_build_test_payload(), test_generic_dispatch_error_classification(), test_generic_dispatch_with_hmac_signature(), test_generic_dispatch_without_secret_omits_signature(), test_generic_provider_registry_registration(), test_generic_webhook_ssrf_dns_resolution_blocks_private_ip() (+3 more)

### Community 18 - "collections_abc"
Cohesion: 0.05
Nodes (21): upgrade(), downgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade() (+13 more)

### Community 19 - "encryption.py"
Cohesion: 0.06
Nodes (20): decrypt_secret(), derive_hkdf_key(), derive_legacy_sha256_key(), encrypt_secret(), EncryptedString, get_current_tenant_id(), get_encryption_key(), get_tenant_cipher() (+12 more)

### Community 21 - "theme.ts"
Cohesion: 0.32
Nodes (7): ColorPreset, DEFAULT_THEME_PRESET, generateBrandScale(), hexToOklch(), OKLCH, sRgbToLinear(), THEME_PRESETS

### Community 22 - "Backend Workflow"
Cohesion: 0.14
Nodes (13): Ask the human first, Backend Workflow, Boundaries, Check (run in this order), Definition of done, Migrations, Never do in code, Never run (+5 more)

### Community 23 - "Styling & Customization"
Cohesion: 0.15
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 24 - "shadcn/ui"
Cohesion: 0.18
Nodes (11): Component Docs, Examples, and Usage, Current Project Context, Design Systems from DESIGN.md, Detailed References, Key Fields, Key Patterns, Principles, Quick Reference (+3 more)

### Community 25 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, eslint-config-next, jsdom, tailwindcss, @tailwindcss/postcss, @tailwindcss/turbopack, @testing-library/dom (+11 more)

### Community 26 - "Backend Conventions"
Cohesion: 0.07
Nodes (15): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+7 more)

### Community 27 - "NotificationDeliveryService"
Cohesion: 0.05
Nodes (15): OutboundDeliveryRepository, NotificationDeliveryService, test_calculate_backoff_delay_cap_at_300(), test_calculate_backoff_delay_exponential_growth(), test_calculate_backoff_delay_respects_retry_after(), test_create_delivery_in_tx_idempotent(), test_process_delivery_already_claimed_returns_false(), test_process_delivery_cancelled_when_connection_revoked() (+7 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.09
Nodes (35): VerificationStatus, VerifyEmailPage(), formatExpiresDate(), INDUSTRY_OPTIONS, TIMEZONE_OPTIONS, WorkspaceSidebarProps, CreateWorkspaceFormProps, AuthState (+27 more)

### Community 29 - "routers/submissions.py"
Cohesion: 0.09
Nodes (13): Page, clear_sample_data(), export_submissions_csv(), get_customer_history(), get_submission(), import_submissions(), list_submissions(), load_sample_data() (+5 more)

### Community 30 - "payments/services.py"
Cohesion: 0.05
Nodes (17): get_max_forms_limit(), get_monthly_submission_limit(), resolve_plan_tier(), WorkspaceSubscription, PaddleClientError, PaymentRepository, create_billing_portal_session(), get_workspace_billing() (+9 more)

### Community 31 - "feedback.ts"
Cohesion: 0.05
Nodes (81): EmbedFormPage(), EMOJI_SCALE, EMOJI_SCALE, PublicFormPage(), EMOJI_SCALE, PALETTE_COLORS, formatDate(), getRatingBadge() (+73 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "notifications/dependencies.py"
Cohesion: 0.47
Nodes (3): get_connection_service(), get_delivery_service(), get_slack_oauth_service()

### Community 34 - "Voice of Customer (VoC) Feedback & Decision Platform"
Cohesion: 0.12
Nodes (16): 1. Decision Insights & Score Drivers, 2. Actionable Triage & 1-Click Loop Closing, 3. FTC-Compliant Form Studio, 4. Zero-State Onboarding & Sample Data, Architecture Overview, Backend, Backend Setup, Directory Structure (+8 more)

### Community 35 - "SubmissionService"
Cohesion: 0.06
Nodes (8): FeedbackImportErrorItem, FeedbackImportRequest, FeedbackImportResponse, FeedbackImportRow, FeedbackOutcomeResponse, FeedbackSubmissionCreate, FeedbackSubmissionResponse, SubmissionService

### Community 36 - "routers/connections.py"
Cohesion: 0.08
Nodes (21): create_connection(), delete_connection(), get_connection(), get_slack_authorize_url(), get_workspace_notification_quota(), list_connection_deliveries(), list_connections(), test_connection() (+13 more)

### Community 37 - "NotificationConnectionService"
Cohesion: 0.09
Nodes (11): NotificationConnectionCreate, NotificationConnectionUpdate, format_slack_test_card(), NotificationConnectionService, test_create_connection_invalid_ssrf_url(), test_create_connection_success(), test_create_email_alert_connection_requires_verified_workspace_member(), test_format_slack_test_card() (+3 more)

### Community 38 - "test_payments.py"
Cohesion: 0.13
Nodes (6): PaddleClient, PaddleWebhookSignatureError, _sign_paddle_payload(), test_free_form_and_submission_limits_plus_billing_rbac(), test_paddle_hmac_signature_verification(), test_paddle_webhook_lifecycle_idempotency_and_portal()

### Community 39 - "react"
Cohesion: 0.07
Nodes (38): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, metadata, RootAuthLayout(), DashboardPage(), metadata, RootLayout(), RootHomePage() (+30 more)

### Community 40 - "test_submissions.py"
Cohesion: 0.09
Nodes (18): test_auto_keyword_categorization_and_sentiment(), test_export_submissions_csv_filtered_and_sanitized(), test_get_customer_history(), test_import_submissions_csv_partial_success_and_historical_flags(), test_import_submissions_paste_lines_and_empty_error(), test_insights_and_submissions_segment_filters(), test_list_workspace_submissions(), test_public_form_allowed_domains_enforcement() (+10 more)

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 43 - "test_discord_provider.py"
Cohesion: 0.08
Nodes (9): test_discord_build_test_payload(), test_discord_dispatch_rate_limit_429_json_retry_after(), test_discord_dispatch_server_error_502_transient(), test_discord_dispatch_success_204_no_content(), test_discord_dispatch_timeout_transient(), test_discord_dispatch_unknown_webhook_404_revokes(), test_discord_provider_registry_registration(), test_discord_webhook_ssrf_and_url_validation_rejections() (+1 more)

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify — Query First!), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "Workspace"
Cohesion: 0.07
Nodes (13): Base, MemberPermissionOverride, RolePermission, Workspace, FeedbackCategory, DeliveryAttempt, OutboundDelivery, PaymentWebhookEvent (+5 more)

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "next"
Cohesion: 0.10
Nodes (27): nextConfig, CreateWorkspacePage(), LoginFormData, LoginPage(), loginSchema, AccountSettingsRedirectPage(), DashboardLayout(), FormStudioPage() (+19 more)

### Community 48 - "User"
Cohesion: 0.05
Nodes (30): AppError, AuthenticationError, close_redis(), get_redis(), is_token_revoked(), revoke_token(), create_access_token(), create_email_verification_token() (+22 more)

### Community 49 - "NotificationConnection"
Cohesion: 0.06
Nodes (12): AlertRuleCreate, AlertRuleRead, AlertRuleUpdate, AlertRuleService, NotificationConnection, NotificationConnectionRepository, test_alert_rule_read_dto(), test_create_alert_rule_missing_connection_fails() (+4 more)

### Community 50 - "ValidationError"
Cohesion: 0.14
Nodes (11): ForbiddenError, ValidationError, get_current_admin(), SlackOAuthService, make_test_state(), test_complete_oauth_replayed_nonce_rejected(), test_complete_oauth_slack_rejected_error(), test_complete_oauth_success_and_deduplication() (+3 more)

### Community 51 - "workspace-billing-tab.tsx"
Cohesion: 0.18
Nodes (16): formatShortDate(), progressPercent(), WorkspaceBillingTab(), WorkspaceBillingTabProps, ensurePaddleScript(), openPaddleOverlayCheckout(), PaddleCheckoutOptions, PaddleGlobal (+8 more)

### Community 52 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, start, test, test:watch

### Community 53 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @base-ui/react, class-variance-authority, clsx, cn, @hookform/resolvers, lucide-react, next (+9 more)

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 57 - "AuthRepository"
Cohesion: 0.08
Nodes (7): Permission, Role, WorkspaceInvite, WorkspaceMember, AuthRepository, WorkspaceCreateRequest, test_workspace()

### Community 59 - "AuthService"
Cohesion: 0.15
Nodes (8): ConflictError, NotFoundError, AuditLog, AuthService, test_custom_roles_crud_and_validation(), test_effective_permissions_formula(), test_workspace_creation_atomicity(), test_workspace_invite_and_acceptance_lifecycle()

### Community 62 - "pytest"
Cohesion: 0.05
Nodes (17): get_jinja_env(), render_email_template(), send_email(), _send_smtp(), get_logger(), setup_logging(), send_password_reset_email_task(), send_verification_email_task() (+9 more)

### Community 63 - "workspace-integrations-tab.tsx"
Cohesion: 0.17
Nodes (20): SlackCallbackContent(), SlackCallbackPage(), PROVIDER_CONFIG, WorkspaceIntegrationsTabProps, notificationsRepository, AlertRule, AlertRuleCreate, AlertRuleUpdate (+12 more)

### Community 64 - "schemas/__init__.py"
Cohesion: 0.08
Nodes (15): create_category(), delete_category(), get_category(), list_categories(), reorder_categories(), seed_categories(), update_category(), FeedbackCategoryCreate (+7 more)

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.11
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

### Community 66 - "test_email_provider.py"
Cohesion: 0.11
Nodes (7): test_email_build_test_payload(), test_email_dispatch_recipient_refused_is_permanent_revocation(), test_email_dispatch_success(), test_email_dispatch_transient_smtp_421_and_timeout(), test_email_provider_registered_in_registry(), test_email_provider_validation_rejections(), test_email_provider_validation_success()

### Community 67 - "test_forms.py"
Cohesion: 0.16
Nodes (8): test_create_form_duplicate_slug_conflict(), test_create_form_with_template(), test_duplicate_form(), test_get_and_update_form(), test_list_forms_initially_empty(), test_public_form_endpoint(), test_public_form_exposes_turnstile_site_key_when_configured(), test_soft_delete_form()

### Community 68 - "create_alert_rule"
Cohesion: 0.16
Nodes (5): create_alert_rule(), delete_alert_rule(), get_alert_rule(), list_alert_rules(), update_alert_rule()

### Community 69 - "auth/dependencies.py"
Cohesion: 0.08
Nodes (6): get_session(), get_auth_service(), get_token_payload(), require_permission(), _permission_dependency(), get_feedback_insights()

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 72 - "FeedbackSubmission"
Cohesion: 0.05
Nodes (27): extract_voc_signal(), VoCSignalContext, format_discord_voc_payload(), format_voc_payload(), format_email_voc_payload(), format_generic_voc_payload(), format_slack_voc_payload(), AlertRule (+19 more)

### Community 74 - "test_categories.py"
Cohesion: 0.16
Nodes (8): test_create_custom_feedback_category(), test_delete_category_and_protection(), test_list_categories_endpoint(), test_reorder_categories(), test_reseed_categories_from_industry(), test_unauthorized_user_cannot_access_categories(), test_update_feedback_category(), test_workspace_creation_auto_seeds_categories()

### Community 75 - "Critical Rules"
Cohesion: 0.20
Nodes (10): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Critical Rules, Icons → [icons.md](./rules/icons.md), Styling & Tailwind → [styling.md](./rules/styling.md), Use Components, Not Custom Markup → [composition.md](./rules/composition.md), Badge(), BadgeProps (+2 more)

### Community 76 - "FeedbackWidget"
Cohesion: 0.19
Nodes (5): autoInit(), escapeHtml(), FeedbackWidget(), getScriptAttributes(), getScriptOrigin()

### Community 77 - "forms/page.tsx"
Cohesion: 0.29
Nodes (6): getScaleBadgeLabel(), STARTER_TEMPLATES, WorkspaceFormsPage(), FormShareModal(), FormShareModalProps, FeedbackFormCreate

### Community 78 - "connection_service.py"
Cohesion: 0.14
Nodes (6): compute_cycle_start(), get_plan_quota_limits(), NotificationQuotaService, PlanQuotaLimits, WorkspaceNotificationQuotaStatus, test_free_vs_pro_quota_enforcement()

### Community 79 - "test_impact_metrics_before_vs_after_math"
Cohesion: 0.18
Nodes (6): test_create_decision_log_api(), test_create_decision_log_invalid_category_returns_404(), test_get_update_delete_decision_log_api(), test_impact_metrics_before_vs_after_math(), test_list_and_filter_decision_logs_api(), test_spam_and_quarantined_submissions_excluded()

### Community 80 - "is_domain_allowed"
Cohesion: 0.16
Nodes (6): extract_host(), is_domain_allowed(), test_extract_host(), test_is_domain_allowed_empty_allows_all(), test_is_domain_allowed_exact_and_subdomain(), test_is_domain_allowed_platform_origin_bypass()

### Community 81 - "Button"
Cohesion: 0.15
Nodes (16): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup (+8 more)

### Community 82 - "Frontend Architecture"
Cohesion: 0.17
Nodes (10): Authentication & Multi-Tenancy Flow, Frontend Architecture, Layer-Based Structure, Public Hosted Forms & Embeddable Widget, Stack, handleAuthRouting(), isValidSession(), PUBLIC_PATHS (+2 more)

### Community 83 - "WorkspaceIntegrationsTab"
Cohesion: 0.15
Nodes (12): extractErrorMessage(), getProviderBadgeLabel(), WorkspaceIntegrationsTab(), confirmDelete(), getDefaultOwnerEmail(), handleConnectSlackOAuth(), handleSaveConnection(), handleSaveRule() (+4 more)

### Community 84 - "public_forms.py"
Cohesion: 0.20
Nodes (4): get_public_form(), get_public_form_token(), submit_feedback(), PublicFormTokenResponse

### Community 85 - "shadcn/SKILL.md"
Cohesion: 0.22
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 87 - "FeedbackCategoryRepository"
Cohesion: 0.04
Nodes (13): get_alert_rule_service(), get_decision_log_service(), get_feedback_service(), get_form_service(), get_insights_service(), get_submission_service(), DecisionLog, FeedbackCategoryRepository (+5 more)

### Community 88 - "invite/page.tsx"
Cohesion: 0.09
Nodes (24): Anti-Defensive Programming & Full-Stack Alignment, ForgotPasswordFormData, ForgotPasswordPage(), forgotPasswordSchema, InvitePage(), JoinFormData, joinSchema, RegisterFormData (+16 more)

### Community 90 - "Frontend Conventions"
Cohesion: 0.22
Nodes (7): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Design System & Anti-AI-Slop Rules (Always Enforced), Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards

### Community 91 - "feedback/tasks.py"
Cohesion: 0.05
Nodes (22): evaluate_spam_heuristics(), evaluate_submission_alerts_task(), reconcile_unnotified_submissions_task(), send_monday_voc_digests_task(), triage_submission_task(), dispatch_outbound_delivery_task(), prune_old_delivery_attempts_task(), sweep_stuck_and_due_deliveries_task() (+14 more)

### Community 94 - "run_async_migrations"
Cohesion: 0.33
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 100 - "Form"
Cohesion: 0.18
Nodes (3): Form, FormService, slugify()

## Knowledge Gaps
- **15 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1330 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `Button` to `shadcn/ui`, `Critical Rules`, `cn`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **Are the 76 inferred relationships involving `Workspace` (e.g. with `AuthRepository` and `AuthService`) actually correct?**
  _`Workspace` has 76 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `weekly_digest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05819209039548023 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `Button` to `auth/dependencies.py`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Are the 48 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 48 INFERRED edges - model-reasoned connections that need verification._
- **Should `auth/services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.055895344886170574 - nodes in this community are weakly interconnected._