import time
import uuid

import structlog
from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.context import (
    reset_correlation_id,
    reset_user_id,
    set_correlation_id,
    set_user_id,
)
from app.core.logging import get_logger

logger = get_logger("app.access")

CORRELATION_HEADER_NAME = "x-correlation-id"
CORRELATION_HEADER_BYTES = b"x-correlation-id"
EXCLUDED_LOG_PATHS = frozenset({"/health", "/docs", "/openapi.json"})


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        structlog.contextvars.clear_contextvars()

        headers = Headers(scope=scope)
        correlation_id = headers.get(CORRELATION_HEADER_NAME) or str(uuid.uuid4())
        correlation_id_bytes = correlation_id.encode("latin-1")

        corr_token = set_correlation_id(correlation_id)
        user_token = set_user_id(None)

        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")

        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            method=method,
            path=path,
        )

        status_code = 500
        start_time = time.perf_counter()

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
                filtered_headers = [
                    (k, v)
                    for k, v in message.get("headers", [])
                    if k.lower() != CORRELATION_HEADER_BYTES
                ]
                filtered_headers.append(
                    (CORRELATION_HEADER_BYTES, correlation_id_bytes)
                )
                message["headers"] = filtered_headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception("http.request_failed")
            raise
        finally:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if path not in EXCLUDED_LOG_PATHS:
                logger.info(
                    "http.request_completed",
                    status_code=status_code,
                    duration_ms=duration_ms,
                )

            reset_correlation_id(corr_token)
            reset_user_id(user_token)
            structlog.contextvars.clear_contextvars()


class PublicCORSMiddleware:
    """
    Allow cross-origin requests specifically for public feedback endpoints (/api/v1/public/*)
    so embeddable widgets on external websites can retrieve forms and submit responses.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if not path.startswith("/api/v1/public/"):
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        origin = headers.get("origin")
        allow_origin = origin if origin else "*"

        if scope.get("method") == "OPTIONS":
            response_headers = [
                (b"access-control-allow-origin", allow_origin.encode("latin-1")),
                (b"access-control-allow-methods", b"GET, POST, OPTIONS"),
                (b"access-control-allow-headers", b"*"),
                (b"access-control-max-age", b"86400"),
            ]
            await send(
                {
                    "type": "http.response.start",
                    "status": 204,
                    "headers": response_headers,
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b"",
                }
            )
            return

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                filtered_headers = [
                    (k, v)
                    for k, v in message.get("headers", [])
                    if k.lower()
                    not in (
                        b"access-control-allow-origin",
                        b"access-control-allow-methods",
                        b"access-control-allow-headers",
                    )
                ]
                filtered_headers.append(
                    (b"access-control-allow-origin", allow_origin.encode("latin-1"))
                )
                filtered_headers.append(
                    (b"access-control-allow-methods", b"GET, POST, OPTIONS")
                )
                filtered_headers.append((b"access-control-allow-headers", b"*"))
                message["headers"] = filtered_headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
