"""
Pytest configuration and global fixtures for API testing, IAM RBAC verification,
and strict side-effect isolation (isolated DB, Redis /15, Taskiq, SMTP, HTTP).
"""

import asyncio
import os
import smtplib
import sys
import uuid
from collections.abc import AsyncGenerator, Generator
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from dotenv import dotenv_values

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _load_env_defaults() -> None:
    """Populate missing env keys from .env before rewriting test targets."""
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        return
    for key, value in dotenv_values(env_path).items():
        if value is not None and key not in os.environ:
            os.environ[key] = value


def _derive_test_database_url(raw_url: str) -> str:
    explicit = os.environ.get("TEST_DATABASE_URL", "").strip()
    if explicit:
        return explicit
    parts = urlsplit(raw_url)
    db_name = parts.path.lstrip("/")
    if db_name.endswith("_test"):
        return raw_url
    return urlunsplit(
        (parts.scheme, parts.netloc, "/feedback_test", parts.query, parts.fragment)
    )


def _derive_test_redis_url(raw_url: str) -> str:
    explicit = os.environ.get("TEST_REDIS_URL", "").strip()
    if explicit:
        return explicit
    parts = urlsplit(raw_url)
    return urlunsplit((parts.scheme, parts.netloc, "/15", parts.query, parts.fragment))


def _configure_isolated_test_env() -> None:
    """Force isolated DB, Redis DB /15, mock LLM, and dummy SMTP before app import."""
    _load_env_defaults()

    base_db = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5433/feedback_dev",
    )
    base_redis = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    os.environ["ENVIRONMENT"] = "test"
    os.environ["DATABASE_URL"] = _derive_test_database_url(base_db)
    os.environ["REDIS_URL"] = _derive_test_redis_url(base_redis)
    os.environ["LLM_PROVIDER"] = "mock"
    os.environ["TURNSTILE_SECRET_KEY"] = ""
    os.environ["SMTP_HOST"] = "127.0.0.1"
    os.environ["SMTP_PORT"] = "0"
    os.environ["SMTP_USER"] = ""
    os.environ["SMTP_PASSWORD"] = ""


_configure_isolated_test_env()

import asyncpg  # noqa: E402
import httpx  # noqa: E402
import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient, MockTransport  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.redis import close_redis, get_redis  # noqa: E402
from app.core.security.jwt import (  # noqa: E402
    create_access_token,
    create_refresh_token,
)
from app.core.security.passwords import hash_password  # noqa: E402
from app.core.tasks import broker  # noqa: E402
from app.db.session import async_session_factory, engine  # noqa: E402
from app.features.auth.models import User, Workspace  # noqa: E402
from app.features.auth.schemas import WorkspaceCreateRequest  # noqa: E402
from app.features.auth.services import AuthService  # noqa: E402
from app.main import app  # noqa: E402


async def _ensure_test_database_exists() -> None:
    parts = urlsplit(settings.DATABASE_URL)
    target_db = parts.path.lstrip("/")
    if not target_db:
        return

    admin_dsn = (
        f"postgresql://{parts.username or 'postgres'}:{parts.password or 'postgres'}"
        f"@{parts.hostname or 'localhost'}:{parts.port or 5432}/postgres"
    )
    conn = await asyncpg.connect(admin_dsn)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", target_db
        )
        if not exists:
            safe_name = target_db.replace('"', '""')
            await conn.execute(f'CREATE DATABASE "{safe_name}"')
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
async def prepare_test_infrastructure() -> AsyncGenerator[None, None]:
    """
    Create/migrate isolated feedback_test DB, truncate prior test rows, and isolate Redis /15.
    Never touches feedback_dev or live worker Redis queue /0.
    """
    await _ensure_test_database_exists()

    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "alembic",
        "upgrade",
        "head",
        cwd=str(BACKEND_DIR),
        env=os.environ.copy(),
    )
    returncode = await proc.wait()
    if returncode != 0:
        raise RuntimeError(f"Alembic upgrade failed with exit code {returncode}")

    async with async_session_factory() as session:
        await session.execute(
            text("TRUNCATE TABLE users, workspaces, audit_logs RESTART IDENTITY CASCADE")
        )
        await session.commit()

    await get_redis().flushdb()
    yield
    await get_redis().flushdb()
    await engine.dispose()
    await close_redis()


@pytest.fixture
def kicked_tasks() -> list[Any]:
    """Captures Taskiq messages intercepted by the broker isolation guard during a test."""
    return []


@pytest.fixture(autouse=True)
def isolate_external_side_effects(
    monkeypatch: pytest.MonkeyPatch,
    kicked_tasks: list[Any],
) -> Generator[None, None, None]:
    """
    Global side-effect firewall across all unit, integration, and E2E tests:
    - Intercepts Taskiq broker.kick so tests never push jobs to Redis/live workers.
    - Blocks real smtplib.SMTP / SMTP_SSL socket connections.
    - Blocks real outbound httpx network requests (allows ASGITransport and MockTransport).
    """

    async def _fake_kick(message: Any) -> None:
        kicked_tasks.append(message)

    monkeypatch.setattr(broker, "kick", _fake_kick)

    def _block_smtp(*_args: Any, **_kwargs: Any) -> Any:
        raise RuntimeError(
            "Blocked real SMTP connection in tests. "
            "Mock app.core.email.send_email or task boundaries cleanly."
        )

    monkeypatch.setattr(smtplib, "SMTP", _block_smtp)
    monkeypatch.setattr(smtplib, "SMTP_SSL", _block_smtp)

    orig_async_send = httpx.AsyncClient.send
    orig_sync_send = httpx.Client.send

    async def _guarded_async_send(
        self: httpx.AsyncClient, request: httpx.Request, *args: Any, **kwargs: Any
    ) -> httpx.Response:
        transport = getattr(self, "_transport", None)
        if not isinstance(transport, (ASGITransport, MockTransport)):
            raise RuntimeError(
                f"Blocked real outbound HTTP request in tests: {request.method} {request.url}. "
                "Mock httpx or the provider dependency cleanly."
            )
        return await orig_async_send(self, request, *args, **kwargs)

    def _guarded_sync_send(
        self: httpx.Client, request: httpx.Request, *args: Any, **kwargs: Any
    ) -> httpx.Response:
        transport = getattr(self, "_transport", None)
        if not isinstance(transport, MockTransport):
            raise RuntimeError(
                f"Blocked real outbound HTTP request in tests: {request.method} {request.url}. "
                "Mock httpx cleanly."
            )
        return orig_sync_send(self, request, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "send", _guarded_async_send)
    monkeypatch.setattr(httpx.Client, "send", _guarded_sync_send)
    yield


@pytest.fixture(autouse=True)
async def dispose_resources() -> AsyncGenerator[None, None]:
    """Ensure connection pools tied to event loops are disposed between tests."""
    yield
    await engine.dispose()
    await close_redis()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yields an independent database session for direct repository/service testing."""
    async with async_session_factory() as session:
        yield session


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Yields an unauthenticated HTTP test client configured with the FastAPI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Creates and persists a verified, active standard user for testing."""
    unique_id = uuid.uuid4().hex[:8]
    hashed_pwd = await hash_password("TestPassword123!")
    user = User(
        email=f"tester_{unique_id}@example.com",
        password=hashed_pwd,
        full_name=f"Tester {unique_id}",
        is_active=True,
        is_verified=True,
        is_superuser=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def test_user_tokens(test_user: User) -> dict[str, str]:
    """Generates access and refresh tokens for test_user."""
    access = create_access_token(
        subject=str(test_user.id),
        extra_claims={
            "email": test_user.email,
            "is_superuser": test_user.is_superuser,
        },
    )
    refresh = create_refresh_token(subject=str(test_user.id))
    return {"access_token": access, "refresh_token": refresh}


@pytest.fixture
async def auth_client(
    test_user: User, test_user_tokens: dict[str, str]
) -> AsyncGenerator[AsyncClient, None]:
    """Yields an HTTP client authenticated as test_user via Bearer authorization."""
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {test_user_tokens['access_token']}"}
    async with AsyncClient(
        transport=transport, base_url="http://test", headers=headers
    ) as client:
        yield client


@pytest.fixture
async def test_workspace(db_session: AsyncSession, test_user: User) -> Workspace:
    """Creates a full workspace owned by test_user with atomic default roles initialized."""
    service = AuthService(db_session)
    unique_slug = f"ws-{uuid.uuid4().hex[:8]}"
    created = await service.create_workspace(
        payload=WorkspaceCreateRequest(
            name=f"Test Workspace {unique_slug}",
            slug=unique_slug,
            timezone="UTC",
        ),
        owner=test_user,
    )
    ws = await service.repo.get_workspace_by_id(created.id)
    assert ws is not None
    return ws


@pytest.fixture
async def test_superuser(db_session: AsyncSession) -> User:
    """Creates and persists an active platform administrator (superuser)."""
    unique_id = uuid.uuid4().hex[:8]
    hashed_pwd = await hash_password("AdminPassword123!")
    admin = User(
        email=f"admin_{unique_id}@example.com",
        password=hashed_pwd,
        full_name="Platform Admin",
        is_active=True,
        is_verified=True,
        is_superuser=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
async def admin_client(test_superuser: User) -> AsyncGenerator[AsyncClient, None]:
    """Yields an HTTP client authenticated as a platform administrator."""
    access = create_access_token(
        subject=str(test_superuser.id),
        extra_claims={
            "email": test_superuser.email,
            "is_superuser": True,
        },
    )
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {access}"}
    async with AsyncClient(
        transport=transport, base_url="http://test", headers=headers
    ) as client:
        yield client
