"""
Pytest configuration and global fixtures for API testing and IAM RBAC verification.
"""

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import close_redis
from app.core.security.jwt import create_access_token, create_refresh_token
from app.core.security.passwords import hash_password
from app.db.session import async_session_factory, engine
from app.features.auth.models import User, Workspace
from app.features.auth.schemas import WorkspaceCreateRequest
from app.features.auth.services import AuthService
from app.main import app


@pytest.fixture(autouse=True)
async def dispose_resources() -> AsyncGenerator[None, None]:
    """
    Ensure connection pools tied to event loops are disposed between tests.
    """
    yield
    await engine.dispose()
    await close_redis()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an independent database session for direct repository/service testing.
    """
    async with async_session_factory() as session:
        yield session


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Yields an unauthenticated HTTP test client configured with the FastAPI application.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """
    Creates and persists a verified, active standard user for testing.
    """
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
    """
    Generates access and refresh tokens for test_user.
    """
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
    """
    Yields an HTTP client authenticated as test_user via Bearer authorization.
    """
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {test_user_tokens['access_token']}"}
    async with AsyncClient(
        transport=transport, base_url="http://test", headers=headers
    ) as client:
        yield client


@pytest.fixture
async def test_workspace(db_session: AsyncSession, test_user: User) -> Workspace:
    """
    Creates a full workspace owned by test_user with atomic default roles initialized.
    """
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
    """
    Creates and persists an active platform administrator (superuser).
    """
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
    """
    Yields an HTTP client authenticated as a platform administrator.
    """
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
