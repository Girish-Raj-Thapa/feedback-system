"""
Database engine and async session factory management.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# Configure async engine with connection pooling, health pre-ping, and connection recycling
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    pool_recycle=1800,
)

# Async session factory with expire_on_commit=False to prevent async lazy loading issues
async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async database session for request lifecycle dependency injection.
    """
    async with async_session_factory() as session:
        yield session


async def close_db_engine() -> None:
    """
    Gracefully dispose of the database connection pool on application shutdown.
    """
    await engine.dispose()
