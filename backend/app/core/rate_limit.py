"""
Lightweight Redis-backed fixed-window rate limiting dependency for FastAPI routes.
Honors settings.RATE_LIMIT_ENABLED and settings.RATE_LIMIT_PER_MINUTE and fails open
on Redis errors so transient cache outages never block legitimate requests.
"""

import time
from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis import get_redis

logger = get_logger("app.core.rate_limit")


def _extract_client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def rate_limit(
    scope: str,
    *,
    limit: int | None = None,
    window_seconds: int = 60,
) -> Callable[[Request], Awaitable[None]]:
    """
    Create a FastAPI dependency that enforces a per-IP fixed-window request limit
    in Redis under `rl:{scope}:{client_ip}:{bucket}`.
    """

    async def _rate_limit_dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED or settings.is_test:
            return

        effective_limit = limit if limit is not None else settings.RATE_LIMIT_PER_MINUTE
        if effective_limit <= 0:
            return

        now = int(time.time())
        bucket = now // window_seconds
        client_ip = _extract_client_ip(request)
        key = f"rl:{scope}:{client_ip}:{bucket}"

        try:
            redis = get_redis()
            count = int(await redis.incr(key))
            if count == 1:
                await redis.expire(key, window_seconds + 5)
        except Exception as exc:
            logger.warning(
                "rate_limit.redis_unavailable",
                scope=scope,
                error=str(exc),
            )
            return

        if count > effective_limit:
            retry_after = max(1, (bucket + 1) * window_seconds - now)
            logger.warning(
                "rate_limit.exceeded",
                scope=scope,
                client_ip=client_ip,
                count=count,
                limit=effective_limit,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    return _rate_limit_dependency
