"""
Unit tests for the Generic Outbound JSON Webhook provider.
Tests SSRF defense (IP literals + DNS resolution), HMAC-SHA256 signing headers,
and HTTP status classification.
"""

import hashlib
import hmac
import socket
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.features.notifications.providers.generic import GenericWebhookProvider
from app.features.notifications.providers.registry import provider_registry


def test_generic_provider_registry_registration() -> None:
    """Verify registry resolves generic_webhook cleanly."""
    provider = provider_registry.get("generic_webhook")
    assert isinstance(provider, GenericWebhookProvider)
    assert provider.provider_type == "generic_webhook"
    assert provider_registry.is_supported("generic_webhook") is True


def test_generic_webhook_url_validation_success() -> None:
    """Verify valid public HTTPS webhook URLs pass validation."""
    provider = GenericWebhookProvider()
    with patch(
        "app.features.notifications.providers.generic.socket.getaddrinfo",
        return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))],
    ):
        provider.validate_destination_url("https://webhooks.example.com/events")
        provider.validate_destination_url("https://hook.us1.make.com/abcdef123456")


@pytest.mark.parametrize(
    "invalid_url, expected_error",
    [
        ("", "Webhook URL is required"),
        ("http://webhooks.example.com/events", "must use HTTPS scheme"),
        ("https://localhost/webhook", "prohibited"),
        ("https://myservice.internal/hook", "prohibited"),
        ("https://127.0.0.1/hook", "prohibited"),
        ("https://10.0.0.5/hook", "prohibited"),
        ("https://192.168.1.10/hook", "prohibited"),
        ("https://172.16.0.1/hook", "prohibited"),
        ("https://169.254.169.254/latest/meta-data/", "prohibited"),
    ],
)
def test_generic_webhook_ssrf_literal_rejections(
    invalid_url: str, expected_error: str
) -> None:
    """Verify non-HTTPS, reserved hostnames, and private IP literals are blocked."""
    provider = GenericWebhookProvider()
    with pytest.raises(ValueError, match=expected_error):
        provider.validate_destination_url(invalid_url)


def test_generic_webhook_ssrf_dns_resolution_blocks_private_ip() -> None:
    """Verify hostnames resolving via DNS to private IPs are blocked."""
    provider = GenericWebhookProvider()
    with (
        patch(
            "app.features.notifications.providers.generic.socket.getaddrinfo",
            return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.20.30.40", 0))],
        ),
        pytest.raises(ValueError, match="prohibited internal IP"),
    ):
        provider.validate_destination_url("https://rebind-attacker.example.com/hook")


def test_generic_build_test_payload() -> None:
    """Verify test ping JSON payload format."""
    provider = GenericWebhookProvider()
    payload = provider.build_test_payload("Acme Corp")

    assert payload["event"] == "test.ping"
    assert payload["workspace"]["name"] == "Acme Corp"
    assert "verified" in payload["message"].lower()


@pytest.mark.asyncio
async def test_generic_dispatch_with_hmac_signature() -> None:
    """Verify dispatch sends JSON content and valid X-FeedbackFlow-Signature header."""
    provider = GenericWebhookProvider()
    url = "https://webhooks.example.com/events"
    payload = {"event": "feedback.detractor", "rating": 1}
    secret = "super_secret_signing_key"

    mock_response = httpx.Response(
        status_code=200,
        text='{"status":"success"}',
        request=httpx.Request("POST", url),
    )

    with (
        patch(
            "app.features.notifications.providers.generic.socket.getaddrinfo",
            return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))],
        ),
        patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post,
    ):
        mock_post.return_value = mock_response
        result = await provider.dispatch(url, payload, secret_token=secret)

    assert result.success is True
    assert result.status_code == 200

    _, kwargs = mock_post.call_args
    sent_body: bytes = kwargs["content"]
    sent_headers: dict[str, str] = kwargs["headers"]

    expected_sig = (
        "sha256="
        + hmac.new(secret.encode("utf-8"), sent_body, hashlib.sha256).hexdigest()
    )
    assert sent_headers["X-FeedbackFlow-Signature"] == expected_sig
    assert sent_headers["X-FeedbackFlow-Event"] == "feedback.detractor"
    assert sent_headers["Content-Type"] == "application/json; charset=utf-8"


@pytest.mark.asyncio
async def test_generic_dispatch_without_secret_omits_signature() -> None:
    """Verify signature header is omitted when no secret_token is configured."""
    provider = GenericWebhookProvider()
    url = "https://webhooks.example.com/events"

    mock_response = httpx.Response(
        status_code=202,
        text="Accepted",
        request=httpx.Request("POST", url),
    )

    with (
        patch(
            "app.features.notifications.providers.generic.socket.getaddrinfo",
            return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))],
        ),
        patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post,
    ):
        mock_post.return_value = mock_response
        result = await provider.dispatch(url, {"event": "test.ping"}, secret_token=None)

    assert result.success is True
    _, kwargs = mock_post.call_args
    assert "X-FeedbackFlow-Signature" not in kwargs["headers"]


@pytest.mark.asyncio
async def test_generic_dispatch_error_classification() -> None:
    """Verify 5xx/timeout are transient, 400 is permanent, and 410 is revocation."""
    provider = GenericWebhookProvider()
    url = "https://api.example.com/webhook"

    with patch(
        "app.features.notifications.providers.generic.socket.getaddrinfo",
        return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))],
    ):
        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = httpx.Response(
                503, text="Unavailable", request=httpx.Request("POST", url)
            )
            res_503 = await provider.dispatch(url, {"event": "test"})
            assert res_503.success is False
            assert res_503.is_transient is True

        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = httpx.Response(
                400, text="Bad Request", request=httpx.Request("POST", url)
            )
            res_400 = await provider.dispatch(url, {"event": "test"})
            assert res_400.success is False
            assert res_400.is_transient is False
            assert res_400.is_revocation is False

        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = httpx.Response(
                410, text="Gone", request=httpx.Request("POST", url)
            )
            res_410 = await provider.dispatch(url, {"event": "test"})
            assert res_410.success is False
            assert res_410.is_transient is False
            assert res_410.is_revocation is True
