# Frontend Workflow

Scope: `frontend/`. Read before developing or testing frontend features.

## Setup
- Node.js 20+ required.
- Env file: copy `frontend/.env.example` to `frontend/.env.local`.
- Start local dev server: `npm run dev` (runs at `http://localhost:3000`).

## Check Cycle (Run in this order)
1. Typecheck: `npx tsc --noEmit`
2. Lint: `npm run lint`
3. Build: `npm run build`

## Working with the Backend
- Ensure the FastAPI backend is running via Docker Compose (`cd backend && docker compose up -d`).
- The backend API is reachable at `http://localhost:8000/api/v1`.
- Fast feedback: inspect API responses via Swagger UI at `http://localhost:8000/docs`.

## Definition of Done
- Typecheck (`npx tsc --noEmit`) passes with 0 errors.
- ESLint (`npm run lint`) passes with 0 errors.
- Build (`npm run build`) completes successfully without SSR or hydration errors.
- Empty states, loading skeletons, and error toasts are provided for every async UI screen.
- Code is updated in the knowledge graph: `graphify update .`.

