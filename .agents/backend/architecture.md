# Backend Architecture

Scope: `backend/`. Read before creating or changing backend code.

## Stack
- Python 3.12, FastAPI, Pydantic v2
- SQLAlchemy 2.x async, asyncpg, Alembic
- Background jobs & tasks: Taskiq + Redis
- Dependency management: uv
- Entry point: `app/main.py` (lifespan, global middlewares, central error handling, unversioned health probes, `/api/v1` router mount)

## Layout
```
app/
├── api/            # API router aggregating feature routers (app/api/v1/router.py)
├── core/           # Infrastructure: config, security (JWT, Argon2, Fernet encryption), logging, errors, redis, email, tasks
├── db/             # Engine, session factory, declarative base, model registry (app/db/models.py)
└── features/  # One folder per vertical domain slice; all business logic lives here
    ├── auth/           # Identity, Users, Workspaces, Roles, Permissions, Invites, Audit Logs
    ├── feedback/       # Categories, Forms, Public Forms, Submissions, Insights, Decision Logs, Alert Rules, Presets, Tasks
    └── notifications/  # Outbound Connections, Providers (Slack), Durable Outbox, Deliveries, OAuth, Tasks
migrations/    # Alembic database migrations
tests/         # Automated pytest suite (mirrors app/)
```

## Principles
- **Vertical Feature Slices**: Organize code under `app/features/<feature>/`. Never add top-level `routers/`, `services/`, or `models/` folders.
- **Strict Decoupling**: `core/` and `db/` must never import from `features/`. Domain concepts belong strictly inside features.
- **Unified Auth & Multi-Tenant IAM**: Workspaces, Roles, Workspace Members, Permission Overrides, Workspace Invites, and Audit Logs live together inside `app/features/auth/`. Do not create a separate `workspaces/` feature.

## Feature Contract
Every feature follows an identical layered structure:

| File | Purpose | Forbidden |
|---|---|---|
| `router.py` | Parse HTTP requests, validate input via dependencies, call service, return schemas | Business logic, raw SQL, direct commits/rollbacks |
| `schemas.py` | Pydantic request & response models | Expose DB secrets (hashes, raw keys), execute queries |
| `services.py` | Business logic, permissions enforcement, transaction orchestration | Import HTTP types (`Request`, `HTTPException`, status codes) |
| `repositories.py` | All SQLAlchemy queries and persistence for this feature | Commit/rollback, business logic |
| `models.py` | SQLAlchemy ORM declarative models | Import models across features (use string foreign keys) |
| `dependencies.py` | FastAPI `Depends` providers and typed aliases | Business logic |
| `tasks.py` | Taskiq background job definitions | Long-running inline execution; delegate to services |

## Call Direction
`router → service → repository → model`. Each layer calls only the one below it:
- Routers never call repositories directly.
- Repositories never call services.
- Repositories take only an `AsyncSession` and flush; only services invoke `session.commit()` or `session.rollback()`.

```python
class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AuthRepository(session)
```

## Configuration & Environment Rules (Zero-Fallback Policy)
- Settings live strictly in `app/core/config.py` using `pydantic-settings`.
- **Zero Fallbacks**: Critical infrastructure and security variables (`ENVIRONMENT`, `FRONTEND_URL`, `PUBLIC_FEEDBACK_URL`, `CORS_ORIGINS`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `SMTP_HOST`, `SMTP_PORT`, `EMAILS_FROM_EMAIL`, `EMAILS_FROM_NAME`) MUST use `Field(...)` without fallback defaults.
- Missing configuration must cause a fatal `ValidationError` on startup to prevent silent fallback vulnerabilities.
- `docker-compose.yml` mounts `./.env:/app/.env:ro` and injects via `env_file: - .env`.

## Auth, IAM & RBAC Mechanics
- **User Model**: Lean identity model. Password stored as Argon2 hash in `password`. Soft-deletable via `deleted_at`. Lowercase partial unique index on `email` (`WHERE deleted_at IS NULL`). No hardcoded `avatar_url`.
- **Multi-Tenant Workspaces**: Initialized with 4 atomic system roles (`Owner`, `Admin`, `Editor`, `Viewer`). The creator is assigned as `Owner`.
- **Effective Permission Resolution**:
  $$\text{Effective Permissions}(M) = \Big(\text{Role Permissions} \cup \text{Granted Overrides}\Big) \setminus \text{Revoked Overrides}$$
  Superusers (`is_superuser=True`) bypass all permission checks.
- **Cache & Invalidation**: Effective permissions are cached in Redis (`auth:perms:{workspace_id}:{user_id}`) with a 15-minute TTL, automatically invalidated on role update or override change.
- **Protected Endpoints**: Protected via `require_permission("<permission_id>")`, which extracts `workspace_id` from `request.path_params` or the `x-workspace-id` header.
- **Workspace Invites**: Tokens generated via `secrets.token_urlsafe(32)`; SHA-256 hash stored in `workspace_invites`. Invites send real emails via Taskiq. When accepted via `POST /api/v1/auth/invites/join`, a new user account is created with `is_verified=True` and authenticated immediately.

## Database & Data Modeling Standards
- **Primary Keys**: Always `UUID` (v4).
- **Timestamps**: Always timezone-aware UTC (`DateTime(timezone=True)`).
- **Soft Delete**: Core entities (`workspaces`, `users`, `forms`, `theme_buckets`) use `deleted_at: DateTime(timezone=True) | None` and partial unique indexes:
  `CREATE UNIQUE INDEX ... ON table(LOWER(column)) WHERE deleted_at IS NULL;`
- **Cascade Rules**:
  - `ON DELETE CASCADE` from `workspaces` for GDPR tenant deletion.
  - `ON DELETE RESTRICT` on soft-deletable relationships (e.g. `forms` on `submissions`, `roles` on `workspace_members`) to prevent accidental cascade drops.
- **Point-in-Time Snapshots**: Submissions and historical analytics snapshot customer tier, spend, and attributes directly rather than relying on mutable current customer state.

## LLM Abstraction Layer
- All AI workflows (feedback sentiment classification, topic suggestion, synthesis) must go through the abstract factory layer in `app/core/llm/`.
- Swappable via `LLM_PROVIDER` (`gemini`, `openai`, `mock`). Never import raw AI provider SDKs directly in features.

## Feature Roadmap & Status
| Feature Slice | Scope | Status |
|---|---|---|
| `auth/` | Users, Workspaces, Roles, Permissions, Overrides, Invites, Audit Logs | **Complete** (`api_keys` table & ingestion token auth Planned) |
| `feedback/` (`categories`, `forms`, `public_forms`, `submissions`, `insights`, `decision_logs`, `alerts`) | Locked Theme Categories, Forms/Embed/Presets, HMAC Replay + Turnstile + Heuristics, Triage + `spam`/`quarantined` Isolation + Filtered CSV Export + CSV/Paste Import (`alert_evaluated_at` backfill-safe) + Sample Data, Segment-Filtered Insights (`form_id`, `source`, `page_url`, `plan_tier`) + Score Drivers, 30d Decision Logs, Alert Rules | **Core Complete** (LLM classification/topic discovery, `workspace_customers`, and daily rollup tables Planned) |
| `notifications/` | `NotificationConnection` (encrypted URLs/tokens), `OutboundDelivery` + `DeliveryAttempt` (`FOR UPDATE SKIP LOCKED` outbox), Slack Webhooks + 1-Click OAuth v2, immediate 404/410 revocation, `TaskiqScheduler` cron sweeps & 30d attempt pruning | **Slack Complete** (Discord/Generic JSON webhooks and theme filtering Planned) |
| `billing/` | Plan Tiers, Stripe/Paddle Customer, Quota Enforcement | Planned (fields exist on `Workspace`, Stripe env vars defined, checkout/enforcement not wired) |
