"""
Redis connection management and token revocation denylist.
"""

import asyncio
from datetime import UTC, datetime

from redis.asyncio import ConnectionPool, Redis

from app.core.config import settings

_redis_pool: ConnectionPool | None = None
_redis_pool_loop: asyncio.AbstractEventLoop | None = None


def get_redis() -> Redis:
    """
    Get an async Redis client tied to the active event loop.
    Re-creates connection pool if running on a newly spawned loop (e.g. pytest).
    """
    global _redis_pool, _redis_pool_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _redis_pool is None or _redis_pool_loop != current_loop:
        _redis_pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
        )
        _redis_pool_loop = current_loop

    return Redis(connection_pool=_redis_pool)


async def close_redis() -> None:
    """
    Gracefully close the async Redis connection pool.
    """
    global _redis_pool, _redis_pool_loop
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None
        _redis_pool_loop = None


async def revoke_token(jti: str, expires_at_timestamp: int) -> None:
    """
    Denylist a JWT token by jti until its expiry time.
    """
    now = int(datetime.now(UTC).timestamp())
    ttl = expires_at_timestamp - now
    if ttl > 0:
        redis = get_redis()
        await redis.set(f"token:revoked:{jti}", "1", ex=ttl)


async def is_token_revoked(jti: str) -> bool:
    """
    Check if a JWT token jti is present in the denylist.
    """
    redis = get_redis()
    return bool(await redis.exists(f"token:revoked:{jti}"))
