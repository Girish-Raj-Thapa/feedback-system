# Graph Report - feedback-system  (2026-10-31)

## Corpus Check
- 121 files · ~73,583 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 7, .example 1, .ini 1)

## Summary
- 1187 nodes · 2662 edges · 74 communities (59 shown, 15 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 347 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `193f31ed`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- session.py
- Component Composition
- auth/router.py
- logging.py
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- auth/models.py
- AuthRepository
- Backend Architecture
- settings/page.tsx
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- middleware.py
- main.py
- invite/page.tsx
- AuthService
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- shadcn/SKILL.md
- auth.repository.ts
- button.tsx
- feedback.repository.ts
- Add an Endpoint
- conftest.py
- feedback/router.py
- scripts
- next
- [workspaceSlug]/layout.tsx
- theme-provider.tsx
- feedback/services.py
- components.json
- Frontend Conventions
- NotFoundError
- Agent Docs Index
- sqlalchemy
- Web Interface Guidelines
- react
- auth/dependencies.py
- Critical Rules
- test_workspace_invite_and_acceptance_lifecycle
- FeedbackCategory
- email.py
- dependencies
- frontend/AGENTS.md
- FeedbackService
- frontend/README.md
- render_email_template
- errors.py
- Button
- feedback-backend
- auth/repositories.py
- config.py
- User
- feedback/dependencies.py
- Frontend Design System & UI Specification
- Role
- get_preset_categories
- Workspace
- run_async_migrations
- Frontend Architecture
- Frontend Workflow
- proxy.ts
- frontend/postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `AuthService` - 89 edges
2. `AuthRepository` - 53 edges
3. `User` - 39 edges
4. `Workspace` - 29 edges
5. `next` - 27 edges
6. `NotFoundError` - 26 edges
7. `FeedbackService` - 25 edges
8. `AuditLog` - 22 edges
9. `react` - 22 edges
10. `WorkspaceMember` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `Use Components, Not Custom Markup → [composition.md](./rules/composition.md)` --references--> `Badge()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → frontend/src/components/ui/badge.tsx
- `No sizing classes on icons inside components` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/icons.md → frontend/src/components/ui/button.tsx
- `Tooling & Standards` --references--> `cn()`  [INFERRED]
  .agents/frontend/conventions.md → frontend/src/utils/cn.ts
- `Use cn() for conditional classes` --references--> `cn()`  [INFERRED]
  .agents/skills/shadcn/rules/styling.md → frontend/src/utils/cn.ts

## Import Cycles
- None detected.

## Communities (74 total, 15 thin omitted)

### Community 1 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 2 - "auth/router.py"
Cohesion: 0.06
Nodes (35): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+27 more)

### Community 3 - "logging.py"
Cohesion: 0.18
Nodes (6): send_email(), get_logger(), setup_logging(), send_password_reset_email_task(), send_verification_email_task(), send_workspace_invite_email_task()

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
Cohesion: 0.25
Nodes (11): Component Structure → [composition.md](./rules/composition.md), Card(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), Label() (+3 more)

### Community 8 - "package.json"
Cohesion: 0.11
Nodes (17): eslintConfig, name, private, version, cn, eslint, eslint-config-next, react-dom (+9 more)

### Community 9 - "auth/models.py"
Cohesion: 0.18
Nodes (4): Base, MemberPermissionOverride, RolePermission, run_migrations_offline()

### Community 10 - "AuthRepository"
Cohesion: 0.17
Nodes (3): WorkspaceInvite, WorkspaceMember, AuthRepository

### Community 11 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 12 - "settings/page.tsx"
Cohesion: 0.17
Nodes (13): AccountSettingsPage(), DashboardLayout(), getUserInitials(), DashboardWorkspacesPage(), formatExpiresDate(), INDUSTRY_OPTIONS, TIMEZONE_OPTIONS, WorkspaceSettingsPage() (+5 more)

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 14 - "Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)"
Cohesion: 0.11
Nodes (17): 1.1 What This System Is, 1.2 What This System Is NOT (Category Boundaries), 1. Executive Summary & Category Definition, 2. Core Architectural Pillars, 3. V1 Feature Specification (The 5 Core Modules), 4. End-to-End System Workflows, 5. V1 Scope Guardrails (What Not to Build Yet), 6. Recommended Tech Stack & Module Mapping (+9 more)

### Community 15 - "Rules"
Cohesion: 0.10
Nodes (20): Accessibility, Animation, Anti-patterns (flag these), Content & Copy, Content Handling, Dark Mode & Theming, Focus States, Forms (+12 more)

### Community 16 - "middleware.py"
Cohesion: 0.15
Nodes (5): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), RequestContextMiddleware

### Community 17 - "main.py"
Cohesion: 0.16
Nodes (3): register_error_handlers(), close_db_engine(), lifespan()

### Community 18 - "invite/page.tsx"
Cohesion: 0.11
Nodes (19): ForgotPasswordFormData, forgotPasswordSchema, InvitePage(), JoinFormData, joinSchema, LoginFormData, LoginPage(), loginSchema (+11 more)

### Community 20 - "AuthService"
Cohesion: 0.17
Nodes (27): AcceptInviteRequest, ChangePasswordRequest, DeleteAccountRequest, ForgotPasswordRequest, InviteJoinRequest, InvitePublicInfoRead, MemberOverrideUpdateRequest, MemberRoleUpdateRequest (+19 more)

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
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @tailwindcss/turbopack, @types/node, @types/react (+2 more)

### Community 26 - "Backend Conventions"
Cohesion: 0.12
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 27 - "shadcn/SKILL.md"
Cohesion: 0.22
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 28 - "auth.repository.ts"
Cohesion: 0.13
Nodes (28): EnrichedWorkspace, WorkspaceState, AcceptInviteRequest, ChangePasswordRequest, DeleteAccountRequest, ForgotPasswordRequest, InviteJoinRequest, InvitePublicInfoRead (+20 more)

### Community 29 - "button.tsx"
Cohesion: 0.28
Nodes (7): Badge(), BadgeProps, badgeVariants, ButtonProps, buttonVariants, @base-ui/react, class-variance-authority

### Community 31 - "feedback.repository.ts"
Cohesion: 0.23
Nodes (10): Anti-Defensive Programming & Full-Stack Alignment, apiClient(), ApiClientError, RequestOptions, feedbackRepository, FeedbackCategory, FeedbackCategoryCreate, FeedbackCategoryReorderItem (+2 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "conftest.py"
Cohesion: 0.09
Nodes (17): close_redis(), create_password_reset_token(), test_auth_cookie_session_and_account_deletion(), test_auth_forgot_password_and_resend_verification(), test_auth_logout_denylist(), test_auth_password_lifecycle_and_profile_update(), test_auth_registration_and_login_flow(), admin_client() (+9 more)

### Community 35 - "feedback/router.py"
Cohesion: 0.13
Nodes (12): create_category(), delete_category(), get_category(), list_categories(), reorder_categories(), seed_categories(), update_category(), FeedbackCategoryCreate (+4 more)

### Community 36 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 37 - "next"
Cohesion: 0.17
Nodes (14): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, nextConfig, metadata, RootAuthLayout(), RootHomePage(), AmbientBackground(), AmbientBackgroundProps (+6 more)

### Community 38 - "[workspaceSlug]/layout.tsx"
Cohesion: 0.23
Nodes (10): getUserInitials(), getWorkspaceInitials(), WorkspaceLayout(), AuthHeaderProps, getWorkspaceInitials(), WorkspaceSidebar(), WorkspaceSidebarProps, useTheme() (+2 more)

### Community 39 - "theme-provider.tsx"
Cohesion: 0.21
Nodes (10): caveat, metadata, RootLayout(), getStoredTheme(), subscribeToTheme(), Theme, ThemeContext, ThemeContextType (+2 more)

### Community 40 - "feedback/services.py"
Cohesion: 0.11
Nodes (8): slugify(), test_create_custom_feedback_category(), test_delete_category_and_protection(), test_list_categories_endpoint(), test_reorder_categories(), test_reseed_categories_from_industry(), test_unauthorized_user_cannot_access_categories(), test_update_feedback_category()

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 42 - "Frontend Conventions"
Cohesion: 0.29
Nodes (7): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Design System & Anti-AI-Slop Rules (Always Enforced), Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards

### Community 43 - "NotFoundError"
Cohesion: 0.19
Nodes (4): ConflictError, NotFoundError, AuditLog, WorkspaceMemberRead

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "sqlalchemy"
Cohesion: 0.19
Nodes (6): downgrade(), upgrade(), upgrade(), upgrade(), downgrade(), upgrade()

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "react"
Cohesion: 0.16
Nodes (12): CreateWorkspacePage(), VerificationStatus, VerifyEmailPage(), CreateWorkspaceForm(), CreateWorkspaceFormProps, INDUSTRY_PRESETS, WorkspaceCreateFormData, workspaceCreateSchema (+4 more)

### Community 48 - "auth/dependencies.py"
Cohesion: 0.08
Nodes (12): AuthenticationError, get_redis(), is_token_revoked(), revoke_token(), create_access_token(), create_refresh_token(), decode_token(), hash_password() (+4 more)

### Community 49 - "Critical Rules"
Cohesion: 0.40
Nodes (5): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Critical Rules, Styling & Tailwind → [styling.md](./rules/styling.md), Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

### Community 50 - "test_workspace_invite_and_acceptance_lifecycle"
Cohesion: 0.21
Nodes (5): test_custom_roles_crud_and_validation(), test_effective_permissions_formula(), test_endpoint_permission_guard(), test_workspace_creation_atomicity(), test_workspace_invite_and_acceptance_lifecycle()

### Community 53 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @base-ui/react, class-variance-authority, clsx, cn, geist, @hookform/resolvers, lucide-react (+10 more)

### Community 55 - "FeedbackService"
Cohesion: 0.17
Nodes (3): FeedbackCategoryRead, FeedbackService, test_workspace_creation_auto_seeds_categories()

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 57 - "render_email_template"
Cohesion: 0.31
Nodes (5): render_email_template(), test_render_reset_password_template(), test_render_template_not_found(), test_render_verify_email_template(), test_render_workspace_invite_template()

### Community 58 - "errors.py"
Cohesion: 0.14
Nodes (6): AppError, ForbiddenError, ValidationError, get_current_admin(), require_permission(), _permission_dependency()

### Community 59 - "Button"
Cohesion: 0.21
Nodes (14): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup (+6 more)

### Community 62 - "config.py"
Cohesion: 0.13
Nodes (3): health_check(), HealthResponse, Page

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.10
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

### Community 69 - "run_async_migrations"
Cohesion: 0.33
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 70 - "Frontend Architecture"
Cohesion: 0.33
Nodes (5): Authentication & Multi-Tenancy Flow, Frontend Architecture, Layer-Based Structure, Public Hosted Forms & Embeddable Widget, Stack

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 82 - "proxy.ts"
Cohesion: 0.47
Nodes (4): handleAuthRouting(), PUBLIC_PATHS, config, proxy()

## Knowledge Gaps
- **12 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 569 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `Button` to `shadcn/ui`, `button.tsx`, `cn`?**
  _High betweenness centrality (0.285) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 47 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth/router.py` be split into smaller, more focused modules?**
  _Cohesion score 0.059940059940059943 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `Button` to `session.py`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `AuthRepository` (e.g. with `AuditLog` and `MemberPermissionOverride`) actually correct?**
  _`AuthRepository` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `Group B: Dynamic RBAC, Invites & Audit Logging` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._