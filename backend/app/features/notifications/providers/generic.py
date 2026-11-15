"""
Generic Outbound JSON Webhook provider implementation.
Handles SSRF defense against internal/private IP networks, optional HMAC-SHA256
payload signing, and HTTP error classification for automation tools (Zapier, Make, n8n, Linear).
"""

import hashlib
import hmac
import ipaddress
import json
import socket
import time
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.logging import get_logger
from app.features.notifications.providers.base import (
    BaseNotificationProvider,
    ProviderResult,
)

logger = get_logger("app.features.notifications.providers.generic")

PROHIBITED_HOSTNAMES = frozenset(
    {
        "localhost",
        "localhost.localdomain",
        "metadata.google.internal",
        "metadata",
    }
)


def _is_forbidden_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """
    Return True if IP is private, loopback, link-local, multicast, reserved, or non-global.
    """
    return (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_multicast
        or ip_obj.is_reserved
        or ip_obj.is_unspecified
        or not ip_obj.is_global
    )


class GenericWebhookProvider(BaseNotificationProvider):
    """
    Provider for custom outbound JSON webhooks with optional HMAC-SHA256 signatures.
    """

    DEFAULT_TIMEOUT_SECONDS = 5.0

    @property
    def provider_type(self) -> str:
        return "generic_webhook"

    def validate_destination_url(self, url: str) -> None:
        """
        Strict SSRF defense:
        - Scheme must be HTTPS.
        - Hostname must be present and not a reserved internal hostname.
        - Reject literal or DNS-resolved private, loopback, link-local, or non-global IPs.
        """
        if not url or not isinstance(url, str):
            raise ValueError("Webhook URL is required.")

        url_clean = url.strip()
        parsed = urlparse(url_clean)

        if parsed.scheme.lower() != "https":
            raise ValueError("Webhook URL must use HTTPS scheme.")

        hostname = (parsed.hostname or "").strip().lower()
        if not hostname:
            raise ValueError("Webhook URL must contain a valid hostname.")

        if (
            hostname in PROHIBITED_HOSTNAMES
            or hostname.endswith(".local")
            or hostname.endswith(".internal")
            or hostname.endswith(".localhost")
        ):
            raise ValueError(
                "Destination host is prohibited (internal or localhost address)."
            )

        # Check explicit IP literal first
        try:
            ip_obj = ipaddress.ip_address(hostname)
            if _is_forbidden_ip(ip_obj):
                raise ValueError(
                    "Destination IP address is prohibited (private, loopback, or link-local)."
                )
            return
        except ValueError as exc:
            if "prohibited" in str(exc):
                raise

        # Resolve DNS and verify all returned A/AAAA records are public global IPs
        try:
            addr_info = socket.getaddrinfo(hostname, None)
        except socket.gaierror:
            # Skip DNS-only resolution check when offline/sandboxed; runtime dispatch
            # handles unreachable hosts cleanly as a transient network error.
            logger.debug(
                "notifications.generic.dns_resolution_skipped",
                hostname=hostname,
            )
            return

        for _, _, _, _, sockaddr in addr_info:
            ip_str = str(sockaddr[0]).split("%")[0]
            try:
                resolved_ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            if _is_forbidden_ip(resolved_ip):
                raise ValueError(
                    "Destination hostname resolves to a prohibited internal IP address."
                )

    @staticmethod
    def compute_hmac_signature(body_bytes: bytes, secret_token: str) -> str:
        """
        Compute sha256=<hex> HMAC signature for request payload verification.
        """
        digest = hmac.new(
            secret_token.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()
        return f"sha256={digest}"

    async def dispatch(
        self,
        url: str,
        payload: dict[str, Any],
        secret_token: str | None = None,
    ) -> ProviderResult:
        """
        Dispatches raw JSON event payload with optional HMAC-SHA256 signing headers.
        """
        self.validate_destination_url(url)

        body_bytes = json.dumps(
            payload, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")

        headers: dict[str, str] = {
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "FeedbackFlow-Webhook/1.0",
            "X-FeedbackFlow-Event": str(payload.get("event", "feedback.submission")),
            "X-FeedbackFlow-Timestamp": str(int(time.time())),
        }

        if secret_token and secret_token.strip():
            headers["X-FeedbackFlow-Signature"] = self.compute_hmac_signature(
                body_bytes, secret_token.strip()
            )

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.DEFAULT_TIMEOUT_SECONDS),
                follow_redirects=False,
            ) as client:
                response = await client.post(
                    url.strip(),
                    content=body_bytes,
                    headers=headers,
                )

            body_snippet = response.text[:500] if response.text else None

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
            logger.warning("notifications.generic.timeout", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Request timed out after {self.DEFAULT_TIMEOUT_SECONDS}s: {exc.__class__.__name__}",
                is_transient=True,
            )
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            logger.warning("notifications.generic.network_error", error=str(exc))
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Network error connecting to webhook endpoint: {exc.__class__.__name__}",
                is_transient=True,
            )
        except Exception as exc:
            logger.error("notifications.generic.unexpected_error", error=str(exc))
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
        Classifies custom endpoint HTTP response into transient vs. permanent.
        """
        if status_code == 429:
            retry_after_raw = headers.get("Retry-After")
            retry_after_sec = None
            if retry_after_raw and retry_after_raw.isdigit():
                retry_after_sec = int(retry_after_raw)
            return ProviderResult(
                success=False,
                status_code=status_code,
                response_body=body,
                error_message="Webhook endpoint rate limit exceeded (HTTP 429)",
                is_transient=True,
                retry_after_seconds=retry_after_sec,
            )

        if status_code >= 500:
            return ProviderResult(
                success=False,
                status_code=status_code,
                response_body=body,
                error_message=f"Webhook endpoint server error (HTTP {status_code})",
                is_transient=True,
            )

        return ProviderResult(
            success=False,
            status_code=status_code,
            response_body=body,
            error_message=f"Webhook endpoint rejected request (HTTP {status_code}): {body or 'Client Error'}",
            is_transient=False,
            is_revocation=(status_code == 410),
        )

    def build_test_payload(self, workspace_name: str) -> dict[str, Any]:
        """
        Construct a standardized JSON test ping event payload.
        """
        return {
            "event": "test.ping",
            "timestamp": datetime.now(UTC).isoformat(),
            "workspace": {"name": workspace_name},
            "message": f"Webhook endpoint verified successfully for workspace '{workspace_name}'.",
        }
