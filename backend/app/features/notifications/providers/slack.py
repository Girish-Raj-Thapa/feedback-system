"""
Slack Incoming Webhook provider implementation.
Handles strict SSRF validation, HTTP execution with timeouts, and transient vs. permanent error classification.
"""

import re
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.logging import get_logger
from app.features.notifications.providers.base import (
    BaseNotificationProvider,
    ProviderResult,
)

logger = get_logger("app.features.notifications.providers.slack")

# Slack incoming webhook URL pattern
# Standard format: https://hooks.slack.com/services/T.../B.../X...
# Workflow Webhook format: https://hooks.slack.com/triggers/T.../...
SLACK_WEBHOOK_REGEX = re.compile(
    r"^https:\/\/hooks\.slack\.com\/(services|triggers)\/[A-Za-z0-9_\-\/]+$"
)


class SlackWebhookProvider(BaseNotificationProvider):
    """
    Provider for Slack Incoming Webhooks.
    """

    DEFAULT_TIMEOUT_SECONDS = 5.0

    @property
    def provider_type(self) -> str:
        return "slack_webhook"

    def validate_destination_url(self, url: str) -> None:
        """
        Strict SSRF defense:
        - Scheme must be HTTPS.
        - Host must be strictly 'hooks.slack.com'.
        - Path must match valid Slack incoming webhook pattern.
        """
        if not url or not isinstance(url, str):
            raise ValueError("Webhook URL is required.")

        url_clean = url.strip()
        parsed = urlparse(url_clean)

        if parsed.scheme.lower() != "https":
            raise ValueError("Slack webhook URL must use HTTPS scheme.")

        if parsed.netloc.lower() != "hooks.slack.com":
            raise ValueError(
                "Invalid Slack webhook host. URL must be on hooks.slack.com."
            )

        if not SLACK_WEBHOOK_REGEX.match(url_clean):
            raise ValueError(
                "Invalid Slack webhook format. Expected format: https://hooks.slack.com/services/..."
            )

    async def dispatch(
        self,
        url: str,
        payload: dict[str, Any],
        secret_token: str | None = None,
    ) -> ProviderResult:
        """
        Dispatches Block Kit payload to Slack incoming webhook URL.
        """
        self.validate_destination_url(url)

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.DEFAULT_TIMEOUT_SECONDS),
                follow_redirects=False,  # Prevent SSRF open redirect bypasses
            ) as client:
                response = await client.post(
                    url.strip(),
                    json=payload,
                    headers={"Content-Type": "application/json; charset=utf-8"},
                )

            body_snippet = response.text[:500] if response.text else None

            # Slack returns 200 OK with body 'ok' for successful incoming webhooks
            if response.status_code == 200 and (
                body_snippet and "ok" in body_snippet.lower()
            ):
                return ProviderResult(
                    success=True,
                    status_code=response.status_code,
                    response_body=body_snippet,
                    error_message=None,
                    is_transient=False,
                )

            # Classify error
            return self._classify_http_error(
                response.status_code, body_snippet, response.headers
            )

        except (
            httpx.ConnectTimeout,
            httpx.ReadTimeout,
            httpx.WriteTimeout,
            httpx.PoolTimeout,
        ) as exc:
            logger.warning("notifications.slack.timeout", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Request timed out after {self.DEFAULT_TIMEOUT_SECONDS}s: {exc.__class__.__name__}",
                is_transient=True,
            )
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            logger.warning("notifications.slack.network_error", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Network error connecting to Slack: {exc.__class__.__name__}",
                is_transient=True,
            )
        except Exception as exc:
            logger.error("notifications.slack.unexpected_error", error=str(exc))
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
        Classifies Slack HTTP response into transient (retryable) vs permanent.
        """
        # Rate Limiting (HTTP 429) -> Transient
        if status_code == 429:
            retry_after_raw = headers.get("Retry-After")
            retry_after_sec = None
            if retry_after_raw and retry_after_raw.isdigit():
                retry_after_sec = int(retry_after_raw)

            return ProviderResult(
                success=False,
                status_code=status_code,
                response_body=body,
                error_message="Slack rate limit exceeded (HTTP 429)",
                is_transient=True,
                retry_after_seconds=retry_after_sec,
            )

        # Server Errors (500, 502, 503, 504) -> Transient
        if status_code >= 500:
            return ProviderResult(
                success=False,
                status_code=status_code,
                response_body=body,
                error_message=f"Slack server error (HTTP {status_code})",
                is_transient=True,
            )

        # Permanent Client Errors (400, 403, 404, 410)
        # 404: channel_not_found, webhook deleted
        # 410: gone
        # 403: token_revoked, action_prohibited
        # 400: invalid_payload (application formatting bug, does NOT revoke connection)
        is_revocation = status_code in (404, 410) or (
            status_code == 403
            and body is not None
            and any(
                term in body.lower()
                for term in ("token_revoked", "action_prohibited", "account_inactive")
            )
        )

        error_msg = f"Slack rejected webhook (HTTP {status_code}): {body or 'Client Error'}"
        return ProviderResult(
            success=False,
            status_code=status_code,
            response_body=body,
            error_message=error_msg,
            is_transient=False,
            is_revocation=is_revocation,
        )

    def build_test_payload(self, workspace_name: str) -> dict[str, Any]:
        """
        Construct a test verification Block Kit message.
        """
        return {
            "text": f"🎉 Test notification from your VoC Feedback System for {workspace_name}",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🎉 Slack Integration Connected Successfully",
                        "emoji": True,
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"*Workspace:* `{workspace_name}`\n"
                            "Your Slack Incoming Webhook is verified and active. "
                            "Real-time feedback alerts matching your alert rules will appear here."
                        ),
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "⚡ *VoC Decision Engine* • Verified Test Ping",
                        }
                    ],
                },
            ],
        }

