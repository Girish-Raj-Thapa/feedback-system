# Frontend Architecture

Scope: `frontend/`. Read before creating or changing frontend code.

## Stack
- Framework: Next.js 16+ (App Router), React 19, TypeScript
- Styling: Tailwind CSS v4, Lucide React (icons), Sonner (toast notifications)
- Forms & Validation: React Hook Form + Zod + `@hookform/resolvers/zod`
- Component Primitives: Radix UI / Shadcn UI standards (`src/components/ui/`)
- Client State: Zustand (`src/store/`)
- Backend Integration: Layered typed repositories (`src/repositories/`) calling FastAPI (`/api/v1`)

## Layer-Based Structure
The frontend strictly uses a **layer-based architecture** under `src/`:

```
src/
├── app/            # Next.js App Router (pages, nested layouts, route handlers)
│   ├── (auth)/     # Public authentication route group (login, register, verify, invite)
│   ├── (dashboard)/# Authenticated workspace dashboard routes
│   │   └── [workspaceSlug]/
│   │       ├── overview/     # Score Driver metrics, Executive bar, Net Impact
│   │       ├── submissions/  # Feedback triage, customer profiles, filters
│   │       ├── taxonomy/     # Theme buckets, keyword manager, suggested topics
│   │       ├── forms/        # Form builder, widget preview, API keys
│   │       ├── decisions/    # Decision log & impact tracking
│   │       └── settings/     # Workspace settings, members, roles, invites
│   └── f/          # Public customer-facing hosted forms (f/[workspaceSlug]/[formSlug])
├── components/     # UI presentation layer
│   ├── ui/         # Reusable atomic primitives (Button, Input, Card, Badge, Dialog)
│   ├── layout/     # App shell (Sidebar, Navbar, WorkspaceSwitcher, UserDropdown)
│   └── auth/       # Shared Auth components (AuthLayout, AuthHeader, AuthFooter, AmbientBackground, showcases)
├── middleware/     # Route guarding logic & auth interceptors (called by src/proxy.ts)
├── plugins/        # Third-party SDK wrappers & external providers (Paddle, Analytics)
├── repositories/   # Data-access layer: All HTTP API calls to FastAPI backend
│   ├── client.ts   # Base fetch client (credentials: "include", x-workspace-id injection)
│   ├── auth.repository.ts
│   └── workspace.repository.ts
├── store/          # Client-side global state (Zustand)
│   ├── auth.store.ts      # Active user session and state
│   └── workspace.store.ts # Active workspace, list of workspaces, permissions
├── utils/          # Pure helper functions (cn, formatters, dates)
└── types/          # TypeScript interfaces mirroring backend Pydantic schemas
```

## Layer Direction, Component Sizing & Locality of Behavior
1. **`app/` (Pages/Layouts - Locality of Behavior)**:
   - Pages (`page.tsx`) should be **self-contained feature units**. They manage their own validation schemas, state machines, forms, and step/state transitions directly within the same file.
   - **No Premature Component Slicing**: File size is NOT an enemy. A cohesive 150–500+ line file (even up to 3k–4k lines if cohesive) is vastly superior to scattering 4–5 micro-files across directories.
   - **Colocate One-Off Views**: If a view, sub-card, or step is used ONLY on that specific route (e.g. `ForgotPasswordSentCard`, `ResetLinkExpiredCard`), keep it directly inside `page.tsx`. Do NOT create dedicated single-use component files or subfolders just for the sake of breaking code down.
2. **`components/` (Shared Presentation Layer ONLY)**:
   - Only extract to `components/` when:
     a) A component is genuinely **reused across 2+ independent pages** (e.g., `AuthHeader`, `AuthFooter`, `AmbientBackground`, `components/ui/*`).
     b) A component is a massive, self-contained visual showcase (e.g., `ScoreDriverShowcase`, `LoginShowcase`) that would unnecessarily inflate a page file beyond readability.
   - Never extract trivial 20–50 line presentation blocks that are tied to a single route.
   - Never make raw `fetch()` calls. Always invoke typed methods from `repositories/` or access reactive state from `store/`.
3. **`repositories/` (API Access - Strict Full-Stack Alignment)**:
   - Encapsulates all HTTP communication, URL endpoints, query parameters, and error handling with the FastAPI backend.
   - **No Guesswork or Defensive Programming**: We control both FastAPI and Next.js. We know the exact schemas, status codes, and response shapes. Always inspect `backend/app/features/` schemas before coding frontend API interactions.
   - `apiClient` maps backend error responses directly (`{"error": exc.message}`). Propagate backend messages as-is without inventing speculative fallback copy.
4. **`store/` (Client State)**:
   - Uses Zustand for reactive UI state (active workspace, user permissions).
   - Keeps state minimal: server-driven data belongs in repository calls or URL search parameters.

## Authentication & Multi-Tenancy Flow
- **Base API URL**: Configured via `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000/api/v1`).
- **Session Model**:
  - The browser automatically sends the HTTP-Only cookie `ff_session` (and `access_token`) on all repository calls via `credentials: "include"`.
- **Active Workspace Context**:
  - Identified in the URL via `/[workspaceSlug]/...`.
  - The active `workspace_id` is passed to the backend via URL parameters or the `x-workspace-id` HTTP header injected by `src/repositories/client.ts`.
- **Permission Gating**:
  - `workspace.store.ts` tracks user permissions for the current workspace.
  - Buttons and sensitive actions are gated via `hasPermission("<id>")`.

## Public Hosted Forms & Embeddable Widget
- Public feedback routes live at `/f/[workspaceSlug]/[formSlug]`.
- Minimal layout without authenticated dashboard navigation.
- Embed script: Lightweight vanilla JavaScript bundle in `public/widget.js` that mounts an iframe or modal pointing to the hosted form URL.
