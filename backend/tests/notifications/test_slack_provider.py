"""
Unit tests for the Slack Webhook notification provider.
Tests SSRF validation, Block Kit test payload construction, dispatch behavior, and error classification.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.features.notifications.providers.registry import (
    ProviderRegistry,
    provider_registry,
)
from app.features.notifications.providers.slack import (
    SlackWebhookProvider,
)


def test_provider_registry_registration() -> None:
    """Verify registry resolves slack_webhook and rejects unknown types."""
    provider = provider_registry.get("slack_webhook")
    assert isinstance(provider, SlackWebhookProvider)
    assert provider.provider_type == "slack_webhook"
    assert provider_registry.is_supported("slack_webhook") is True
    assert provider_registry.is_supported("non_existent") is False

    with pytest.raises(ValueError, match="Unsupported notification provider type"):
        provider_registry.get("unknown_channel")


def test_slack_webhook_url_validation_success() -> None:
    """Verify valid Slack incoming webhook formats pass validation."""
    provider = SlackWebhookProvider()

    valid_urls = [
        "https://hooks.slack.com/services/T_SAMPLE/B_SAMPLE/sample_test_token",
        "https://hooks.slack.com/triggers/T_SAMPLE/sample_trigger/sample_token",
        "https://hooks.slack.com/services/T1/B2/X3_4-5",
    ]
    for url in valid_urls:
        provider.validate_destination_url(url)  # Should not raise


@pytest.mark.parametrize(
    "invalid_url, expected_error",
    [
        (
            "",
            "Webhook URL is required",
        ),
        (
            "http://hooks.slack.com/services/T_SAMPLE/B_SAMPLE/sample_token",
            "must use HTTPS scheme",
        ),
        (
            "https://evil-site.com/services/T_SAMPLE/B_SAMPLE/sample_token",
            "must be on hooks.slack.com",
        ),
        (
            "https://169.254.169.254/services/T_SAMPLE/B_SAMPLE/sample_token",
            "must be on hooks.slack.com",
        ),
        (
            "https://localhost/services/T_SAMPLE/B_SAMPLE/sample_token",
            "must be on hooks.slack.com",
        ),
        (
            "https://hooks.slack.com/other_path/T_SAMPLE/B_SAMPLE",
            "Invalid Slack webhook format",
        ),
    ],
)
def test_slack_webhook_ssrf_and_url_validation_rejections(
    invalid_url: str, expected_error: str
) -> None:
    """Verify SSRF attempts and malformed URLs are rejected with ValueError."""
    provider = SlackWebhookProvider()
    with pytest.raises(ValueError, match=expected_error):
        provider.validate_destination_url(invalid_url)


def test_build_test_payload() -> None:
    """Verify Slack test payload is well-formed Block Kit JSON."""
    provider = SlackWebhookProvider()
    payload = provider.build_test_payload(workspace_name="Acme Corp")

    assert "Acme Corp" in payload["text"]
    assert "blocks" in payload
    assert len(payload["blocks"]) >= 2
    assert payload["blocks"][0]["type"] == "header"
    assert "Connected Successfully" in payload["blocks"][0]["text"]["text"]


@pytest.mark.asyncio
async def test_dispatch_success_200_ok() -> None:
    """Verify successful dispatch when Slack returns 200 OK with 'ok' body."""
    provider = SlackWebhookProvider()
    valid_url = "https://hooks.slack.com/services/T1/B2/token123"
    test_payload = {"text": "hello"}

    mock_response = httpx.Response(
        status_code=200,
        text="ok",
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, test_payload)

    assert result.success is True
    assert result.status_code == 200
    assert result.response_body == "ok"
    assert result.error_message is None
    assert result.is_transient is False


@pytest.mark.asyncio
async def test_dispatch_rate_limit_429_with_retry_after() -> None:
    """Verify HTTP 429 is classified as transient with parsed Retry-After seconds."""
    provider = SlackWebhookProvider()
    valid_url = "https://hooks.slack.com/services/T1/B2/token123"

    mock_response = httpx.Response(
        status_code=429,
        text="Rate limited",
        headers={"Retry-After": "45"},
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, {"text": "test"})

    assert result.success is False
    assert result.status_code == 429
    assert result.is_transient is True
    assert result.retry_after_seconds == 45
    assert "rate limit exceeded" in result.error_message.lower()


@pytest.mark.asyncio
async def test_dispatch_server_error_503_transient() -> None:
    """Verify 5xx server errors are classified as transient/retryable."""
    provider = SlackWebhookProvider()
    valid_url = "https://hooks.slack.com/services/T1/B2/token123"

    mock_response = httpx.Response(
        status_code=503,
        text="Service Unavailable",
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, {"text": "test"})

    assert result.success is False
    assert result.status_code == 503
    assert result.is_transient is True
    assert "Slack server error (HTTP 503)" in result.error_message


@pytest.mark.asyncio
async def test_dispatch_channel_not_found_404_permanent() -> None:
    """Verify 404 revoked/deleted webhooks are classified as permanent (non-retryable)."""
    provider = SlackWebhookProvider()
    valid_url = "https://hooks.slack.com/services/T1/B2/token123"

    mock_response = httpx.Response(
        status_code=404,
        text="channel_not_found",
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, {"text": "test"})

    assert result.success is False
    assert result.status_code == 404
    assert result.is_transient is False  # Permanent!
    assert "Slack rejected webhook" in result.error_message


@pytest.mark.asyncio
async def test_dispatch_timeout_transient() -> None:
    """Verify connection or read timeouts are classified as transient."""
    provider = SlackWebhookProvider()
    valid_url = "https://hooks.slack.com/services/T1/B2/token123"

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectTimeout("Connection timed out")
        result = await provider.dispatch(valid_url, {"text": "test"})

    assert result.success is False
    assert result.status_code is None
    assert result.is_transient is True
    assert "Request timed out" in result.error_message

