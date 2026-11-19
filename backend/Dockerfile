# syntax=docker/dockerfile:1.7

FROM python:3.12-slim-bookworm AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app"

WORKDIR /app

# ---------------------------------------------------------------------------
# Builder: resolve and pre-compile production dependencies from uv.lock
# ---------------------------------------------------------------------------
FROM base AS builder

COPY --from=ghcr.io/astral-sh/uv:0.5.21 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# ---------------------------------------------------------------------------
# Dev target: includes lint/type/test toolchain and tests for local Compose
# ---------------------------------------------------------------------------
FROM base AS dev

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.5.21 /uv /uvx /bin/

ENV UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

RUN groupadd -r -g 1001 appuser && \
    useradd -r -u 1001 -g appuser -d /app -s /sbin/nologin appuser && \
    chown 1001:1001 /app

COPY --from=builder --chown=1001:1001 /app/.venv /app/.venv
COPY --chown=1001:1001 pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project

COPY --chown=1001:1001 app ./app
COPY --chown=1001:1001 tests ./tests
COPY --chown=1001:1001 migrations ./migrations
COPY --chown=1001:1001 alembic.ini ./alembic.ini

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ---------------------------------------------------------------------------
# Prod target (default): minimal non-root runtime, pre-compiled bytecode, no dev tools
# ---------------------------------------------------------------------------
FROM base AS prod

RUN groupadd -r -g 1001 appuser && \
    useradd -r -u 1001 -g appuser -d /app -s /sbin/nologin appuser

COPY --from=builder --chown=1001:1001 /app/.venv /app/.venv
COPY --chown=1001:1001 app ./app
COPY --chown=1001:1001 migrations ./migrations
COPY --chown=1001:1001 alembic.ini ./alembic.ini

USER appuser

RUN python -m compileall -q /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--proxy-headers", "--forwarded-allow-ips", "*", "--timeout-graceful-shutdown", "30"]
