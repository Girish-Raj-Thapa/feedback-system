# Graph Report - feedback-system  (2026-10-22)

## Corpus Check
- 91 files · ~44,760 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 7, .example 1, .ini 1)

## Summary
- 1002 nodes · 2295 edges · 43 communities (37 shown, 6 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 290 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a357bbb0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.py
- Component Composition
- auth/router.py
- errors.py
- Group B: Dynamic RBAC, Invites & Audit Logging
- Feedback System: Frontend Design System
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- middleware.py
- auth/dependencies.py
- d4a5b6c7e8f9_create_workspaces_and_rbac_tables.py
- uuid
- services.py
- run_async_migrations
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- email.py
- Backend Architecture
- responses.py
- theme.ts
- Backend Workflow
- theme-provider.tsx
- Backend Conventions
- auth.repository.ts
- AuthService
- Add an Endpoint
- conftest.py
- health_check
- components.json
- Agent Docs Index
- Web Interface Guidelines
- dependencies
- frontend/AGENTS.md
- frontend/README.md
- app/page.tsx
- feedback-backend
- Frontend Design System & UI Specification
- Frontend Architecture
- Frontend Workflow
- devDependencies
- src/middleware.ts
- scripts
- frontend/postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `AuthService` - 88 edges
2. `AuthRepository` - 53 edges
3. `User` - 39 edges
4. `Button()` - 26 edges
5. `AuditLog` - 22 edges
6. `Card()` - 22 edges
7. `NotFoundError` - 21 edges
8. `Input()` - 21 edges
9. `WorkspaceMember` - 20 edges
10. `cn()` - 20 edges

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

## Communities (43 total, 6 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.09
Nodes (4): close_redis(), close_db_engine(), get_session(), lifespan()

### Community 1 - "Component Composition"
Cohesion: 0.04
Nodes (41): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+33 more)

### Community 2 - "auth/router.py"
Cohesion: 0.05
Nodes (61): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+53 more)

### Community 3 - "errors.py"
Cohesion: 0.11
Nodes (6): AppError, ForbiddenError, register_error_handlers(), get_current_admin(), require_permission(), _permission_dependency()

### Community 4 - "Group B: Dynamic RBAC, Invites & Audit Logging"
Cohesion: 0.06
Nodes (33): 10. `audit_logs`, 11. `workspace_customers`, 12. `forms`, 13. `submissions`, 14. `theme_buckets`, 15. `bucket_topic_suggestions`, 16. `decision_logs`, 17. `workspace_daily_stats` (+25 more)

### Community 5 - "Feedback System: Frontend Design System"
Cohesion: 0.07
Nodes (28): 1. How to use this document, 2. Design principles, 3. Surfaces and density, 4.1 What users can change, 4.2 Three token layers, 4.3 Generating a brand scale from one color, 4.4 Contrast guarantees, 4.5 Presets (+20 more)

### Community 6 - "Product Specification: Customer Feedback & Decision Insights SaaS (V1)"
Cohesion: 0.09
Nodes (21): 1.1 What We Are Building, 1.2 Target Customers, 1.3 Core Value Proposition, 1. Product Overview & Positioning, 2.1 The "Core Signal Trio" (How Custom Forms Produce Clean Analytics), 2.2 Locked-Bucket Taxonomy (No Free-Form Tag Invention), 2. Core System Principles, 3. Core Feature Modules (V1 Scope) (+13 more)

### Community 7 - "middleware.py"
Cohesion: 0.15
Nodes (5): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), RequestContextMiddleware

### Community 8 - "auth/dependencies.py"
Cohesion: 0.11
Nodes (7): AuthenticationError, is_token_revoked(), revoke_token(), decode_token(), get_auth_service(), get_current_user(), get_token_payload()

### Community 9 - "d4a5b6c7e8f9_create_workspaces_and_rbac_tables.py"
Cohesion: 0.14
Nodes (4): upgrade(), upgrade(), downgrade(), upgrade()

### Community 10 - "uuid"
Cohesion: 0.24
Nodes (8): create_email_verification_token(), create_password_reset_token(), test_auth_cookie_session_and_account_deletion(), test_auth_forgot_password_and_resend_verification(), test_auth_logout_denylist(), test_auth_password_lifecycle_and_profile_update(), test_auth_registration_and_login_flow(), test_health_check_app()

### Community 12 - "run_async_migrations"
Cohesion: 0.33
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 14 - "Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)"
Cohesion: 0.11
Nodes (17): 1.1 What This System Is, 1.2 What This System Is NOT (Category Boundaries), 1. Executive Summary & Category Definition, 2. Core Architectural Pillars, 3. V1 Feature Specification (The 5 Core Modules), 4. End-to-End System Workflows, 5. V1 Scope Guardrails (What Not to Build Yet), 6. Recommended Tech Stack & Module Mapping (+9 more)

### Community 15 - "Rules"
Cohesion: 0.10
Nodes (20): Accessibility, Animation, Anti-patterns (flag these), Content & Copy, Content Handling, Dark Mode & Theming, Focus States, Forms (+12 more)

### Community 16 - "email.py"
Cohesion: 0.08
Nodes (13): get_jinja_env(), render_email_template(), send_email(), _send_smtp(), get_logger(), setup_logging(), send_password_reset_email_task(), send_verification_email_task() (+5 more)

### Community 17 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 21 - "theme.ts"
Cohesion: 0.32
Nodes (7): ColorPreset, DEFAULT_THEME_PRESET, generateBrandScale(), hexToOklch(), OKLCH, sRgbToLinear(), THEME_PRESETS

### Community 22 - "Backend Workflow"
Cohesion: 0.14
Nodes (13): Ask the human first, Backend Workflow, Boundaries, Check (run in this order), Definition of done, Migrations, Never do in code, Never run (+5 more)

### Community 24 - "theme-provider.tsx"
Cohesion: 0.23
Nodes (9): metadata, RootLayout(), getStoredTheme(), subscribeToTheme(), Theme, ThemeContext, ThemeContextType, ThemeProvider() (+1 more)

### Community 26 - "Backend Conventions"
Cohesion: 0.12
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.10
Nodes (29): apiClient(), ApiClientError, RequestOptions, AuthState, useWorkspaceStore, WorkspaceState, AcceptInviteRequest, ChangePasswordRequest (+21 more)

### Community 30 - "AuthService"
Cohesion: 0.06
Nodes (23): ConflictError, NotFoundError, ValidationError, Base, AuditLog, MemberPermissionOverride, Permission, Role (+15 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "conftest.py"
Cohesion: 0.12
Nodes (12): create_access_token(), create_refresh_token(), hash_password(), verify_password(), admin_client(), auth_client(), client(), db_session() (+4 more)

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 53 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @base-ui/react, class-variance-authority, clsx, cn, geist, @hookform/resolvers, lucide-react (+10 more)

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 59 - "app/page.tsx"
Cohesion: 0.06
Nodes (94): Design System & Anti-AI-Slop Rules (Always Enforced), Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea (+86 more)

### Community 65 - "Frontend Design System & UI Specification"
Cohesion: 0.08
Nodes (24): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards, 1. Core Design Principles, 2. Surfaces & Neutral Balance (Apple Design Theme) (+16 more)

### Community 70 - "Frontend Architecture"
Cohesion: 0.29
Nodes (6): Authentication & Multi-Tenancy Flow, Frontend Architecture, Layer-Based Structure, Layer Direction & Isolation, Public Hosted Forms & Embeddable Widget, Stack

### Community 71 - "Frontend Workflow"
Cohesion: 0.33
Nodes (5): Check Cycle (Run in this order), Definition of Done, Frontend Workflow, Setup, Working with the Backend

### Community 78 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @tailwindcss/turbopack, @types/node, @types/react (+2 more)

### Community 82 - "src/middleware.ts"
Cohesion: 0.47
Nodes (4): handleAuthRouting(), PUBLIC_PATHS, config, middleware()

### Community 83 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **12 isolated node(s):** `feedback-backend`, `cn`, `react-dom`, `shadcn`, `tw-animate-css` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 504 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `app/page.tsx` to `Component Composition`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Are the 46 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 46 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09475806451612903 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `app/page.tsx` to `main.py`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `AuthRepository` (e.g. with `AuditLog` and `MemberPermissionOverride`) actually correct?**
  _`AuthRepository` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `Component Composition` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._