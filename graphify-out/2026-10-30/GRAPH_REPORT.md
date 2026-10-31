# Graph Report - feedback-system  (2026-10-30)

## Corpus Check
- 110 files · ~1,224,320 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 8, .example 1, .ini 1)

## Summary
- 1077 nodes · 2349 edges · 66 communities (57 shown, 9 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 302 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8024cef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- session.py
- Component Composition
- services.py
- send_email
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- cn
- package.json
- models.py
- AuthRepository
- Backend Architecture
- settings/page.tsx
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- middleware.py
- main.py
- next
- DESIGN.md
- theme.ts
- Backend Workflow
- Styling & Customization
- shadcn/ui
- devDependencies
- Backend Conventions
- shadcn/SKILL.md
- auth.repository.ts
- badge.tsx
- client.ts
- Add an Endpoint
- conftest.py
- health.py
- scripts
- auth-layout.tsx
- lucide-react
- theme-provider.tsx
- AuditLog
- components.json
- Frontend Conventions
- UUID
- Agent Docs Index
- sqlalchemy
- Web Interface Guidelines
- create-workspace-form.tsx
- AuthService
- Critical Rules
- Workspace
- react
- config.py
- dependencies
- frontend/AGENTS.md
- auth/dependencies.py
- frontend/README.md
- render_email_template
- ConflictError
- Input
- feedback-backend
- Frontend Design System & UI Specification
- Frontend Architecture
- Frontend Workflow
- proxy.ts
- frontend/postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `AuthService` - 88 edges
2. `AuthRepository` - 53 edges
3. `User` - 39 edges
4. `next` - 27 edges
5. `AuditLog` - 22 edges
6. `react` - 22 edges
7. `NotFoundError` - 21 edges
8. `WorkspaceMember` - 20 edges
9. `cn()` - 20 edges
10. `Workspace` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `Use Components, Not Custom Markup → [composition.md](./rules/composition.md)` --references--> `Badge()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → frontend/src/components/ui/badge.tsx
- `Option sets (2–7 choices) use ToggleGroup` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/forms.md → frontend/src/components/ui/button.tsx
- `No sizing classes on icons inside components` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/icons.md → frontend/src/components/ui/button.tsx
- `Icons → [icons.md](./rules/icons.md)` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → frontend/src/components/ui/button.tsx

## Import Cycles
- None detected.

## Communities (66 total, 9 thin omitted)

### Community 1 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 2 - "services.py"
Cohesion: 0.05
Nodes (62): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+54 more)

### Community 3 - "send_email"
Cohesion: 0.22
Nodes (5): send_email(), _send_smtp(), send_password_reset_email_task(), send_verification_email_task(), send_workspace_invite_email_task()

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
Cohesion: 0.11
Nodes (17): eslintConfig, name, private, version, cn, eslint, eslint-config-next, react-dom (+9 more)

### Community 9 - "models.py"
Cohesion: 0.16
Nodes (5): Base, MemberPermissionOverride, Permission, RolePermission, run_migrations_offline()

### Community 10 - "AuthRepository"
Cohesion: 0.13
Nodes (3): Role, WorkspaceMember, AuthRepository

### Community 11 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 12 - "settings/page.tsx"
Cohesion: 0.13
Nodes (20): AccountSettingsPage(), DashboardWorkspacesPage(), EnrichedWorkspace, getUserInitials(), getWorkspaceInitials(), WorkspaceLayout(), formatExpiresDate(), INDUSTRY_OPTIONS (+12 more)

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
Cohesion: 0.15
Nodes (3): register_error_handlers(), close_db_engine(), lifespan()

### Community 18 - "next"
Cohesion: 0.12
Nodes (17): nextConfig, ForgotPasswordFormData, forgotPasswordSchema, InvitePage(), JoinFormData, joinSchema, LoginFormData, LoginPage() (+9 more)

### Community 20 - "DESIGN.md"
Cohesion: 0.14
Nodes (13): Ambient Canvas Specification, Brand & Style, Buttons, Cards & Auth Containers, Chips & Badges, Colors, Components, Elevation & Depth (+5 more)

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
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @tailwindcss/turbopack, @types/node, @types/react (+2 more)

### Community 26 - "Backend Conventions"
Cohesion: 0.12
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 27 - "shadcn/SKILL.md"
Cohesion: 0.22
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 28 - "auth.repository.ts"
Cohesion: 0.15
Nodes (24): AcceptInviteRequest, ChangePasswordRequest, DeleteAccountRequest, ForgotPasswordRequest, InviteJoinRequest, InvitePublicInfoRead, MemberRoleUpdateRequest, MessageResponse (+16 more)

### Community 29 - "badge.tsx"
Cohesion: 0.33
Nodes (5): Badge(), BadgeProps, badgeVariants, @base-ui/react, class-variance-authority

### Community 31 - "client.ts"
Cohesion: 0.47
Nodes (4): Anti-Defensive Programming & Full-Stack Alignment, apiClient(), ApiClientError, RequestOptions

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "conftest.py"
Cohesion: 0.06
Nodes (25): close_redis(), create_access_token(), create_email_verification_token(), create_password_reset_token(), create_refresh_token(), decode_token(), verify_password(), do_run_migrations() (+17 more)

### Community 35 - "health.py"
Cohesion: 0.14
Nodes (3): health_check(), HealthResponse, Page

### Community 36 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 37 - "auth-layout.tsx"
Cohesion: 0.20
Nodes (12): Layer Direction, Component Sizing & Locality of Behavior, Component Sizing, Colocation & Anti-Fragmentation Rules, metadata, RootAuthLayout(), RootHomePage(), AmbientBackground(), AmbientBackgroundProps, AuthFooter() (+4 more)

### Community 38 - "lucide-react"
Cohesion: 0.25
Nodes (9): DashboardLayout(), getUserInitials(), AuthHeaderProps, DashboardSidebar(), DashboardSidebarProps, useTheme(), emptySubscribe(), ThemeToggle() (+1 more)

### Community 39 - "theme-provider.tsx"
Cohesion: 0.21
Nodes (10): caveat, metadata, RootLayout(), getStoredTheme(), subscribeToTheme(), Theme, ThemeContext, ThemeContextType (+2 more)

### Community 40 - "AuditLog"
Cohesion: 0.23
Nodes (5): NotFoundError, ValidationError, AuditLog, WorkspaceInvite, test_workspace_invite_and_acceptance_lifecycle()

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 42 - "Frontend Conventions"
Cohesion: 0.29
Nodes (7): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Design System & Anti-AI-Slop Rules (Always Enforced), Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards

### Community 43 - "UUID"
Cohesion: 0.23
Nodes (3): ForbiddenError, get_current_admin(), test_effective_permissions_formula()

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 45 - "sqlalchemy"
Cohesion: 0.20
Nodes (4): upgrade(), upgrade(), downgrade(), upgrade()

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 47 - "create-workspace-form.tsx"
Cohesion: 0.18
Nodes (9): CreateWorkspacePage(), VerificationStatus, VerifyEmailPage(), CreateWorkspaceForm(), CreateWorkspaceFormProps, INDUSTRY_PRESETS, WorkspaceCreateFormData, workspaceCreateSchema (+1 more)

### Community 48 - "AuthService"
Cohesion: 0.16
Nodes (5): AuthenticationError, revoke_token(), hash_password(), User, AuthService

### Community 49 - "Critical Rules"
Cohesion: 0.33
Nodes (6): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Critical Rules, Icons → [icons.md](./rules/icons.md), Styling & Tailwind → [styling.md](./rules/styling.md), Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

### Community 50 - "Workspace"
Cohesion: 0.23
Nodes (4): Workspace, test_custom_roles_crud_and_validation(), test_endpoint_permission_guard(), test_workspace_creation_atomicity()

### Community 51 - "react"
Cohesion: 0.29
Nodes (8): RegisterFormData, RegisterPage(), registerSchema, ScoreDriverShowcase(), Button(), ButtonProps, buttonVariants, react

### Community 53 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @base-ui/react, class-variance-authority, clsx, cn, geist, @hookform/resolvers, lucide-react (+10 more)

### Community 55 - "auth/dependencies.py"
Cohesion: 0.09
Nodes (7): get_redis(), is_token_revoked(), get_auth_service(), get_current_user(), get_token_payload(), require_permission(), _permission_dependency()

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 57 - "render_email_template"
Cohesion: 0.22
Nodes (6): get_jinja_env(), render_email_template(), test_render_reset_password_template(), test_render_template_not_found(), test_render_verify_email_template(), test_render_workspace_invite_template()

### Community 59 - "Input"
Cohesion: 0.27
Nodes (10): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup (+2 more)

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.10
Nodes (18): 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme), 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`), 3.2 System Status Tokens (System Messages ONLY), 3.3 Data Direction Tokens (Score Drivers & Sentiment), 3. The Color Token System, 4. Dark Mode & Appearance Architecture, 4. Typography Standards (+10 more)

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 534 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `shadcn/ui` to `Input`, `react`, `badge.tsx`, `cn`?**
  _High betweenness centrality (0.298) - this node is a cross-community bridge._
- **Are the 46 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 46 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05186880244088482 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `shadcn/ui` to `session.py`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `AuthRepository` (e.g. with `AuditLog` and `MemberPermissionOverride`) actually correct?**
  _`AuthRepository` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `Group B: Dynamic RBAC, Invites & Audit Logging` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._