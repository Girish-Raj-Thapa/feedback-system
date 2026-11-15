# Graph Report - feedback-system  (2026-11-15)

## Corpus Check
- 287 files · ~174,934 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 7, .woff2 3, .example 1)

## Summary
- 2657 nodes · 6853 edges · 98 communities (83 shown, 15 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 872 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `924fc5b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- services/categories.py
- Component Composition
- services.py
- services/submissions.py
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- routers/forms.py
- AuthRepository
- Backend Architecture
- test_slack_provider.py
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- .__call__
- httpx
- react
- encryption.py
- SubmissionRepository
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- DecisionLogRepository
- auth.repository.ts
- routers/submissions.py
- alerts.py
- feedback.ts
- Add an Endpoint
- auth/dependencies.py
- Voice of Customer (VoC) Feedback & Decision Platform
- Workspace
- routers/connections.py
- NotificationConnection
- [formId]/page.tsx
- lucide-react
- test_submissions.py
- components.json
- pytest
- typing
- Agent Docs Index
- sqlalchemy
- Web Interface Guidelines
- next
- uuid
- AlertRuleService
- NotificationDeliveryService
- client.ts
- test_discord_provider.py
- dependencies
- frontend/AGENTS.md
- DecisionLogService
- frontend/README.md
- AuthService
- test_alert_evaluator.py
- Button
- feedback-backend
- presets.py
- config.py
- workspace-integrations-tab.tsx
- services/insights.py
- Frontend Design System & UI Specification
- OutboundDeliveryRepository
- models/submissions.py
- ValidationError
- AlertRuleRepository
- NotificationConnectionRepository
- Frontend Workflow
- FeedbackSubmission
- sweep_stuck_and_due_deliveries_task
- test_categories.py
- test_forms.py
- FeedbackWidget
- datetime
- create_decision_log
- InsightsService
- is_domain_allowed
- Input
- Frontend Architecture
- test_create_decision_log_invalid_category_returns_404
- submit_feedback
- shadcn/SKILL.md
- frontend/postcss.config.mjs
- feedback/dependencies.py
- register/page.tsx
- require_permission
- _clear_tenant_encryption_context
- scripts
- get_form_template
- _is_forbidden_ip
- Form
- .submit_feedback

## God Nodes (most connected - your core abstractions)
1. `Workspace` - 106 edges
2. `AuthService` - 91 edges
3. `FeedbackSubmission` - 78 edges
4. `AlertRule` - 58 edges
5. `NotificationConnection` - 58 edges
6. `next` - 58 edges
7. `AuthRepository` - 53 edges
8. `User` - 49 edges
9. `SubmissionService` - 49 edges
10. `react` - 43 edges

## Surprising Connections (you probably didn't know these)
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `Feature Roadmap & Status` --references--> `Workspace`  [INFERRED]
  .agents/backend/architecture.md → backend/app/features/auth/models.py
- `No sizing classes on icons inside components` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/icons.md → frontend/src/components/ui/button.tsx
- `Card structure` --references--> `CardContent()`  [INFERRED]
  .agents/skills/shadcn/rules/composition.md → frontend/src/components/ui/card.tsx
- `Tooling & Standards` --references--> `cn()`  [INFERRED]
  .agents/frontend/conventions.md → frontend/src/utils/cn.ts

## Import Cycles
- None detected.

## Communities (98 total, 15 thin omitted)

### Community 0 - "services/categories.py"
Cohesion: 0.05
Nodes (17): ConflictError, get_preset_categories(), create_category(), delete_category(), get_category(), list_categories(), reorder_categories(), seed_categories() (+9 more)

### Community 1 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 2 - "services.py"
Cohesion: 0.06
Nodes (62): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+54 more)

### Community 3 - "services/submissions.py"
Cohesion: 0.08
Nodes (17): CategoryPillSchema, CustomQuestionSchema, FormCreate, FormDuplicateRequest, FormUpdate, PublicFormRead, PublicFormTokenResponse, CustomerHistoryRead (+9 more)

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
Cohesion: 0.08
Nodes (23): eslintConfig, name, private, version, cn, eslint, eslint-config-next, jsdom (+15 more)

### Community 9 - "routers/forms.py"
Cohesion: 0.18
Nodes (7): create_form(), delete_form(), duplicate_form(), get_form(), list_forms(), update_form(), FormRead

### Community 10 - "AuthRepository"
Cohesion: 0.07
Nodes (12): Base, MemberPermissionOverride, Permission, Role, RolePermission, WorkspaceInvite, WorkspaceMember, AuthRepository (+4 more)

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

### Community 16 - ".__call__"
Cohesion: 0.20
Nodes (5): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), send_wrapper()

### Community 17 - "httpx"
Cohesion: 0.09
Nodes (9): GenericWebhookProvider, test_generic_build_test_payload(), test_generic_dispatch_error_classification(), test_generic_dispatch_with_hmac_signature(), test_generic_dispatch_without_secret_omits_signature(), test_generic_provider_registry_registration(), test_generic_webhook_ssrf_dns_resolution_blocks_private_ip(), test_generic_webhook_ssrf_literal_rejections() (+1 more)

### Community 18 - "react"
Cohesion: 0.09
Nodes (15): AccountSettingsRedirectPage(), DashboardPage(), DashboardWorkspacesRedirectPage(), metadata, RootLayout(), WorkspaceDashboardSubPage(), getStoredTheme(), subscribeToTheme() (+7 more)

### Community 19 - "encryption.py"
Cohesion: 0.07
Nodes (18): decrypt_secret(), derive_hkdf_key(), derive_legacy_sha256_key(), encrypt_secret(), EncryptedString, get_current_tenant_id(), get_encryption_key(), get_tenant_cipher() (+10 more)

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
Cohesion: 0.15
Nodes (13): Component Docs, Examples, and Usage, Component Selection, Current Project Context, Design Systems from DESIGN.md, Detailed References, Key Fields, Key Patterns, Principles (+5 more)

### Community 25 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, eslint-config-next, jsdom, tailwindcss, @tailwindcss/postcss, @tailwindcss/turbopack, @testing-library/dom (+11 more)

### Community 26 - "Backend Conventions"
Cohesion: 0.11
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.09
Nodes (34): VerificationStatus, VerifyEmailPage(), getWorkspaceInitials(), WorkspaceSidebar(), WorkspaceSidebarProps, CreateWorkspaceFormProps, AuthState, WorkspaceState (+26 more)

### Community 29 - "routers/submissions.py"
Cohesion: 0.10
Nodes (9): Page, clear_sample_data(), export_submissions_csv(), get_customer_history(), get_submission(), import_submissions(), list_submissions(), load_sample_data() (+1 more)

### Community 30 - "alerts.py"
Cohesion: 0.16
Nodes (7): create_alert_rule(), delete_alert_rule(), get_alert_rule(), list_alert_rules(), update_alert_rule(), AlertRuleRead, test_alert_rule_read_dto()

### Community 31 - "feedback.ts"
Cohesion: 0.05
Nodes (78): EmbedFormPage(), EMOJI_SCALE, EMOJI_SCALE, PublicFormPage(), formatDate(), getRatingBadge(), STATUS_TABS, TIMEFRAME_OPTIONS (+70 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "auth/dependencies.py"
Cohesion: 0.10
Nodes (8): AuthenticationError, get_redis(), is_token_revoked(), revoke_token(), decode_token(), get_auth_service(), get_current_user(), get_token_payload()

### Community 34 - "Voice of Customer (VoC) Feedback & Decision Platform"
Cohesion: 0.12
Nodes (16): 1. Decision Insights & Score Drivers, 2. Actionable Triage & 1-Click Loop Closing, 3. FTC-Compliant Form Studio, 4. Zero-State Onboarding & Sample Data, Architecture Overview, Backend, Backend Setup, Directory Structure (+8 more)

### Community 35 - "Workspace"
Cohesion: 0.08
Nodes (7): Workspace, FeedbackImportRequest, SubmissionService, test_clear_sample_data(), test_insights_detects_has_sample_data(), test_load_sample_data_creates_default_form_and_six_submissions(), test_load_sample_data_idempotent_when_already_loaded()

### Community 36 - "routers/connections.py"
Cohesion: 0.07
Nodes (21): create_connection(), delete_connection(), get_connection(), get_slack_authorize_url(), list_connection_deliveries(), list_connections(), test_connection(), test_raw_destination() (+13 more)

### Community 37 - "NotificationConnection"
Cohesion: 0.09
Nodes (10): NotificationConnection, NotificationConnectionCreate, NotificationConnectionUpdate, format_slack_test_card(), NotificationConnectionService, test_create_connection_invalid_ssrf_url(), test_create_connection_success(), test_format_slack_test_card() (+2 more)

### Community 38 - "[formId]/page.tsx"
Cohesion: 0.17
Nodes (11): EMOJI_SCALE, PALETTE_COLORS, getScaleBadgeLabel(), STARTER_TEMPLATES, WorkspaceFormsPage(), FormShareModal(), FormShareModalProps, CategoryPillItem (+3 more)

### Community 39 - "lucide-react"
Cohesion: 0.11
Nodes (27): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, metadata, RootAuthLayout(), RootHomePage(), AmbientBackground(), AmbientBackgroundProps, AuthFooter() (+19 more)

### Community 40 - "test_submissions.py"
Cohesion: 0.09
Nodes (18): test_auto_keyword_categorization_and_sentiment(), test_export_submissions_csv_filtered_and_sanitized(), test_get_customer_history(), test_import_submissions_csv_partial_success_and_historical_flags(), test_import_submissions_paste_lines_and_empty_error(), test_insights_and_submissions_segment_filters(), test_list_workspace_submissions(), test_public_form_allowed_domains_enforcement() (+10 more)

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 42 - "pytest"
Cohesion: 0.09
Nodes (12): get_jinja_env(), render_email_template(), send_email(), _send_smtp(), send_password_reset_email_task(), send_verification_email_task(), send_workspace_invite_email_task(), test_render_reset_password_template() (+4 more)

### Community 43 - "typing"
Cohesion: 0.09
Nodes (6): Notifications & Provider Extensibility, BaseNotificationProvider, ProviderResult, DiscordWebhookProvider, ProviderRegistry, SlackWebhookProvider

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "sqlalchemy"
Cohesion: 0.08
Nodes (17): upgrade(), downgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade() (+9 more)

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "next"
Cohesion: 0.09
Nodes (39): nextConfig, CreateWorkspacePage(), ForgotPasswordFormData, ForgotPasswordPage(), forgotPasswordSchema, InvitePage(), JoinFormData, joinSchema (+31 more)

### Community 48 - "uuid"
Cohesion: 0.07
Nodes (26): close_redis(), create_access_token(), create_email_verification_token(), create_password_reset_token(), create_refresh_token(), hash_password(), verify_password(), User (+18 more)

### Community 49 - "AlertRuleService"
Cohesion: 0.14
Nodes (7): AlertRuleCreate, AlertRuleUpdate, AlertRuleService, test_create_alert_rule_missing_connection_fails(), test_create_alert_rule_missing_form_fails(), test_create_alert_rule_success_all_forms(), test_update_alert_rule_success()

### Community 50 - "NotificationDeliveryService"
Cohesion: 0.09
Nodes (16): get_connection_service(), get_delivery_service(), get_slack_oauth_service(), NotificationDeliveryService, test_calculate_backoff_delay_cap_at_300(), test_calculate_backoff_delay_exponential_growth(), test_calculate_backoff_delay_respects_retry_after(), test_create_delivery_in_tx_idempotent() (+8 more)

### Community 51 - "client.ts"
Cohesion: 0.18
Nodes (14): Accessibility & Web Interface Standards (Vercel Guidelines), Anti-Defensive Programming & Full-Stack Alignment, Architecture & Layer Boundaries, Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards, apiBlobClient() (+6 more)

### Community 52 - "test_discord_provider.py"
Cohesion: 0.08
Nodes (9): test_discord_build_test_payload(), test_discord_dispatch_rate_limit_429_json_retry_after(), test_discord_dispatch_server_error_502_transient(), test_discord_dispatch_success_204_no_content(), test_discord_dispatch_timeout_transient(), test_discord_dispatch_unknown_webhook_404_revokes(), test_discord_provider_registry_registration(), test_discord_webhook_ssrf_and_url_validation_rejections() (+1 more)

### Community 53 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @base-ui/react, class-variance-authority, clsx, cn, @hookform/resolvers, lucide-react, next (+9 more)

### Community 55 - "DecisionLogService"
Cohesion: 0.10
Nodes (9): update_decision_log(), DecisionImpactMetrics, DecisionLogCreate, DecisionLogRead, DecisionLogUpdate, DecisionWindowMetrics, DecisionLogService, _is_detractor() (+1 more)

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 57 - "AuthService"
Cohesion: 0.17
Nodes (4): NotFoundError, AuditLog, AuthService, test_workspace_invite_and_acceptance_lifecycle()

### Community 58 - "test_alert_evaluator.py"
Cohesion: 0.15
Nodes (6): AlertEvaluatorService, test_alert_evaluator_all_feedback_matching(), test_alert_evaluator_detractors_only_matching(), test_alert_evaluator_form_scope_filtering(), test_alert_evaluator_skips_inactive_or_revoked_connection(), test_find_matching_rules_service_query()

### Community 59 - "Button"
Cohesion: 0.14
Nodes (16): Design System & Anti-AI-Slop Rules (Always Enforced), Option sets (2–7 choices) use ToggleGroup, Chat & Messaging → [chat.md](./rules/chat.md), CLI, Critical Rules, Forms & Inputs → [forms.md](./rules/forms.md), Icons → [icons.md](./rules/icons.md), Styling & Tailwind → [styling.md](./rules/styling.md) (+8 more)

### Community 62 - "config.py"
Cohesion: 0.06
Nodes (9): health_check(), HealthResponse, get_logger(), setup_logging(), PublicCORSMiddleware, RequestContextMiddleware, close_db_engine(), get_session() (+1 more)

### Community 63 - "workspace-integrations-tab.tsx"
Cohesion: 0.09
Nodes (27): SlackCallbackContent(), SlackCallbackPage(), extractErrorMessage(), getProviderBadgeLabel(), PROVIDER_CONFIG, WorkspaceIntegrationsTab(), handleConnectSlackOAuth(), handleSaveConnection() (+19 more)

### Community 64 - "services/insights.py"
Cohesion: 0.19
Nodes (5): CategoryInsightItem, InsightSegments, InsightSummary, ScoreDriverItem, SentimentBreakdown

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.10
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

### Community 67 - "models/submissions.py"
Cohesion: 0.09
Nodes (6): FeedbackCategory, FeedbackCategoryRepository, test_create_decision_log_api(), test_impact_metrics_before_vs_after_math(), test_numeric_scale_normalization_in_decision_impact(), test_spam_and_quarantined_submissions_excluded()

### Community 68 - "ValidationError"
Cohesion: 0.08
Nodes (13): AppError, ForbiddenError, register_error_handlers(), ValidationError, get_current_admin(), SlackOAuthService, make_test_state(), test_complete_oauth_replayed_nonce_rejected() (+5 more)

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 72 - "FeedbackSubmission"
Cohesion: 0.09
Nodes (17): extract_voc_signal(), VoCSignalContext, format_discord_voc_payload(), format_voc_payload(), format_generic_voc_payload(), format_slack_voc_payload(), AlertRule, FeedbackSubmission (+9 more)

### Community 74 - "test_categories.py"
Cohesion: 0.16
Nodes (8): test_create_custom_feedback_category(), test_delete_category_and_protection(), test_list_categories_endpoint(), test_reorder_categories(), test_reseed_categories_from_industry(), test_unauthorized_user_cannot_access_categories(), test_update_feedback_category(), test_workspace_creation_auto_seeds_categories()

### Community 75 - "test_forms.py"
Cohesion: 0.16
Nodes (8): test_create_form_duplicate_slug_conflict(), test_create_form_with_template(), test_duplicate_form(), test_get_and_update_form(), test_list_forms_initially_empty(), test_public_form_endpoint(), test_public_form_exposes_turnstile_site_key_when_configured(), test_soft_delete_form()

### Community 76 - "FeedbackWidget"
Cohesion: 0.19
Nodes (5): autoInit(), escapeHtml(), FeedbackWidget(), getScriptAttributes(), getScriptOrigin()

### Community 77 - "datetime"
Cohesion: 0.07
Nodes (14): evaluate_submission_alerts_task(), reconcile_unnotified_submissions_task(), DeliveryAttempt, OutboundDelivery, dispatch_outbound_delivery_task(), test_evaluate_submission_alerts_already_evaluated_is_noop(), test_evaluate_submission_alerts_success_creates_deliveries(), test_evaluate_submission_alerts_zero_matches_marks_evaluated() (+6 more)

### Community 78 - "create_decision_log"
Cohesion: 0.17
Nodes (4): create_decision_log(), delete_decision_log(), get_decision_log(), list_decision_logs()

### Community 79 - "InsightsService"
Cohesion: 0.23
Nodes (6): InsightsService, _normalize_rating(), test_get_insights_forwards_segment_filters_and_returns_available_segments(), test_get_insights_score_drivers_calculation(), test_get_insights_zero_submissions(), test_normalize_rating()

### Community 80 - "is_domain_allowed"
Cohesion: 0.27
Nodes (6): extract_host(), is_domain_allowed(), test_extract_host(), test_is_domain_allowed_empty_allows_all(), test_is_domain_allowed_exact_and_subdomain(), test_is_domain_allowed_platform_origin_bypass()

### Community 81 - "Input"
Cohesion: 0.25
Nodes (9): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Input() (+1 more)

### Community 82 - "Frontend Architecture"
Cohesion: 0.17
Nodes (10): Authentication & Multi-Tenancy Flow, Frontend Architecture, Layer-Based Structure, Public Hosted Forms & Embeddable Widget, Stack, handleAuthRouting(), isValidSession(), PUBLIC_PATHS (+2 more)

### Community 83 - "test_create_decision_log_invalid_category_returns_404"
Cohesion: 0.29
Nodes (3): test_create_decision_log_invalid_category_returns_404(), test_get_update_delete_decision_log_api(), test_list_and_filter_decision_logs_api()

### Community 84 - "submit_feedback"
Cohesion: 0.22
Nodes (3): get_public_form(), get_public_form_token(), submit_feedback()

### Community 85 - "shadcn/SKILL.md"
Cohesion: 0.22
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 87 - "feedback/dependencies.py"
Cohesion: 0.31
Nodes (6): get_alert_rule_service(), get_decision_log_service(), get_feedback_service(), get_form_service(), get_insights_service(), get_submission_service()

### Community 88 - "register/page.tsx"
Cohesion: 0.43
Nodes (4): RegisterFormData, RegisterPage(), registerSchema, ScoreDriverShowcase()

### Community 89 - "require_permission"
Cohesion: 0.18
Nodes (4): require_permission(), _permission_dependency(), get_feedback_insights(), FeedbackInsightsResponse

### Community 91 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, start, test, test:watch

### Community 100 - "Form"
Cohesion: 0.09
Nodes (4): Form, FormRepository, FormService, slugify()

### Community 105 - ".submit_feedback"
Cohesion: 0.07
Nodes (10): FormTokenService, TurnstileService, evaluate_spam_heuristics(), triage_submission_task(), test_evaluate_spam_heuristics(), test_form_token_minting_and_submission_success(), test_form_token_refresh_endpoint(), test_form_token_replay_rejected() (+2 more)

## Knowledge Gaps
- **16 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1186 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `shadcn/ui` to `Input`, `Button`, `cn`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Are the 69 inferred relationships involving `Workspace` (e.g. with `Feature Roadmap & Status` and `AuthRepository`) actually correct?**
  _`Workspace` has 69 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `services/categories.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05331510594668489 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `shadcn/ui` to `config.py`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Should `services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.055713094245204334 - nodes in this community are weakly interconnected._