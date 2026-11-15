"""
Discord Incoming Webhook provider implementation.
Handles strict SSRF validation, HTTP execution with timeouts, rate-limit backoff,
and transient vs. permanent/revocation error classification.
"""

import math
import re
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.logging import get_logger
from app.features.notifications.providers.base import (
    BaseNotificationProvider,
    ProviderResult,
)

logger = get_logger("app.features.notifications.providers.discord")

DISCORD_ALLOWED_HOSTS = frozenset(
    {"discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"}
)
DISCORD_WEBHOOK_PATH_REGEX = re.compile(
    r"^\/api\/webhooks\/\d+\/[A-Za-z0-9_\-]+$"
)


class DiscordWebhookProvider(BaseNotificationProvider):
    """
    Provider for Discord Incoming Webhooks.
    """

    DEFAULT_TIMEOUT_SECONDS = 5.0

    @property
    def provider_type(self) -> str:
        return "discord_webhook"

    def validate_destination_url(self, url: str) -> None:
        """
        Strict SSRF defense:
        - Scheme must be HTTPS.
        - Host must be an official Discord webhook domain.
        - Path must match /api/webhooks/{id}/{token}.
        """
        if not url or not isinstance(url, str):
            raise ValueError("Webhook URL is required.")

        url_clean = url.strip()
        parsed = urlparse(url_clean)

        if parsed.scheme.lower() != "https":
            raise ValueError("Discord webhook URL must use HTTPS scheme.")

        host = (parsed.hostname or "").lower()
        if host not in DISCORD_ALLOWED_HOSTS:
            raise ValueError(
                "Invalid Discord webhook host. URL must be on discord.com."
            )

        if not DISCORD_WEBHOOK_PATH_REGEX.match(parsed.path):
            raise ValueError(
                "Invalid Discord webhook format. Expected format: https://discord.com/api/webhooks/{id}/{token}"
            )

    async def dispatch(
        self,
        url: str,
        payload: dict[str, Any],
        secret_token: str | None = None,
    ) -> ProviderResult:
        """
        Dispatches an Embed payload to a Discord incoming webhook URL.
        """
        self.validate_destination_url(url)

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.DEFAULT_TIMEOUT_SECONDS),
                follow_redirects=False,
            ) as client:
                response = await client.post(
                    url.strip(),
                    json=payload,
                    headers={"Content-Type": "application/json; charset=utf-8"},
                )

            body_snippet = response.text[:500] if response.text else None

            # Discord returns 204 No Content by default (or 200 OK if ?wait=true)
            if 200 <= response.status_code < 300:
                return ProviderResult(
                    success=True,
                    status_code=response.status_code,
                    response_body=body_snippet,
                    error_message=None,
                    is_transient=False,
                )

            return self._classify_http_error(
                response.status_code, body_snippet, response.headers
            )

        except (
            httpx.ConnectTimeout,
            httpx.ReadTimeout,
            httpx.WriteTimeout,
            httpx.PoolTimeout,
        ) as exc:
            logger.warning("notifications.discord.timeout", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Request timed out after {self.DEFAULT_TIMEOUT_SECONDS}s: {exc.__class__.__name__}",
                is_transient=True,
            )
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            logger.warning("notifications.discord.network_error", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Network error connecting to Discord: {exc.__class__.__name__}",
                is_transient=True,
            )
        except Exception as exc:
            logger.error("notifications.discord.unexpected_error", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Unexpected error: {str(exc)}",
                is_transient=False,
            )

    def _classify_http_error(
        self,
        status_code: int,
        body: str | None,
        headers: httpx.Headers,
    ) -> ProviderResult:
        """
        Classifies Discord HTTP response into transient vs. permanent/revocation.
        """
        if status_code == 429:
            retry_after_sec = self._parse_retry_after(headers, body)
            return ProviderResult(
                success=False,
                status_code=status_code,
                response_body=body,
                error_message="Discord rate limit exceeded (HTTP 429)",
                is_transient=True,
                retry_after_seconds=retry_after_sec,
            )

        if status_code >= 500:
            return ProviderResult(
                success=False,
                status_code=status_code,
                response_body=body,
                error_message=f"Discord server error (HTTP {status_code})",
                is_transient=True,
            )

        # 404 (Unknown Webhook), 410 (Gone), or 401/403 invalid webhook token
        is_revocation = status_code in (404, 410) or (
            status_code in (401, 403)
            and body is not None
            and any(
                marker in body.lower()
                for marker in ("unknown webhook", "invalid webhook token", "10015", "50027")
            )
        )

        return ProviderResult(
            success=False,
            status_code=status_code,
            response_body=body,
            error_message=f"Discord rejected webhook (HTTP {status_code}): {body or 'Client Error'}",
            is_transient=False,
            is_revocation=is_revocation,
        )

    @staticmethod
    def _parse_retry_after(headers: httpx.Headers, body: str | None) -> int | None:
        """
        Parse Discord's Retry-After / X-RateLimit-Reset-After header or JSON retry_after.
        """
        for header_name in ("Retry-After", "X-RateLimit-Reset-After"):
            raw = headers.get(header_name)
            if raw:
                try:
                    return max(1, math.ceil(float(raw)))
                except ValueError:
                    pass

        if body:
            match = re.search(r'"retry_after"\s*:\s*([0-9]+(?:\.[0-9]+)?)', body)
            if match:
                try:
                    return max(1, math.ceil(float(match.group(1))))
                except ValueError:
                    pass
        return None

    def build_test_payload(self, workspace_name: str) -> dict[str, Any]:
        """
        Construct a test verification Discord Rich Embed message.
        """
        return {
            "embeds": [
                {
                    "title": "🎉 Discord Integration Connected Successfully",
                    "description": (
                        f"**Workspace:** `{workspace_name}`\n"
                        "Your Discord Webhook is verified and active. "
                        "Real-time feedback alerts matching your alert rules will appear here."
                    ),
                    "color": 0x10B981,
                    "footer": {
                        "text": "⚡ VoC Decision Engine • Verified Test Ping"
                    },
                }
            ]
        }
