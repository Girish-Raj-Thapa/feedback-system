# Graph Report - feedback-system  (2026-11-12)

## Corpus Check
- 281 files · ~175,189 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 7, .woff2 3, .example 1)

## Summary
- 2603 nodes · 6617 edges · 110 communities (90 shown, 20 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 843 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `70687685`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- services/categories.py
- Component Composition
- services.py
- auth/tasks.py
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- routers/forms.py
- AuthService
- Backend Architecture
- SlackWebhookProvider
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- middleware.py
- register_error_handlers
- next
- encryption.py
- SubmissionRepository
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- FeedbackCategoryRepository
- auth.repository.ts
- services/submissions.py
- alerts.py
- feedback.ts
- Add an Endpoint
- feedback/tasks.py
- Voice of Customer (VoC) Feedback & Decision Platform
- SubmissionService
- routers/connections.py
- connection_service.py
- [formId]/page.tsx
- lucide-react
- test_submissions.py
- components.json
- email.py
- NotificationConnection
- Agent Docs Index
- sqlalchemy
- Web Interface Guidelines
- authRepository
- User
- AlertRule
- OutboundDelivery
- client.ts
- logging.py
- dependencies
- frontend/AGENTS.md
- DecisionLogService
- frontend/README.md
- test_workspaces_rbac.py
- FeedbackSubmission
- Button
- feedback-backend
- presets.py
- collections_abc
- workspace-integrations-tab.tsx
- Workspace
- Frontend Design System & UI Specification
- auth/models.py
- ValidationError
- uuid
- datetime
- Frontend Workflow
- test_alert_evaluator.py
- sweep_stuck_and_due_deliveries_task
- test_categories.py
- test_forms.py
- FeedbackWidget
- test_feedback_tasks.py
- Architecture & Workflow Plan: 1-Click Slack OAuth Integration
- Architecture Blueprint: Outbound Notification & Delivery Engine
- is_domain_allowed
- Input
- Frontend Architecture
- asyncio
- .verify_challenge
- shadcn/SKILL.md
- frontend/postcss.config.mjs
- get_preset_categories
- Frontend Conventions
- fastapi
- routers/categories.py
- scripts
- 14. Implementation Roadmap
- badge.tsx
- 6. Proposed Database Schema
- 8. Retry Policy & Crash Recovery
- 2. Core Architectural Pillars
- core/dependencies.py
- 11. Security, SSRF & Privacy Protection
- 13. Testing Strategy
- Form
- eslint.config.mjs
- FormTokenService
- workspace-onboarding-checklist.tsx
- setup.ts
- notifications/dependencies.py

## God Nodes (most connected - your core abstractions)
1. `Workspace` - 106 edges
2. `AuthService` - 91 edges
3. `FeedbackSubmission` - 70 edges
4. `NotificationConnection` - 58 edges
5. `next` - 58 edges
6. `AuthRepository` - 53 edges
7. `User` - 49 edges
8. `SubmissionService` - 49 edges
9. `AlertRule` - 44 edges
10. `react` - 43 edges

## Surprising Connections (you probably didn't know these)
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `Feature Roadmap & Status` --references--> `Workspace`  [INFERRED]
  .agents/backend/architecture.md → backend/app/features/auth/models.py
- `The Solution: Transactional Outbox` --references--> `FeedbackSubmission`  [INFERRED]
  notifications.md → backend/app/features/feedback/models/submissions.py
- `Slack Provider Implementation (`SlackWebhookProvider`)` --references--> `SlackWebhookProvider`  [INFERRED]
  notifications.md → backend/app/features/notifications/providers/slack.py
- `Use Components, Not Custom Markup → [composition.md](./rules/composition.md)` --references--> `Badge()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → frontend/src/components/ui/badge.tsx

## Import Cycles
- None detected.

## Communities (110 total, 20 thin omitted)

### Community 0 - "services/categories.py"
Cohesion: 0.11
Nodes (8): ConflictError, FeedbackCategoryCreate, FeedbackCategoryRead, FeedbackCategoryReorderItem, FeedbackCategoryReorderRequest, FeedbackCategoryUpdate, FeedbackCategoryService, slugify()

### Community 1 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 2 - "services.py"
Cohesion: 0.06
Nodes (60): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+52 more)

### Community 3 - "auth/tasks.py"
Cohesion: 0.17
Nodes (8): send_email(), _send_smtp(), send_password_reset_email_task(), send_verification_email_task(), send_workspace_invite_email_task(), 1.2 Feedback Submission Ingestion Path, 1.3 Existing Email & Task Infrastructure, 1. Existing System Understanding & Codebase Findings

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
Cohesion: 0.10
Nodes (20): name, private, version, cn, jsdom, react-dom, shadcn, tailwindcss (+12 more)

### Community 9 - "routers/forms.py"
Cohesion: 0.08
Nodes (17): create_form(), delete_form(), duplicate_form(), get_form(), list_forms(), update_form(), get_public_form(), get_public_form_token() (+9 more)

### Community 10 - "AuthService"
Cohesion: 0.09
Nodes (8): NotFoundError, AuditLog, Permission, Role, WorkspaceInvite, WorkspaceMember, AuthRepository, AuthService

### Community 11 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 12 - "SlackWebhookProvider"
Cohesion: 0.05
Nodes (14): BaseNotificationProvider, ProviderRegistry, SlackWebhookProvider, test_build_test_payload(), test_dispatch_channel_not_found_404_permanent(), test_dispatch_rate_limit_429_with_retry_after(), test_dispatch_server_error_503_transient(), test_dispatch_success_200_ok() (+6 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)"
Cohesion: 0.15
Nodes (13): 1.1 What This System Is, 1.2 What This System Is NOT (Category Boundaries), 1. Executive Summary & Category Definition, 3. V1 Feature Specification (The 5 Core Modules), 4. End-to-End System Workflows, 5. V1 Scope Guardrails (What Not to Build Yet), 6. Recommended Tech Stack & Module Mapping, Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1) (+5 more)

### Community 15 - "Rules"
Cohesion: 0.10
Nodes (20): Accessibility, Animation, Anti-patterns (flag these), Content & Copy, Content Handling, Dark Mode & Theming, Focus States, Forms (+12 more)

### Community 16 - "middleware.py"
Cohesion: 0.13
Nodes (7): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), PublicCORSMiddleware, RequestContextMiddleware, send_wrapper()

### Community 18 - "next"
Cohesion: 0.07
Nodes (28): nextConfig, ForgotPasswordFormData, ForgotPasswordPage(), forgotPasswordSchema, LoginFormData, LoginPage(), loginSchema, RegisterFormData (+20 more)

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
Cohesion: 0.11
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 27 - "FeedbackCategoryRepository"
Cohesion: 0.06
Nodes (12): get_alert_rule_service(), get_decision_log_service(), get_feedback_service(), get_form_service(), get_insights_service(), get_submission_service(), DecisionLog, FeedbackCategoryRepository (+4 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.10
Nodes (32): getWorkspaceInitials(), WorkspaceSidebar(), WorkspaceSidebarProps, CreateWorkspaceFormProps, AuthState, WorkspaceState, AcceptInviteRequest, ChangePasswordRequest (+24 more)

### Community 29 - "services/submissions.py"
Cohesion: 0.07
Nodes (19): Page, clear_sample_data(), export_submissions_csv(), get_customer_history(), get_submission(), import_submissions(), list_submissions(), load_sample_data() (+11 more)

### Community 30 - "alerts.py"
Cohesion: 0.18
Nodes (6): create_alert_rule(), delete_alert_rule(), get_alert_rule(), list_alert_rules(), update_alert_rule(), AlertRuleRead

### Community 31 - "feedback.ts"
Cohesion: 0.05
Nodes (74): EmbedFormPage(), EMOJI_SCALE, EMOJI_SCALE, PublicFormPage(), formatDate(), getRatingBadge(), STATUS_TABS, TIMEFRAME_OPTIONS (+66 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "feedback/tasks.py"
Cohesion: 0.27
Nodes (4): evaluate_spam_heuristics(), triage_submission_task(), test_evaluate_spam_heuristics(), test_triage_task_quarantined_skips_alerts()

### Community 34 - "Voice of Customer (VoC) Feedback & Decision Platform"
Cohesion: 0.12
Nodes (16): 1. Decision Insights & Score Drivers, 2. Actionable Triage & 1-Click Loop Closing, 3. FTC-Compliant Form Studio, 4. Zero-State Onboarding & Sample Data, Architecture Overview, Backend, Backend Setup, Directory Structure (+8 more)

### Community 36 - "routers/connections.py"
Cohesion: 0.07
Nodes (22): create_connection(), delete_connection(), get_connection(), get_slack_authorize_url(), list_connection_deliveries(), list_connections(), test_connection(), test_raw_destination() (+14 more)

### Community 37 - "connection_service.py"
Cohesion: 0.10
Nodes (9): ProviderResult, NotificationConnectionCreate, format_slack_test_card(), NotificationConnectionService, test_create_connection_invalid_ssrf_url(), test_create_connection_success(), test_format_slack_test_card(), test_test_connection_dispatch() (+1 more)

### Community 38 - "[formId]/page.tsx"
Cohesion: 0.16
Nodes (12): EMOJI_SCALE, PALETTE_COLORS, getScaleBadgeLabel(), STARTER_TEMPLATES, WorkspaceFormsPage(), FormShareModal(), FormShareModalProps, CategoryPillItem (+4 more)

### Community 39 - "lucide-react"
Cohesion: 0.08
Nodes (35): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, metadata, RootAuthLayout(), metadata, RootLayout(), RootHomePage(), AmbientBackground() (+27 more)

### Community 40 - "test_submissions.py"
Cohesion: 0.09
Nodes (18): test_auto_keyword_categorization_and_sentiment(), test_export_submissions_csv_filtered_and_sanitized(), test_get_customer_history(), test_import_submissions_csv_partial_success_and_historical_flags(), test_import_submissions_paste_lines_and_empty_error(), test_insights_and_submissions_segment_filters(), test_list_workspace_submissions(), test_public_form_allowed_domains_enforcement() (+10 more)

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 42 - "email.py"
Cohesion: 0.15
Nodes (6): get_jinja_env(), render_email_template(), test_render_reset_password_template(), test_render_template_not_found(), test_render_verify_email_template(), test_render_workspace_invite_template()

### Community 43 - "NotificationConnection"
Cohesion: 0.14
Nodes (6): NotificationConnection, dispatch_outbound_delivery_task(), test_full_pipeline_evaluation_to_slack_delivery_success(), test_pipeline_http_400_fails_delivery_without_revoking_connection(), test_pipeline_http_404_revokes_uninstalled_connection(), Phase 3: Durable Delivery Engine & Taskiq Tasks

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "sqlalchemy"
Cohesion: 0.08
Nodes (17): upgrade(), downgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade() (+9 more)

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "authRepository"
Cohesion: 0.10
Nodes (26): CreateWorkspacePage(), InvitePage(), JoinFormData, joinSchema, DashboardLayout(), FormStudioPage(), getUserInitials(), getWorkspaceInitials() (+18 more)

### Community 48 - "User"
Cohesion: 0.06
Nodes (24): AuthenticationError, close_redis(), get_redis(), is_token_revoked(), revoke_token(), create_access_token(), create_refresh_token(), decode_token() (+16 more)

### Community 49 - "AlertRule"
Cohesion: 0.08
Nodes (10): AlertRule, AlertRuleRepository, AlertRuleCreate, AlertRuleUpdate, AlertRuleService, test_alert_rule_read_dto(), test_create_alert_rule_missing_connection_fails(), test_create_alert_rule_missing_form_fails() (+2 more)

### Community 50 - "OutboundDelivery"
Cohesion: 0.05
Nodes (17): DeliveryAttempt, OutboundDelivery, OutboundDeliveryRepository, NotificationDeliveryService, test_calculate_backoff_delay_cap_at_300(), test_calculate_backoff_delay_exponential_growth(), test_calculate_backoff_delay_respects_retry_after(), test_create_delivery_in_tx_idempotent() (+9 more)

### Community 51 - "client.ts"
Cohesion: 0.32
Nodes (8): Anti-Defensive Programming & Full-Stack Alignment, apiBlobClient(), apiClient(), ApiClientError, extractApiErrorMessage(), parseResponseData(), RequestOptions, requestRaw()

### Community 53 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @base-ui/react, class-variance-authority, clsx, cn, @hookform/resolvers, lucide-react, next (+9 more)

### Community 55 - "DecisionLogService"
Cohesion: 0.07
Nodes (13): create_decision_log(), delete_decision_log(), get_decision_log(), list_decision_logs(), update_decision_log(), DecisionImpactMetrics, DecisionLogCreate, DecisionLogRead (+5 more)

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 57 - "test_workspaces_rbac.py"
Cohesion: 0.18
Nodes (7): RoleCreateRequest, WorkspaceCreateRequest, test_custom_roles_crud_and_validation(), test_effective_permissions_formula(), test_endpoint_permission_guard(), test_workspace_creation_atomicity(), test_workspace_invite_and_acceptance_lifecycle()

### Community 58 - "FeedbackSubmission"
Cohesion: 0.14
Nodes (7): FeedbackSubmission, AlertEvaluatorService, test_alert_evaluator_all_feedback_matching(), test_alert_evaluator_detractors_only_matching(), test_alert_evaluator_form_scope_filtering(), test_alert_evaluator_skips_inactive_or_revoked_connection(), test_find_matching_rules_service_query()

### Community 59 - "Button"
Cohesion: 0.19
Nodes (11): Option sets (2–7 choices) use ToggleGroup, Chat & Messaging → [chat.md](./rules/chat.md), CLI, Critical Rules, Forms & Inputs → [forms.md](./rules/forms.md), Icons → [icons.md](./rules/icons.md), Styling & Tailwind → [styling.md](./rules/styling.md), Use Components, Not Custom Markup → [composition.md](./rules/composition.md) (+3 more)

### Community 62 - "collections_abc"
Cohesion: 0.14
Nodes (4): health_check(), HealthResponse, close_db_engine(), lifespan()

### Community 63 - "workspace-integrations-tab.tsx"
Cohesion: 0.10
Nodes (17): WorkspaceIntegrationsTab(), WorkspaceIntegrationsTabProps, notificationsRepository, AlertRule, AlertRuleCreate, AlertRuleUpdate, AlertTriggerType, ConnectionHealthStatus (+9 more)

### Community 64 - "Workspace"
Cohesion: 0.12
Nodes (17): Workspace, CategoryInsightItem, FeedbackInsightsResponse, InsightSegments, InsightSummary, ScoreDriverItem, SentimentBreakdown, InsightsService (+9 more)

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.10
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

### Community 67 - "auth/models.py"
Cohesion: 0.11
Nodes (9): Base, MemberPermissionOverride, RolePermission, FeedbackCategory, do_run_migrations(), run_async_migrations(), run_migrations_offline(), run_migrations_online() (+1 more)

### Community 68 - "ValidationError"
Cohesion: 0.12
Nodes (12): AppError, ForbiddenError, ValidationError, SlackOAuthService, make_test_state(), test_complete_oauth_replayed_nonce_rejected(), test_complete_oauth_slack_rejected_error(), test_complete_oauth_success_and_deduplication() (+4 more)

### Community 69 - "uuid"
Cohesion: 0.26
Nodes (7): create_email_verification_token(), create_password_reset_token(), test_auth_cookie_session_and_account_deletion(), test_auth_forgot_password_and_resend_verification(), test_auth_logout_denylist(), test_auth_password_lifecycle_and_profile_update(), test_auth_registration_and_login_flow()

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 72 - "test_alert_evaluator.py"
Cohesion: 0.18
Nodes (4): format_slack_voc_payload(), test_format_slack_voc_payload_detractor(), test_format_slack_voc_payload_neutral_omits_style(), test_format_slack_voc_payload_privacy_redacts_email()

### Community 74 - "test_categories.py"
Cohesion: 0.16
Nodes (8): test_create_custom_feedback_category(), test_delete_category_and_protection(), test_list_categories_endpoint(), test_reorder_categories(), test_reseed_categories_from_industry(), test_unauthorized_user_cannot_access_categories(), test_update_feedback_category(), test_workspace_creation_auto_seeds_categories()

### Community 75 - "test_forms.py"
Cohesion: 0.16
Nodes (8): test_create_form_duplicate_slug_conflict(), test_create_form_with_template(), test_duplicate_form(), test_get_and_update_form(), test_list_forms_initially_empty(), test_public_form_endpoint(), test_public_form_exposes_turnstile_site_key_when_configured(), test_soft_delete_form()

### Community 76 - "FeedbackWidget"
Cohesion: 0.19
Nodes (5): autoInit(), escapeHtml(), FeedbackWidget(), getScriptAttributes(), getScriptOrigin()

### Community 77 - "test_feedback_tasks.py"
Cohesion: 0.18
Nodes (7): evaluate_submission_alerts_task(), reconcile_unnotified_submissions_task(), test_evaluate_submission_alerts_already_evaluated_is_noop(), test_evaluate_submission_alerts_success_creates_deliveries(), test_evaluate_submission_alerts_zero_matches_marks_evaluated(), test_evaluate_submission_poison_guard_stops_at_max_attempts(), test_reconcile_unnotified_submissions_enqueues_batch()

### Community 78 - "Architecture & Workflow Plan: 1-Click Slack OAuth Integration"
Cohesion: 0.12
Nodes (17): 1. Executive Summary & Design Principles, 2. Complete End-to-End Workflow Diagram, 3.1 Migration Specifications, 3.2 Unique Partial Index for Idempotent Upserts, 3. Database Schema & Migration Changes, 4.1 Configuration Settings (`app/core/config.py`), 4.2 State Generation & Redis Replay Prevention, 4.3 Next.js Callback Bridge & Backend Verification (+9 more)

### Community 79 - "Architecture Blueprint: Outbound Notification & Delivery Engine"
Cohesion: 0.11
Nodes (19): 10. Provider Architecture (Strategy Pattern), 12. Operational Design & Circuit Breaker, 15. Alternatives Considered & Trade-Offs, 16. Open Questions & Assumptions, 2. Relevant Findings from the Product Blueprint, 3. Modular Monolith Architecture & Module Boundaries, 4. Recommended Directory Structure, 5. Communication Interface Between Modules (+11 more)

### Community 80 - "is_domain_allowed"
Cohesion: 0.15
Nodes (6): extract_host(), is_domain_allowed(), test_extract_host(), test_is_domain_allowed_empty_allows_all(), test_is_domain_allowed_exact_and_subdomain(), test_is_domain_allowed_platform_origin_bypass()

### Community 81 - "Input"
Cohesion: 0.25
Nodes (9): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Input() (+1 more)

### Community 82 - "Frontend Architecture"
Cohesion: 0.17
Nodes (10): Authentication & Multi-Tenancy Flow, Frontend Architecture, Layer-Based Structure, Public Hosted Forms & Embeddable Widget, Stack, handleAuthRouting(), isValidSession(), PUBLIC_PATHS (+2 more)

### Community 83 - "asyncio"
Cohesion: 0.32
Nodes (3): test_create_decision_log_invalid_category_returns_404(), test_get_update_delete_decision_log_api(), test_list_and_filter_decision_logs_api()

### Community 85 - "shadcn/SKILL.md"
Cohesion: 0.22
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 88 - "Frontend Conventions"
Cohesion: 0.29
Nodes (7): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Design System & Anti-AI-Slop Rules (Always Enforced), Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards

### Community 89 - "fastapi"
Cohesion: 0.16
Nodes (3): require_permission(), _permission_dependency(), get_feedback_insights()

### Community 90 - "routers/categories.py"
Cohesion: 0.15
Nodes (8): create_category(), delete_category(), get_category(), list_categories(), reorder_categories(), seed_categories(), update_category(), FeedbackCategorySeedRequest

### Community 91 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, start, test, test:watch

### Community 92 - "14. Implementation Roadmap"
Cohesion: 0.40
Nodes (5): 14. Implementation Roadmap, Phase 1: Notifications Module & Database Schema, Phase 4: Feedback Ingestion Outbox Hook, Phase 5: REST API Endpoints, Phase 6: Frontend Settings UI

### Community 93 - "badge.tsx"
Cohesion: 0.32
Nodes (6): Component Selection, Pagination, Badge(), BadgeProps, badgeVariants, class-variance-authority

### Community 94 - "6. Proposed Database Schema"
Cohesion: 0.40
Nodes (5): 6. Proposed Database Schema, Table 1: `notification_connections` (Notifications Module), Table 2: `alert_rules` (Feedback Module), Table 3: `outbound_deliveries` (Notifications Module), Table 4: `delivery_attempts` (Notifications Module)

### Community 95 - "8. Retry Policy & Crash Recovery"
Cohesion: 0.40
Nodes (5): 8.1 Error Classification, 8.2 Exponential Backoff Math, 8.3 Concurrency & Lock Leases (`FOR UPDATE SKIP LOCKED`), 8.4 Crash Recovery (The Sweeper Cron), 8. Retry Policy & Crash Recovery

### Community 96 - "2. Core Architectural Pillars"
Cohesion: 0.50
Nodes (4): 2. Core Architectural Pillars, Pillar 1: The "Core Signal Trio" (Custom UI -> Standardized Data), Pillar 2: The Locked-Bucket Taxonomy (Zero Tag Sprawl), Pillar 3: Low- & High-Volume "Score Driver" Math

### Community 98 - "11. Security, SSRF & Privacy Protection"
Cohesion: 0.50
Nodes (4): 11.1 SSRF (Server-Side Request Forgery) Defense, 11.2 Credential Masking in API Responses, 11.3 PII Minimization, 11. Security, SSRF & Privacy Protection

### Community 99 - "13. Testing Strategy"
Cohesion: 0.50
Nodes (4): 13.1 Unit Tests, 13.2 Integration Tests (Database & Transactions), 13.3 Concurrency & Recovery Tests, 13. Testing Strategy

### Community 100 - "Form"
Cohesion: 0.09
Nodes (5): Form, get_form_template(), FormRepository, FormService, slugify()

### Community 103 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 105 - "FormTokenService"
Cohesion: 0.12
Nodes (5): FormTokenService, test_form_token_minting_and_submission_success(), test_form_token_refresh_endpoint(), test_form_token_replay_rejected(), test_form_token_wrong_form_rejected()

### Community 114 - "notifications/dependencies.py"
Cohesion: 0.47
Nodes (3): get_connection_service(), get_delivery_service(), get_slack_oauth_service()

## Knowledge Gaps
- **16 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1168 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `badge.tsx` to `shadcn/ui`, `Input`, `Button`, `cn`?**
  _High betweenness centrality (0.264) - this node is a cross-community bridge._
- **Are the 69 inferred relationships involving `Workspace` (e.g. with `Feature Roadmap & Status` and `AuthRepository`) actually correct?**
  _`Workspace` has 69 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `services/categories.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `badge.tsx` to `core/dependencies.py`?**
  _High betweenness centrality (0.260) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Should `services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05521576622494054 - nodes in this community are weakly interconnected._