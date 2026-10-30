FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app:$PYTHONPATH"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.5.21 /uv /uvx /bin/

# Copy dependency specifications first to leverage Docker layer caching
COPY pyproject.toml ./

# Install production dependencies and dev tooling into virtualenv
RUN uv venv /app/.venv && \
    uv pip install --no-cache -r pyproject.toml --extra-index-url https://pypi.org/simple && \
    uv pip install --no-cache ruff pyright pytest pytest-asyncio

# Copy application source code and test files
COPY app ./app
COPY tests ./tests

# Run container as a non-privileged user
RUN groupadd -r -g 1001 appuser && \
    useradd -r -u 1001 -g appuser -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
