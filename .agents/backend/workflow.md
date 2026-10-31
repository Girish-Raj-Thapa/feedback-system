# Backend Workflow

Scope: `backend/`. Everything runs in Docker Compose. Run commands from `backend/` (where `docker-compose.yml` lives).
Compose service names (use these in commands): `api`, `worker`, `db`, `redis`. Container names: `feedback_api`, `feedback_worker`, `feedback_db`, `feedback_redis` (use only with plain `docker` commands).

## Setup
- Env: copy `.env.example` to `.env`. Never commit `.env` or print its values.
- Start everything: `docker compose up -d --build`
- Status/logs: `docker compose ps`, `docker compose logs -f api worker`
- Docs: `/docs` on the API port when running.

## Running commands
Run all project tools inside the API container, never on the host:
`docker compose exec api <command>`
Tools are on PATH in the image.

- Code changes: the API reloads automatically via the bind mount. The worker does not; restart it with `docker compose restart worker`.
- Dependency changes: `docker compose exec api uv add <pkg>` (or `uv remove`), then `docker compose up -d --build`. Why: the image bakes in dependencies, so a rebuild is required.
- Dockerfile or compose changes: rebuild with `docker compose up -d --build`.

## Check (run in this order)
1. Format: `docker compose exec api ruff format .`
2. Lint: `docker compose exec api ruff check . --fix`
3. Types: `docker compose exec api pyright`
4. Tests: `docker compose exec api pytest`
5. Knowledge Graph: `graphify update .` (run from project root after backend code edits)

Run the narrowest tests first (`docker compose exec api pytest tests/<feature>`), then the full suite before finishing. Why: faster feedback, and the full run catches cross-feature breakage.

## Tests
- Layout mirrors `app/`: tests for `app/features/<feature>/` live in `tests/<feature>/`.
- Test services directly for business rules; use API-level tests for routing, auth and response shape.
- Tests use a separate database (own DB name) in the same Postgres container. Never point tests at the dev database.
- Mock only external systems (email, payments, storage, third-party APIs). Do not mock the database or your own services.
- Every bug fix gets a regression test that fails without the fix.

## Migrations
1. Change the ORM model.
2. Generate: `docker compose exec api alembic revision --autogenerate -m "<short_description>"`
3. Read the generated file. Autogenerate misses renames, enum changes, server defaults and data changes. Fix by hand.
4. Apply: `docker compose exec api alembic upgrade head`
5. Confirm a single head: `docker compose exec api alembic heads`

- Every migration needs a working `downgrade`, or a comment explaining why it can't be reversed.
- Data changes go in a separate migration from schema changes.

## Definition of done
- Format, lint, types and tests pass, and you read the actual output.
- New behavior has tests; changed behavior has updated tests.
- Schema changes have a reviewed migration and a single Alembic head.
- New features are registered in `app/api/v1/router.py` and follow `architecture.md`.
- Worker restarted and still starts cleanly if you changed tasks or worker config.
- No debug code, `print`, commented-out code or unrelated edits in the diff.
- `.agents/` docs updated if a rule or structure changed.

## Working rules
- Read the closest existing feature before writing new code, and match it.
- Keep changes scoped. Mention unrelated problems instead of fixing them.
- Fix the cause of a failing check. Never silence it with `# type: ignore`, `# noqa` or skipped tests without a justifying comment.
- If you can't run something (container down, no Docker access), say so. Never claim a check passed that you didn't run.

## Boundaries

### Never touch
- `.env` and any secrets or credential files (read `.env.example` instead).
- Applied migration files in `migrations/versions/`.
- Runtime and generated data: `logs/`, `media/` (uploads), `__pycache__/`, `.venv/`, `uv.lock` (change it only through `uv add`/`uv remove`).
- Production or staging configs and any compose file other than the local dev one.

### Never run
- `docker compose down -v`, `docker volume rm`, `docker system prune`. Why: they delete the database volume and all local data.
- `alembic downgrade`, `DROP`/`TRUNCATE`, or any bulk delete, without explicit approval.
- Migrations, seeds, or scripts against anything other than the local compose database. Hand the command to the human instead.
- `redis-cli FLUSHALL` / `FLUSHDB`, `rm -rf`, `chmod -R`, `sudo`.
- `git commit`, `git push`, `git reset --hard`, or PR creation unless asked.
- Commands that expose secrets (`printenv`, `cat .env`, `docker compose config` with resolved env values).

### Ask the human first
- Adding or upgrading dependencies.
- Editing `Dockerfile`, `docker-compose.yml`, CI config, or exposed ports.
- Changing auth, permissions, or security logic.
- Destructive or irreversible schema changes (dropping or renaming columns/tables, type changes that lose data).
- Adding a top-level folder under `app/`.
- Anything that sends real email, payments or third-party requests outside mocks.

### Never do in code
- Hardcode secrets, URLs or credentials.
- Weaken or delete a test to make it pass. If the test is wrong, say so and explain.
- Disable auth, validation or security middleware, even temporarily.