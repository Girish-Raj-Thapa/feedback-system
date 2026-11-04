# Graph Report - feedback-system  (2026-11-04)

## Corpus Check
- 207 files · ~125,900 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 7, .example 1, .ini 1)

## Summary
- 1653 nodes · 4047 edges · 75 communities (60 shown, 15 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 459 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `227bf997`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schemas/__init__.py
- Component Composition
- services.py
- send_email
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- FormService
- AuthRepository
- Backend Architecture
- settings/page.tsx
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- middleware.py
- main.py
- lucide-react
- dashboard-and-home.test.tsx
- SubmissionService
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- auth.repository.ts
- routers/submissions.py
- app/page.tsx
- feedback.ts
- Add an Endpoint
- User
- Voice of Customer (VoC) Feedback & Decision Platform
- schemas/submissions.py
- fastapi
- auth-layout.tsx
- useWorkspaceStore
- theme-provider.tsx
- Workspace
- components.json
- email.py
- AuthService
- Agent Docs Index
- sqlalchemy
- Web Interface Guidelines
- next
- auth/dependencies.py
- uuid
- test_effective_permissions_formula
- client.ts
- logging.py
- dependencies
- frontend/AGENTS.md
- pydantic
- frontend/README.md
- render_email_template
- require_permission
- Button
- feedback-backend
- presets.py
- core/dependencies.py
- FeedbackSubmissionRead
- services/insights.py
- Frontend Design System & UI Specification
- verify-email/page.tsx
- models.py
- submit_feedback
- run_async_migrations
- Frontend Architecture
- Frontend Workflow
- workspace-onboarding-checklist.tsx
- auth.middleware.ts
- frontend/postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `AuthService` - 88 edges
2. `Workspace` - 69 edges
3. `AuthRepository` - 53 edges
4. `next` - 51 edges
5. `authRepository` - 42 edges
6. `User` - 39 edges
7. `lucide-react` - 37 edges
8. `react` - 36 edges
9. `sonner` - 34 edges
10. `@testing-library/react` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `No sizing classes on icons inside components` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/icons.md → frontend/src/components/ui/button.tsx
- `Card structure` --references--> `CardContent()`  [INFERRED]
  .agents/skills/shadcn/rules/composition.md → frontend/src/components/ui/card.tsx
- `Tooling & Standards` --references--> `cn()`  [INFERRED]
  .agents/frontend/conventions.md → frontend/src/utils/cn.ts
- `Use cn() for conditional classes` --references--> `cn()`  [INFERRED]
  .agents/skills/shadcn/rules/styling.md → frontend/src/utils/cn.ts

## Import Cycles
- None detected.

## Communities (75 total, 15 thin omitted)

### Community 0 - "schemas/__init__.py"
Cohesion: 0.05
Nodes (17): FeedbackCategory, get_preset_categories(), FeedbackCategoryRepository, create_category(), delete_category(), get_category(), list_categories(), reorder_categories() (+9 more)

### Community 1 - "Component Composition"
Cohesion: 0.09
Nodes (17): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+9 more)

### Community 2 - "services.py"
Cohesion: 0.05
Nodes (62): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+54 more)

### Community 3 - "send_email"
Cohesion: 0.28
Nodes (4): send_email(), send_password_reset_email_task(), send_verification_email_task(), send_workspace_invite_email_task()

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
Nodes (32): eslintConfig, name, private, scripts, build, dev, lint, start (+24 more)

### Community 9 - "FormService"
Cohesion: 0.06
Nodes (16): get_form_template(), create_form(), delete_form(), duplicate_form(), get_form(), list_forms(), update_form(), CategoryPillSchema (+8 more)

### Community 10 - "AuthRepository"
Cohesion: 0.10
Nodes (5): Permission, Role, WorkspaceInvite, WorkspaceMember, AuthRepository

### Community 11 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 12 - "settings/page.tsx"
Cohesion: 0.31
Nodes (6): formatExpiresDate(), INDUSTRY_OPTIONS, TIMEZONE_OPTIONS, WorkspaceSettingsPage(), AccountSettingsTab(), WorkspaceCategoriesTab()

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
Cohesion: 0.15
Nodes (5): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), RequestContextMiddleware

### Community 18 - "lucide-react"
Cohesion: 0.09
Nodes (24): ForgotPasswordFormData, ForgotPasswordPage(), forgotPasswordSchema, InvitePage(), JoinFormData, joinSchema, LoginFormData, LoginPage() (+16 more)

### Community 20 - "SubmissionService"
Cohesion: 0.08
Nodes (7): FeedbackSubmission, SubmissionRepository, SubmissionService, test_clear_sample_data(), test_insights_detects_has_sample_data(), test_load_sample_data_creates_default_form_and_six_submissions(), test_load_sample_data_idempotent_when_already_loaded()

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
Cohesion: 0.12
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.14
Nodes (25): AuthState, AcceptInviteRequest, ChangePasswordRequest, DeleteAccountRequest, ForgotPasswordRequest, InviteJoinRequest, InvitePublicInfoRead, MemberRoleUpdateRequest (+17 more)

### Community 29 - "routers/submissions.py"
Cohesion: 0.17
Nodes (6): clear_sample_data(), get_customer_history(), get_submission(), list_submissions(), load_sample_data(), SampleDataResponse

### Community 30 - "app/page.tsx"
Cohesion: 0.22
Nodes (10): RootHomePage(), HeroProductMockup(), InteractiveWidgetDemo(), ScaleType, LandingCta(), LandingFeaturesBento(), LandingHeader(), LandingHero() (+2 more)

### Community 31 - "feedback.ts"
Cohesion: 0.09
Nodes (44): EMOJI_SCALE, PublicFormPage(), formatDate(), getRatingBadge(), STATUS_TABS, WorkspaceDashboardPage(), FeedbackDetailDrawer(), FeedbackDetailDrawerProps (+36 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "User"
Cohesion: 0.11
Nodes (12): close_redis(), hash_password(), verify_password(), User, admin_client(), auth_client(), client(), db_session() (+4 more)

### Community 34 - "Voice of Customer (VoC) Feedback & Decision Platform"
Cohesion: 0.12
Nodes (16): 1. Decision Insights & Score Drivers, 2. Actionable Triage & 1-Click Loop Closing, 3. FTC-Compliant Form Studio, 4. Zero-State Onboarding & Sample Data, Architecture Overview, Backend, Backend Setup, Directory Structure (+8 more)

### Community 35 - "schemas/submissions.py"
Cohesion: 0.19
Nodes (5): CustomerHistoryRead, FeedbackOutcomeResponse, FeedbackSubmissionCreate, FeedbackSubmissionResponse, FeedbackSubmissionUpdate

### Community 37 - "auth-layout.tsx"
Cohesion: 0.25
Nodes (11): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, metadata, RootAuthLayout(), AmbientBackground(), AmbientBackgroundProps, AuthFooter(), AuthHeader() (+3 more)

### Community 38 - "useWorkspaceStore"
Cohesion: 0.11
Nodes (21): DashboardWorkspacesPage(), EnrichedWorkspace, EMOJI_SCALE, FormStudioPage(), PALETTE_COLORS, getScaleBadgeLabel(), STARTER_TEMPLATES, WorkspaceFormsPage() (+13 more)

### Community 39 - "theme-provider.tsx"
Cohesion: 0.15
Nodes (15): caveat, metadata, RootLayout(), AuthHeaderProps, LandingFooter(), getStoredTheme(), subscribeToTheme(), Theme (+7 more)

### Community 40 - "Workspace"
Cohesion: 0.05
Nodes (30): Workspace, test_create_custom_feedback_category(), test_delete_category_and_protection(), test_list_categories_endpoint(), test_reorder_categories(), test_reseed_categories_from_industry(), test_unauthorized_user_cannot_access_categories(), test_update_feedback_category() (+22 more)

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 43 - "AuthService"
Cohesion: 0.16
Nodes (8): AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError, AuditLog, AuthService, test_workspace_invite_and_acceptance_lifecycle()

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "sqlalchemy"
Cohesion: 0.12
Nodes (10): downgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade(), upgrade() (+2 more)

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "next"
Cohesion: 0.15
Nodes (18): nextConfig, CreateWorkspacePage(), AccountSettingsPage(), DashboardLayout(), getUserInitials(), getUserInitials(), getWorkspaceInitials(), WorkspaceLayout() (+10 more)

### Community 48 - "auth/dependencies.py"
Cohesion: 0.09
Nodes (9): AuthenticationError, get_redis(), is_token_revoked(), revoke_token(), decode_token(), get_auth_service(), get_current_admin(), get_current_user() (+1 more)

### Community 49 - "uuid"
Cohesion: 0.22
Nodes (10): create_access_token(), create_email_verification_token(), create_password_reset_token(), create_refresh_token(), test_auth_cookie_session_and_account_deletion(), test_auth_forgot_password_and_resend_verification(), test_auth_logout_denylist(), test_auth_password_lifecycle_and_profile_update() (+2 more)

### Community 50 - "test_effective_permissions_formula"
Cohesion: 0.23
Nodes (4): test_custom_roles_crud_and_validation(), test_effective_permissions_formula(), test_endpoint_permission_guard(), test_workspace_creation_atomicity()

### Community 51 - "client.ts"
Cohesion: 0.39
Nodes (4): Anti-Defensive Programming & Full-Stack Alignment, apiClient(), ApiClientError, RequestOptions

### Community 53 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @base-ui/react, class-variance-authority, clsx, cn, geist, @hookform/resolvers, lucide-react (+10 more)

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 57 - "render_email_template"
Cohesion: 0.33
Nodes (5): render_email_template(), test_render_reset_password_template(), test_render_template_not_found(), test_render_verify_email_template(), test_render_workspace_invite_template()

### Community 58 - "require_permission"
Cohesion: 0.20
Nodes (3): require_permission(), _permission_dependency(), get_feedback_insights()

### Community 59 - "Button"
Cohesion: 0.08
Nodes (33): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Design System & Anti-AI-Slop Rules (Always Enforced), Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards, Buttons inside inputs use InputGroup + InputGroupAddon (+25 more)

### Community 62 - "core/dependencies.py"
Cohesion: 0.13
Nodes (4): health_check(), HealthResponse, close_db_engine(), get_session()

### Community 64 - "services/insights.py"
Cohesion: 0.09
Nodes (13): get_feedback_service(), get_form_service(), get_insights_service(), get_submission_service(), CategoryInsightItem, FeedbackInsightsResponse, InsightSummary, ScoreDriverItem (+5 more)

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.10
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

### Community 67 - "models.py"
Cohesion: 0.07
Nodes (6): Base, MemberPermissionOverride, RolePermission, Form, FormRepository, run_migrations_offline()

### Community 69 - "run_async_migrations"
Cohesion: 0.33
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 70 - "Frontend Architecture"
Cohesion: 0.33
Nodes (5): Authentication & Multi-Tenancy Flow, Frontend Architecture, Layer-Based Structure, Public Hosted Forms & Embeddable Widget, Stack

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 82 - "auth.middleware.ts"
Cohesion: 0.33
Nodes (5): handleAuthRouting(), isValidSession(), PUBLIC_PATHS, config, proxy()

## Knowledge Gaps
- **16 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 749 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `Button` to `shadcn/ui`, `cn`?**
  _High betweenness centrality (0.311) - this node is a cross-community bridge._
- **Are the 46 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 46 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schemas/__init__.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05364314400458979 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `Button` to `core/dependencies.py`?**
  _High betweenness centrality (0.307) - this node is a cross-community bridge._
- **Are the 43 inferred relationships involving `Workspace` (e.g. with `AuthRepository` and `AuthService`) actually correct?**
  _`Workspace` has 43 INFERRED edges - model-reasoned connections that need verification._
- **Should `Component Composition` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._