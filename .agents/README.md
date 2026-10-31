# Agent Docs Index

Documentation is tool-neutral, structured by area, and designed so any autonomous AI coding agent can immediately understand architecture, rules, and workflows without scanning the entire codebase.

## Knowledge Graph (Graphify)
The codebase is fully indexed into a persistent knowledge graph in `graphify-out/`:
- **Query the codebase:** `graphify query "<question>"` (BFS semantic traversal)
- **Trace connections:** `graphify path "<SymbolA>" "<SymbolB>"`
- **Explain concepts:** `graphify explain "<Symbol>"`
- **Update after code changes:** `graphify update .` (fast, no API cost)
- **Visual report:** `graphify-out/graph.html` and `graphify-out/GRAPH_REPORT.md`

## Specifications & Schemas (The Source of Truth)
- `system.md` — Product Specification: Customer Feedback & Decision Insights SaaS (V1).
- `blueprint.md` — Master System Blueprint: VoC category definitions, pillars, and scope guardrails.
- `schema.md` — Master Database Schema: PostgreSQL tables, columns, constraints, and indexes.

## Always Read First (Per Area)
| Working in | Read |
|---|---|
| `backend/` | `backend/architecture.md`, then `backend/conventions.md` |
| `frontend/` | `frontend/architecture.md`, `frontend/conventions.md`, then `frontend/design-system.md` |

## Task-Specific Guides & Skills
| Task | Read |
|---|---|
| Backend Running, testing, linting, Docker, migrations | `backend/workflow.md` |
| Frontend Running, testing, linting, building | `frontend/workflow.md` |
| Frontend Design System, Apple-density & Token Rules | `frontend/design-system.md` + `design.md` |
| Adding or changing a backend API endpoint | `backend/architecture.md` + `.agents/skills/add-endpoint/SKILL.md` |
| Frontend UI/UX, accessibility & design standards | `.agents/skills/web-design-guidelines/SKILL.md` |
| Frontend Component architecture & Radix/Tailwind rules | `.agents/skills/shadcn/SKILL.md` |
| Deleting or touching data, secrets, configs, or anything risky | `backend/workflow.md` → Boundaries |
| Adding a backend feature or module | `backend/architecture.md` → Feature contract |
| Cross-feature dependencies | `backend/architecture.md` → Cross-feature rules |
| Database schema change & Alembic | `backend/workflow.md` → Migrations |
| Background tasks & Email delivery | `backend/architecture.md` → Auth, IAM & RBAC Mechanics |

## Invariants & Rules
1. **Zero-Fallback Policy**: Never add fallback defaults for critical environment variables in `app/core/config.py`. All environment variables must be defined in `.env` and documented in `.env.example`.
2. **One Feature at a Time**: Complete vertical feature slices end-to-end with tests and migrations before proceeding to the next.
3. **Frontend Layer-Based Architecture**: In `frontend/src/`, strictly maintain layers (`app/`, `components/`, `middleware/`, `plugins/`, `repositories/`, `store/`, `utils/`, `types/`). UI components never make raw `fetch()` calls—they call typed repositories.
4. **Anti-AI-Slop & Accessibility Standards**: No generic purple gradients, no floating blobs, no arbitrary colors. Comply strictly with Vercel Web Interface Guidelines and Shadcn UI conventions.
5. **No Domain Separation for Auth**: Workspaces, Roles, Members, Overrides, Invites, and Audit Logs live together in `app/features/auth/`.
6. **Maintenance**: If a doc passes ~150 lines, split it. Keep docs tightly synchronized with the code.
