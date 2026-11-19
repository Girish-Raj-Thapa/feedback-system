"""
Unit tests for Argon2id concurrency limiting and Redis fixed-window rate limiting.
"""

import asyncio
import threading
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.core import rate_limit as rate_limit_module
from app.core.security import passwords as passwords_module


@pytest.mark.asyncio
async def test_argon2_semaphore_caps_concurrent_operations(monkeypatch):
    active = 0
    max_active = 0
    lock = threading.Lock()

    def slow_verify(plain: str, hashed: str) -> bool:
        nonlocal active, max_active
        with lock:
            active += 1
            if active > max_active:
                max_active = active
        time.sleep(0.05)
        with lock:
            active -= 1
        return True

    monkeypatch.setattr(passwords_module.password_hasher, "verify", slow_verify)

    results = await asyncio.gather(
        *(passwords_module.verify_password("secret", "hashed") for _ in range(12))
    )

    assert all(results)
    assert max_active <= passwords_module.MAX_CONCURRENT_PASSWORD_HASHES


@pytest.mark.asyncio
async def test_rate_limit_enforces_429_when_exceeded(monkeypatch):
    fake_redis = AsyncMock()
    counts = iter([1, 2, 3])
    fake_redis.incr.side_effect = lambda _key: next(counts)

    monkeypatch.setattr(rate_limit_module, "get_redis", lambda: fake_redis)
    monkeypatch.setattr(rate_limit_module.settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(rate_limit_module.settings, "ENVIRONMENT", "prod")

    dep = rate_limit_module.rate_limit("auth_login", limit=2, window_seconds=60)
    req = SimpleNamespace(client=SimpleNamespace(host="203.0.113.5"))

    await dep(req)  # type: ignore[arg-type]
    await dep(req)  # type: ignore[arg-type]
    with pytest.raises(HTTPException) as exc_info:
        await dep(req)  # type: ignore[arg-type]

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers is not None
    assert "Retry-After" in exc_info.value.headers
    fake_redis.expire.assert_awaited_once()


@pytest.mark.asyncio
async def test_rate_limit_fails_open_when_redis_errors(monkeypatch):
    fake_redis = AsyncMock()
    fake_redis.incr.side_effect = RuntimeError("redis connection refused")

    monkeypatch.setattr(rate_limit_module, "get_redis", lambda: fake_redis)
    monkeypatch.setattr(rate_limit_module.settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(rate_limit_module.settings, "ENVIRONMENT", "prod")

    dep = rate_limit_module.rate_limit("auth_login", limit=1, window_seconds=60)
    req = SimpleNamespace(client=SimpleNamespace(host="203.0.113.6"))

    # Should not raise even when Redis is unavailable
    await dep(req)  # type: ignore[arg-type]
