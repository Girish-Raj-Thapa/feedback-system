# Graph Report - feedback-system  (2026-11-16)

## Corpus Check
- 298 files · ~186,051 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 7, .woff2 3, .example 1)

## Summary
- 2876 nodes · 7521 edges · 102 communities (86 shown, 16 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 978 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `175c6cf4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- weekly_digest.py
- Component Composition
- services.py
- DecisionLogService
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- services/forms.py
- ProviderResult
- Backend Architecture
- SlackWebhookProvider
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- middleware.py
- httpx
- collections_abc
- encryption.py
- SubmissionRepository
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- test_delivery_service.py
- auth.repository.ts
- services/submissions.py
- config.py
- feedback.ts
- Add an Endpoint
- NotificationDeliveryService
- Voice of Customer (VoC) Feedback & Decision Platform
- SubmissionService
- routers/connections.py
- NotificationConnection
- uuid
- react
- Workspace
- components.json
- conftest.py
- DiscordWebhookProvider
- Agent Docs Index
- sqlalchemy
- Web Interface Guidelines
- next
- User
- AlertRuleService
- pytest
- AlertRuleRepository
- scripts
- dependencies
- frontend/AGENTS.md
- errors.py
- frontend/README.md
- AuthRepository
- OutboundDelivery
- AuthService
- feedback-backend
- presets.py
- core/email.py
- workspace-integrations-tab.tsx
- routers/categories.py
- Frontend Design System & UI Specification
- EmailAlertProvider
- test_forms.py
- test_alert_evaluator.py
- feedback/dependencies.py
- health.py
- Frontend Workflow
- FeedbackSubmission
- NotificationQuotaRepository
- test_categories.py
- Critical Rules
- FeedbackWidget
- forms/page.tsx
- NotificationQuotaService
- services/insights.py
- is_domain_allowed
- Button
- Frontend Architecture
- WorkspaceIntegrationsTab
- submit_feedback
- shadcn/SKILL.md
- frontend/postcss.config.mjs
- FeedbackCategoryRepository
- invite/page.tsx
- test_form_protection.py
- Frontend Conventions
- feedback/tasks.py
- test_full_pipeline_evaluation_to_slack_delivery_success
- routers/decision_logs.py
- run_async_migrations
- FeedbackCategoryService
- .create_category
- services/categories.py
- schemas/categories.py
- main.py
- Form

## God Nodes (most connected - your core abstractions)
1. `Workspace` - 112 edges
2. `AuthService` - 93 edges
3. `FeedbackSubmission` - 83 edges
4. `AlertRule` - 64 edges
5. `NotificationConnection` - 63 edges
6. `AuthRepository` - 58 edges
7. `next` - 58 edges
8. `ValidationError` - 56 edges
9. `User` - 55 edges
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

## Communities (102 total, 16 thin omitted)

### Community 0 - "weekly_digest.py"
Cohesion: 0.12
Nodes (16): _normalize_rating(), _compute_avg_rating(), compute_digest_window(), _compute_score_drivers(), DigestQuoteItem, DigestSubmissionRow, _format_score_text(), _is_at_risk() (+8 more)

### Community 1 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 2 - "services.py"
Cohesion: 0.05
Nodes (62): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+54 more)

### Community 3 - "DecisionLogService"
Cohesion: 0.05
Nodes (17): DecisionLog, DecisionLogRepository, DecisionImpactMetrics, DecisionLogCreate, DecisionLogRead, DecisionLogUpdate, DecisionWindowMetrics, DecisionLogService (+9 more)

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
Cohesion: 0.06
Nodes (26): eslintConfig, name, private, version, DashboardWorkspacesRedirectPage(), cn, eslint, eslint-config-next (+18 more)

### Community 9 - "services/forms.py"
Cohesion: 0.10
Nodes (15): get_form_template(), create_form(), delete_form(), duplicate_form(), get_form(), list_forms(), update_form(), CategoryPillSchema (+7 more)

### Community 10 - "ProviderResult"
Cohesion: 0.09
Nodes (4): Notifications & Provider Extensibility, BaseNotificationProvider, ProviderResult, ProviderRegistry

### Community 11 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 12 - "SlackWebhookProvider"
Cohesion: 0.10
Nodes (10): SlackWebhookProvider, test_build_test_payload(), test_dispatch_channel_not_found_404_permanent(), test_dispatch_rate_limit_429_with_retry_after(), test_dispatch_server_error_503_transient(), test_dispatch_success_200_ok(), test_dispatch_timeout_transient(), test_provider_registry_registration() (+2 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)"
Cohesion: 0.11
Nodes (17): 1.1 What This System Is, 1.2 What This System Is NOT (Category Boundaries), 1. Executive Summary & Category Definition, 2. Core Architectural Pillars, 3. V1 Feature Specification (The 5 Core Modules), 4. End-to-End System Workflows, 5. V1 Scope Guardrails (What Not to Build Yet), 6. Recommended Tech Stack & Module Mapping (+9 more)

### Community 15 - "Rules"
Cohesion: 0.10
Nodes (20): Accessibility, Animation, Anti-patterns (flag these), Content & Copy, Content Handling, Dark Mode & Theming, Focus States, Forms (+12 more)

### Community 16 - "middleware.py"
Cohesion: 0.14
Nodes (7): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), PublicCORSMiddleware, RequestContextMiddleware, send_wrapper()

### Community 17 - "httpx"
Cohesion: 0.07
Nodes (10): GenericWebhookProvider, _is_forbidden_ip(), test_generic_build_test_payload(), test_generic_dispatch_error_classification(), test_generic_dispatch_with_hmac_signature(), test_generic_dispatch_without_secret_omits_signature(), test_generic_provider_registry_registration(), test_generic_webhook_ssrf_dns_resolution_blocks_private_ip() (+2 more)

### Community 18 - "collections_abc"
Cohesion: 0.06
Nodes (19): upgrade(), downgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade() (+11 more)

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

### Community 27 - "test_delivery_service.py"
Cohesion: 0.09
Nodes (13): test_calculate_backoff_delay_cap_at_300(), test_calculate_backoff_delay_exponential_growth(), test_calculate_backoff_delay_respects_retry_after(), test_create_delivery_in_tx_idempotent(), test_process_delivery_already_claimed_returns_false(), test_process_delivery_cancelled_when_connection_revoked(), test_process_delivery_http_400_fails_delivery_without_revocation(), test_process_delivery_paused_when_rate_limited() (+5 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.10
Nodes (35): formatExpiresDate(), INDUSTRY_OPTIONS, TIMEZONE_OPTIONS, getWorkspaceInitials(), WorkspaceSidebar(), WorkspaceSidebarProps, CreateWorkspaceFormProps, AuthState (+27 more)

### Community 29 - "services/submissions.py"
Cohesion: 0.06
Nodes (20): Page, clear_sample_data(), export_submissions_csv(), get_customer_history(), get_submission(), import_submissions(), list_submissions(), load_sample_data() (+12 more)

### Community 31 - "feedback.ts"
Cohesion: 0.05
Nodes (81): EmbedFormPage(), EMOJI_SCALE, EMOJI_SCALE, PublicFormPage(), EMOJI_SCALE, PALETTE_COLORS, formatDate(), getRatingBadge() (+73 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "NotificationDeliveryService"
Cohesion: 0.06
Nodes (9): ForbiddenError, get_connection_service(), get_delivery_service(), get_slack_oauth_service(), NotificationConnectionRepository, format_slack_test_card(), NotificationDeliveryService, SlackOAuthService (+1 more)

### Community 34 - "Voice of Customer (VoC) Feedback & Decision Platform"
Cohesion: 0.12
Nodes (16): 1. Decision Insights & Score Drivers, 2. Actionable Triage & 1-Click Loop Closing, 3. FTC-Compliant Form Studio, 4. Zero-State Onboarding & Sample Data, Architecture Overview, Backend, Backend Setup, Directory Structure (+8 more)

### Community 36 - "routers/connections.py"
Cohesion: 0.07
Nodes (22): create_connection(), delete_connection(), get_connection(), get_slack_authorize_url(), get_workspace_notification_quota(), list_connection_deliveries(), list_connections(), test_connection() (+14 more)

### Community 37 - "NotificationConnection"
Cohesion: 0.09
Nodes (12): ValidationError, NotificationConnection, NotificationConnectionCreate, NotificationConnectionUpdate, NotificationConnectionService, test_create_connection_invalid_ssrf_url(), test_create_connection_success(), test_create_email_alert_connection_requires_verified_workspace_member() (+4 more)

### Community 38 - "uuid"
Cohesion: 0.44
Nodes (6): create_password_reset_token(), test_auth_cookie_session_and_account_deletion(), test_auth_forgot_password_and_resend_verification(), test_auth_logout_denylist(), test_auth_password_lifecycle_and_profile_update(), test_auth_registration_and_login_flow()

### Community 39 - "react"
Cohesion: 0.07
Nodes (40): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, metadata, RootAuthLayout(), DashboardPage(), metadata, RootLayout(), RootHomePage() (+32 more)

### Community 40 - "Workspace"
Cohesion: 0.09
Nodes (23): Workspace, test_clear_sample_data(), test_insights_detects_has_sample_data(), test_load_sample_data_creates_default_form_and_six_submissions(), test_load_sample_data_idempotent_when_already_loaded(), test_auto_keyword_categorization_and_sentiment(), test_export_submissions_csv_filtered_and_sanitized(), test_get_customer_history() (+15 more)

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 42 - "conftest.py"
Cohesion: 0.09
Nodes (15): close_redis(), admin_client(), auth_client(), client(), _configure_isolated_test_env(), db_session(), _derive_test_database_url(), _derive_test_redis_url() (+7 more)

### Community 43 - "DiscordWebhookProvider"
Cohesion: 0.09
Nodes (10): DiscordWebhookProvider, test_discord_build_test_payload(), test_discord_dispatch_rate_limit_429_json_retry_after(), test_discord_dispatch_server_error_502_transient(), test_discord_dispatch_success_204_no_content(), test_discord_dispatch_timeout_transient(), test_discord_dispatch_unknown_webhook_404_revokes(), test_discord_provider_registry_registration() (+2 more)

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify — Query First!), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "sqlalchemy"
Cohesion: 0.09
Nodes (7): Base, MemberPermissionOverride, Permission, RolePermission, FeedbackCategory, DeliveryAttempt, run_migrations_offline()

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "next"
Cohesion: 0.10
Nodes (27): nextConfig, CreateWorkspacePage(), LoginFormData, LoginPage(), loginSchema, VerificationStatus, VerifyEmailPage(), AccountSettingsRedirectPage() (+19 more)

### Community 48 - "User"
Cohesion: 0.06
Nodes (17): AuthenticationError, get_redis(), is_token_revoked(), revoke_token(), create_access_token(), create_email_verification_token(), create_refresh_token(), decode_token() (+9 more)

### Community 49 - "AlertRuleService"
Cohesion: 0.07
Nodes (15): create_alert_rule(), delete_alert_rule(), get_alert_rule(), list_alert_rules(), update_alert_rule(), AlertRuleCreate, AlertRuleRead, AlertRuleUpdate (+7 more)

### Community 50 - "pytest"
Cohesion: 0.09
Nodes (13): test_scheduler_discovers_weekly_digest_cron_task(), test_weekly_digest_plan_gating_and_delivery_in_db(), make_test_state(), test_complete_oauth_replayed_nonce_rejected(), test_complete_oauth_slack_rejected_error(), test_complete_oauth_success_and_deduplication(), test_complete_oauth_user_mismatch_forbidden(), test_generate_authorize_url_missing_client_id_raises() (+5 more)

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
Nodes (4): Role, WorkspaceInvite, WorkspaceMember, AuthRepository

### Community 58 - "OutboundDelivery"
Cohesion: 0.10
Nodes (3): OutboundDelivery, OutboundDeliveryRepository, test_email_connection_member_verification_and_quota_in_db()

### Community 59 - "AuthService"
Cohesion: 0.15
Nodes (8): ConflictError, NotFoundError, AuditLog, AuthService, test_custom_roles_crud_and_validation(), test_effective_permissions_formula(), test_workspace_creation_atomicity(), test_workspace_invite_and_acceptance_lifecycle()

### Community 62 - "core/email.py"
Cohesion: 0.10
Nodes (11): get_jinja_env(), render_email_template(), send_email(), _send_smtp(), send_password_reset_email_task(), send_verification_email_task(), send_workspace_invite_email_task(), test_render_reset_password_template() (+3 more)

### Community 63 - "workspace-integrations-tab.tsx"
Cohesion: 0.17
Nodes (20): SlackCallbackContent(), SlackCallbackPage(), PROVIDER_CONFIG, WorkspaceIntegrationsTabProps, notificationsRepository, AlertRule, AlertRuleCreate, AlertRuleUpdate (+12 more)

### Community 64 - "routers/categories.py"
Cohesion: 0.17
Nodes (8): create_category(), delete_category(), get_category(), list_categories(), reorder_categories(), seed_categories(), update_category(), FeedbackCategoryRead

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.11
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

### Community 66 - "EmailAlertProvider"
Cohesion: 0.12
Nodes (8): EmailAlertProvider, test_email_build_test_payload(), test_email_dispatch_recipient_refused_is_permanent_revocation(), test_email_dispatch_success(), test_email_dispatch_transient_smtp_421_and_timeout(), test_email_provider_registered_in_registry(), test_email_provider_validation_rejections(), test_email_provider_validation_success()

### Community 67 - "test_forms.py"
Cohesion: 0.16
Nodes (8): test_create_form_duplicate_slug_conflict(), test_create_form_with_template(), test_duplicate_form(), test_get_and_update_form(), test_list_forms_initially_empty(), test_public_form_endpoint(), test_public_form_exposes_turnstile_site_key_when_configured(), test_soft_delete_form()

### Community 68 - "test_alert_evaluator.py"
Cohesion: 0.14
Nodes (7): AlertEvaluatorService, test_alert_evaluator_all_feedback_matching(), test_alert_evaluator_category_filtering(), test_alert_evaluator_detractors_only_matching(), test_alert_evaluator_form_scope_filtering(), test_alert_evaluator_skips_inactive_or_revoked_connection(), test_find_matching_rules_service_query()

### Community 69 - "feedback/dependencies.py"
Cohesion: 0.13
Nodes (9): require_permission(), _permission_dependency(), get_alert_rule_service(), get_decision_log_service(), get_feedback_service(), get_form_service(), get_insights_service(), get_submission_service() (+1 more)

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 72 - "FeedbackSubmission"
Cohesion: 0.08
Nodes (19): extract_voc_signal(), VoCSignalContext, format_discord_voc_payload(), format_voc_payload(), format_email_voc_payload(), format_generic_voc_payload(), format_slack_voc_payload(), AlertRule (+11 more)

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

### Community 78 - "NotificationQuotaService"
Cohesion: 0.14
Nodes (7): compute_cycle_start(), get_plan_quota_limits(), NotificationQuotaService, PlanQuotaLimits, resolve_plan_tier(), WorkspaceNotificationQuotaStatus, test_free_vs_pro_quota_enforcement()

### Community 79 - "services/insights.py"
Cohesion: 0.14
Nodes (10): CategoryInsightItem, FeedbackInsightsResponse, InsightSegments, InsightSummary, ScoreDriverItem, SentimentBreakdown, InsightsService, test_get_insights_forwards_segment_filters_and_returns_available_segments() (+2 more)

### Community 80 - "is_domain_allowed"
Cohesion: 0.27
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

### Community 84 - "submit_feedback"
Cohesion: 0.22
Nodes (3): get_public_form(), get_public_form_token(), submit_feedback()

### Community 85 - "shadcn/SKILL.md"
Cohesion: 0.22
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 88 - "invite/page.tsx"
Cohesion: 0.09
Nodes (24): Anti-Defensive Programming & Full-Stack Alignment, ForgotPasswordFormData, ForgotPasswordPage(), forgotPasswordSchema, InvitePage(), JoinFormData, joinSchema, RegisterFormData (+16 more)

### Community 89 - "test_form_protection.py"
Cohesion: 0.08
Nodes (8): FormTokenService, evaluate_spam_heuristics(), test_evaluate_spam_heuristics(), test_form_token_minting_and_submission_success(), test_form_token_refresh_endpoint(), test_form_token_replay_rejected(), test_form_token_wrong_form_rejected(), test_triage_task_quarantined_skips_alerts()

### Community 90 - "Frontend Conventions"
Cohesion: 0.22
Nodes (7): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Design System & Anti-AI-Slop Rules (Always Enforced), Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards

### Community 91 - "feedback/tasks.py"
Cohesion: 0.13
Nodes (9): evaluate_submission_alerts_task(), reconcile_unnotified_submissions_task(), send_monday_voc_digests_task(), triage_submission_task(), test_evaluate_submission_alerts_already_evaluated_is_noop(), test_evaluate_submission_alerts_success_creates_deliveries(), test_evaluate_submission_alerts_zero_matches_marks_evaluated(), test_evaluate_submission_poison_guard_stops_at_max_attempts() (+1 more)

### Community 92 - "test_full_pipeline_evaluation_to_slack_delivery_success"
Cohesion: 0.10
Nodes (6): dispatch_outbound_delivery_task(), prune_old_delivery_attempts_task(), sweep_stuck_and_due_deliveries_task(), test_full_pipeline_evaluation_to_slack_delivery_success(), test_pipeline_http_400_fails_delivery_without_revoking_connection(), test_pipeline_http_404_revokes_uninstalled_connection()

### Community 93 - "routers/decision_logs.py"
Cohesion: 0.15
Nodes (5): create_decision_log(), delete_decision_log(), get_decision_log(), list_decision_logs(), update_decision_log()

### Community 94 - "run_async_migrations"
Cohesion: 0.33
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 98 - "schemas/categories.py"
Cohesion: 0.47
Nodes (3): FeedbackCategoryCreate, FeedbackCategoryReorderItem, FeedbackCategorySeedRequest

### Community 99 - "main.py"
Cohesion: 0.12
Nodes (4): close_db_engine(), get_session(), lifespan(), test_health_check_app()

### Community 100 - "Form"
Cohesion: 0.08
Nodes (4): Form, FormRepository, FormService, slugify()

## Knowledge Gaps
- **16 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1279 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `Button` to `shadcn/ui`, `Critical Rules`, `cn`?**
  _High betweenness centrality (0.275) - this node is a cross-community bridge._
- **Are the 72 inferred relationships involving `Workspace` (e.g. with `AuthRepository` and `AuthService`) actually correct?**
  _`Workspace` has 72 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `weekly_digest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `Button` to `main.py`?**
  _High betweenness centrality (0.275) - this node is a cross-community bridge._
- **Are the 48 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 48 INFERRED edges - model-reasoned connections that need verification._
- **Should `services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.054873054873054876 - nodes in this community are weakly interconnected._