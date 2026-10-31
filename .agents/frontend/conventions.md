# Frontend Conventions

Scope: `frontend/`. Read before writing or changing frontend components, pages, repositories, or stores.

## Tooling & Standards
- Language: TypeScript 5.x strictly typed (no `any`).
- Framework: Next.js 16+ App Router, React 19.
- Styling: Tailwind CSS v4 with `tailwind-merge` and `clsx` (`cn` utility).
- Typography: Geist Sans & Geist Mono via `geist` package with `tabular-nums` for numbers.
- Design System: Strictly follow [`.agents/frontend/design-system.md`](./design-system.md) and [`design.md`](file:///Volumes/GIRISH/Programming/feedback-system/design.md).
- Component Standards: Follow `.agents/skills/shadcn/` and `.agents/skills/web-design-guidelines/`.

## Naming Conventions
- Components: `PascalCase` (e.g. `WorkspaceSwitcher.tsx`, `SubmissionRow.tsx`).
- Repositories: `<name>.repository.ts` in `src/repositories/`.
- Stores: `<name>.store.ts` in `src/store/`.
- Utilities: `kebab-case.ts` in `src/utils/` (e.g. `cn.ts`).
- App Router: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.

## Architecture & Layer Boundaries
- **No Direct Fetching in UI**: Components must NEVER make raw `fetch()` calls or hardcode API endpoints. Always call typed methods in `src/repositories/` (e.g. `authRepository.login(payload)`).
- **Client State**: Global client state belongs in `src/store/` using Zustand. Server data flows via repositories.
- **Server Components by Default**: Fetch initial data and render static layouts on the server.
- **Client Components (`"use client"`)**: Used only for user interaction (forms, dropdowns, dialogs, local UI state). Push client boundaries to leaf nodes.

## Component Sizing, Colocation & Anti-Fragmentation Rules
1. **Locality of Behavior First**:
   - Write self-contained routes in `app/**/page.tsx`. Keep validation schemas, step transitions, local state, and form cards in the page file.
   - File size is not a metric to optimize for: 150 to 500+ lines (and up to 3k–4k if cohesive) is completely normal and preferred over splitting files artificially.
2. **Never Create One-Off Micro-Components**:
   - If a view, card, or modal is used ONLY on that route (e.g., `VerificationSentCard`, `ResetLinkExpiredCard`), keep it directly inside `page.tsx`.
   - Only extract to `components/` when the component is genuinely shared across 2+ independent routes (e.g., `AuthHeader`, `AuthFooter`, `AmbientBackground`) or is an atomic UI primitive (`components/ui/*`).
3. **No Overengineering or Arbitrary Abstractions**:
   - Use standard Next.js conventions (`layout.tsx`, `page.tsx`). Never invent custom wrappers or intermediate abstractions (like `AuthShell`) when standard layout patterns exist.

## Anti-Defensive Programming & Full-Stack Alignment
Because we control both the FastAPI backend (`backend/app/`) and Next.js frontend (`frontend/src/`):
1. **Never Guess API Contracts**: Always inspect `backend/app/features/<feature>/schemas.py` and `router.py`. Request payloads and response models are exact.
2. **No Fallback Error Strings**:
   - Do NOT write speculative error fallbacks like `err.message || "Failed to process request. Please try again."`.
   - FastAPI standardizes all error responses as `{"error": exc.message}`. `apiClient` maps this directly into `(err as Error).message`. Display `(err as Error).message` directly.
3. **Use Explicit HTTP Status Codes (No Substring Matching)**:
   - Do NOT inspect error strings (e.g. `message.includes("expired")`).
   - Use explicit HTTP status codes on `ApiClientError` (e.g. `err instanceof ApiClientError && (err.status === 401 || err.status === 404)`).

## Design System & Anti-AI-Slop Rules (Always Enforced)
To maintain a high-density, professional B2B SaaS aesthetic (Linear/Vercel standard):
1. **NO Generic AI Gradients**: Never default to `bg-gradient-to-r from-purple-500 to-indigo-600`. Use solid contrast and subtle neutral tones.
2. **NO Floating Glow Blobs**: Do not add random `blur-3xl` ambient circles behind cards.
3. **NO Arbitrary Colors**: Use semantic design tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`). Never use hardcoded hex values or raw `text-blue-500`.
4. **NO Custom Styled Divs**: Use official primitives from `@/components/ui/` (`Button`, `Card`, `Badge`, `Dialog`, `Input`).
5. **Layouts**: Use `flex` with `gap-*`. Never use `space-x-*` or `space-y-*` (deprecated).
6. **Sizing**: Use `size-*` when width and height are equal (e.g. `size-8` not `w-8 h-8`).
7. **Numbers & Metrics**: Always apply `font-variant-numeric: tabular-nums` (`tabular-nums`) to dates, scores, currency, and count columns.

## Accessibility & Web Interface Standards (Vercel Guidelines)
- **Focus Rings**: Never use `outline-none` without `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- **Buttons vs Links**: `<button>` for actions; `<Link>` or `<a>` for URL navigation. Never `<div onClick>`.
- **Icon Buttons**: Every icon-only button MUST have an explicit `aria-label`.
- **Form Controls**: Every input must have a linked `<label htmlFor="...">`, proper `type`, `autocomplete`, and must never block paste.
- **Interactive Feedback**: All interactive elements must define distinct `hover:` and `active:` states.
- **Text Truncation**: Flex containers with truncated text must have `min-w-0` on children to allow text ellipsis.

## Error Handling & Feedback
- Centralize feedback using `sonner` toasts:
  ```tsx
  try {
    await workspaceRepository.createInvite(workspaceId, payload);
    toast.success("Invitation sent successfully");
  } catch (err: any) {
    toast.error(err.message || "Failed to send invitation");
  }
  ```
- Inline field errors must appear directly next to the input using `aria-invalid` and `role="alert"`.
