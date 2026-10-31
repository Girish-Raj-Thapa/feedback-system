# Graph Report - feedback-system  (2026-10-20)

## Corpus Check
- 86 files · ~38,692 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 6, .example 1, .ini 1)

## Summary
- 932 nodes · 2205 edges · 44 communities (37 shown, 7 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 287 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a357bbb0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.py
- Component Composition
- services.py
- env.py
- Group B: Dynamic RBAC, Invites & Audit Logging
- uuid
- Product Specification: Customer Feedback & Decision Insights SaaS (V1)
- email.py
- get_token_payload
- sqlalchemy
- test_health.py
- auth/dependencies.py
- compilerOptions
- Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)
- Rules
- Backend Architecture
- hash_password
- Permission
- Backend Workflow
- Backend Conventions
- auth.repository.ts
- AuthService
- register_error_handlers
- Add an Endpoint
- conftest.py
- config.py
- User
- components.json
- Agent Docs Index
- Web Interface Guidelines
- models.py
- dependencies
- frontend/AGENTS.md
- frontend/README.md
- invite/page.tsx
- feedback-backend
- Frontend Conventions
- Frontend Architecture
- Frontend Workflow
- session.py
- devDependencies
- src/middleware.ts
- scripts
- frontend/postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `AuthService` - 88 edges
2. `AuthRepository` - 53 edges
3. `User` - 39 edges
4. `Button()` - 24 edges
5. `AuditLog` - 22 edges
6. `Card()` - 22 edges
7. `NotFoundError` - 21 edges
8. `Input()` - 21 edges
9. `cn()` - 21 edges
10. `WorkspaceMember` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Component Selection` --references--> `Pagination`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → backend/app/core/dependencies.py
- `Configuration & Environment Rules (Zero-Fallback Policy)` --references--> `ValidationError`  [INFERRED]
  .agents/backend/architecture.md → backend/app/core/errors.py
- `No sizing classes on icons inside components` --references--> `Button()`  [INFERRED]
  .agents/skills/shadcn/rules/icons.md → frontend/src/components/ui/button.tsx
- `Card structure` --references--> `CardContent()`  [INFERRED]
  .agents/skills/shadcn/rules/composition.md → frontend/src/components/ui/card.tsx
- `Tooling & Standards` --references--> `cn()`  [INFERRED]
  .agents/frontend/conventions.md → frontend/src/utils/cn.ts

## Import Cycles
- None detected.

## Communities (44 total, 7 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.24
Nodes (3): close_redis(), close_db_engine(), lifespan()

### Community 1 - "Component Composition"
Cohesion: 0.04
Nodes (41): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+33 more)

### Community 2 - "services.py"
Cohesion: 0.05
Nodes (62): accept_workspace_invite(), change_password(), create_workspace(), create_workspace_role(), delete_me(), delete_workspace(), delete_workspace_role(), forgot_password() (+54 more)

### Community 3 - "env.py"
Cohesion: 0.22
Nodes (4): do_run_migrations(), run_async_migrations(), run_migrations_offline(), run_migrations_online()

### Community 4 - "Group B: Dynamic RBAC, Invites & Audit Logging"
Cohesion: 0.06
Nodes (33): 10. `audit_logs`, 11. `workspace_customers`, 12. `forms`, 13. `submissions`, 14. `theme_buckets`, 15. `bucket_topic_suggestions`, 16. `decision_logs`, 17. `workspace_daily_stats` (+25 more)

### Community 5 - "uuid"
Cohesion: 0.44
Nodes (6): create_password_reset_token(), test_auth_cookie_session_and_account_deletion(), test_auth_forgot_password_and_resend_verification(), test_auth_logout_denylist(), test_auth_password_lifecycle_and_profile_update(), test_auth_registration_and_login_flow()

### Community 6 - "Product Specification: Customer Feedback & Decision Insights SaaS (V1)"
Cohesion: 0.09
Nodes (21): 1.1 What We Are Building, 1.2 Target Customers, 1.3 Core Value Proposition, 1. Product Overview & Positioning, 2.1 The "Core Signal Trio" (How Custom Forms Produce Clean Analytics), 2.2 Locked-Bucket Taxonomy (No Free-Form Tag Invention), 2. Core System Principles, 3. Core Feature Modules (V1 Scope) (+13 more)

### Community 7 - "email.py"
Cohesion: 0.05
Nodes (18): reset_correlation_id(), reset_user_id(), set_correlation_id(), set_user_id(), get_jinja_env(), render_email_template(), send_email(), _send_smtp() (+10 more)

### Community 8 - "get_token_payload"
Cohesion: 0.20
Nodes (3): get_token_payload(), require_permission(), _permission_dependency()

### Community 9 - "sqlalchemy"
Cohesion: 0.20
Nodes (4): upgrade(), upgrade(), downgrade(), upgrade()

### Community 11 - "auth/dependencies.py"
Cohesion: 0.14
Nodes (6): AuthenticationError, get_redis(), is_token_revoked(), revoke_token(), decode_token(), get_auth_service()

### Community 13 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 14 - "Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)"
Cohesion: 0.11
Nodes (17): 1.1 What This System Is, 1.2 What This System Is NOT (Category Boundaries), 1. Executive Summary & Category Definition, 2. Core Architectural Pillars, 3. V1 Feature Specification (The 5 Core Modules), 4. End-to-End System Workflows, 5. V1 Scope Guardrails (What Not to Build Yet), 6. Recommended Tech Stack & Module Mapping (+9 more)

### Community 15 - "Rules"
Cohesion: 0.10
Nodes (20): Accessibility, Animation, Anti-patterns (flag these), Content & Copy, Content Handling, Dark Mode & Theming, Focus States, Forms (+12 more)

### Community 17 - "Backend Architecture"
Cohesion: 0.17
Nodes (11): Auth, IAM & RBAC Mechanics, Backend Architecture, Call Direction, Configuration & Environment Rules (Zero-Fallback Policy), Database & Data Modeling Standards, Feature Contract, Feature Roadmap & Status, Layout (+3 more)

### Community 18 - "hash_password"
Cohesion: 0.27
Nodes (5): create_access_token(), create_refresh_token(), hash_password(), verify_password(), test_user_tokens()

### Community 22 - "Backend Workflow"
Cohesion: 0.14
Nodes (13): Ask the human first, Backend Workflow, Boundaries, Check (run in this order), Definition of done, Migrations, Never do in code, Never run (+5 more)

### Community 26 - "Backend Conventions"
Cohesion: 0.12
Nodes (12): Backend Conventions, Comments, Database access, Do not, Error handling, Imports and config, Logging, Naming (+4 more)

### Community 28 - "auth.repository.ts"
Cohesion: 0.10
Nodes (29): apiClient(), ApiClientError, RequestOptions, AuthState, useWorkspaceStore, WorkspaceState, AcceptInviteRequest, ChangePasswordRequest (+21 more)

### Community 30 - "AuthService"
Cohesion: 0.06
Nodes (18): AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError, create_email_verification_token(), AuditLog, Role (+10 more)

### Community 32 - "Add an Endpoint"
Cohesion: 0.18
Nodes (10): 0. Orient, 1. Schemas (`schemas.py`), 2. Repository (`repositories.py`), 3. Service (`services.py`), 4. Dependencies, 5. Router (`router.py`), 6. Tests (`tests/<feature>/`), 7. Verify (+2 more)

### Community 33 - "conftest.py"
Cohesion: 0.15
Nodes (8): admin_client(), auth_client(), client(), db_session(), dispose_resources(), test_superuser(), test_user(), test_workspace()

### Community 34 - "config.py"
Cohesion: 0.13
Nodes (3): health_check(), HealthResponse, Page

### Community 40 - "User"
Cohesion: 0.24
Nodes (3): get_current_admin(), get_current_user(), User

### Community 41 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 44 - "Agent Docs Index"
Cohesion: 0.29
Nodes (6): Agent Docs Index, Always Read First (Per Area), Invariants & Rules, Knowledge Graph (Graphify), Specifications & Schemas (The Source of Truth), Task-Specific Guides & Skills

### Community 46 - "Web Interface Guidelines"
Cohesion: 0.40
Nodes (4): Guidelines Source, How It Works, Usage, Web Interface Guidelines

### Community 51 - "models.py"
Cohesion: 0.26
Nodes (3): Base, MemberPermissionOverride, RolePermission

### Community 53 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @base-ui/react, class-variance-authority, clsx, cn, @hookform/resolvers, lucide-react, next (+9 more)

### Community 56 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 59 - "invite/page.tsx"
Cohesion: 0.06
Nodes (89): Design System & Anti-AI-Slop Rules (Always Enforced), Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea (+81 more)

### Community 65 - "Frontend Conventions"
Cohesion: 0.29
Nodes (6): Accessibility & Web Interface Standards (Vercel Guidelines), Architecture & Layer Boundaries, Error Handling & Feedback, Frontend Conventions, Naming Conventions, Tooling & Standards

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 459 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Component Selection` connect `invite/page.tsx` to `Component Composition`, `session.py`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **Are the 46 inferred relationships involving `AuthService` (e.g. with `AuthenticationError` and `ConflictError`) actually correct?**
  _`AuthService` has 46 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedback-backend`, `cn`, `react-dom` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Component Composition` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Why does `Pagination` connect `session.py` to `invite/page.tsx`?**
  _High betweenness centrality (0.275) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `AuthRepository` (e.g. with `AuditLog` and `MemberPermissionOverride`) actually correct?**
  _`AuthRepository` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `services.py` be split into smaller, more focused modules?**
  _Cohesion score 0.052476323552243444 - nodes in this community are weakly interconnected._