"""
Unit tests for the Discord Webhook notification provider.
Tests SSRF validation, Embed test payload construction, dispatch behavior,
rate limit handling, and revocation classification.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.features.notifications.providers.discord import DiscordWebhookProvider
from app.features.notifications.providers.registry import provider_registry


def test_discord_provider_registry_registration() -> None:
    """Verify registry resolves discord_webhook cleanly."""
    provider = provider_registry.get("discord_webhook")
    assert isinstance(provider, DiscordWebhookProvider)
    assert provider.provider_type == "discord_webhook"
    assert provider_registry.is_supported("discord_webhook") is True


def test_discord_webhook_url_validation_success() -> None:
    """Verify valid Discord incoming webhook formats pass validation."""
    provider = DiscordWebhookProvider()

    valid_urls = [
        "https://discord.com/api/webhooks/123456789012345678/abcDEF_123-xyz",
        "https://discordapp.com/api/webhooks/987654321098765432/token_xyz",
        "https://canary.discord.com/api/webhooks/123456789/token_123",
        "https://ptb.discord.com/api/webhooks/123456789/token_123?wait=true",
    ]
    for url in valid_urls:
        provider.validate_destination_url(url)


@pytest.mark.parametrize(
    "invalid_url, expected_error",
    [
        ("", "Webhook URL is required"),
        (
            "http://discord.com/api/webhooks/123456789/token",
            "must use HTTPS scheme",
        ),
        (
            "https://evil-site.com/api/webhooks/123456789/token",
            "must be on discord.com",
        ),
        (
            "https://169.254.169.254/api/webhooks/123456789/token",
            "must be on discord.com",
        ),
        (
            "https://discord.com/api/v10/channels/123",
            "Invalid Discord webhook format",
        ),
        (
            "https://discord.com/api/webhooks/notanumber/token",
            "Invalid Discord webhook format",
        ),
    ],
)
def test_discord_webhook_ssrf_and_url_validation_rejections(
    invalid_url: str, expected_error: str
) -> None:
    """Verify SSRF attempts and malformed URLs are rejected with ValueError."""
    provider = DiscordWebhookProvider()
    with pytest.raises(ValueError, match=expected_error):
        provider.validate_destination_url(invalid_url)


def test_discord_build_test_payload() -> None:
    """Verify Discord test payload is well-formed Embed JSON."""
    provider = DiscordWebhookProvider()
    payload = provider.build_test_payload(workspace_name="Acme Corp")

    assert "embeds" in payload
    assert len(payload["embeds"]) == 1
    embed = payload["embeds"][0]
    assert "Connected Successfully" in embed["title"]
    assert "Acme Corp" in embed["description"]
    assert embed["color"] == 0x10B981


@pytest.mark.asyncio
async def test_discord_dispatch_success_204_no_content() -> None:
    """Verify successful dispatch when Discord returns 204 No Content."""
    provider = DiscordWebhookProvider()
    valid_url = "https://discord.com/api/webhooks/123456789/token123"
    test_payload = {"embeds": [{"title": "Hello"}]}

    mock_response = httpx.Response(
        status_code=204,
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, test_payload)

    assert result.success is True
    assert result.status_code == 204
    assert result.error_message is None
    assert result.is_transient is False


@pytest.mark.asyncio
async def test_discord_dispatch_rate_limit_429_json_retry_after() -> None:
    """Verify HTTP 429 parses retry_after from Discord JSON body."""
    provider = DiscordWebhookProvider()
    valid_url = "https://discord.com/api/webhooks/123456789/token123"

    mock_response = httpx.Response(
        status_code=429,
        json={"message": "You are being rate limited.", "retry_after": 12.4},
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, {"embeds": []})

    assert result.success is False
    assert result.status_code == 429
    assert result.is_transient is True
    assert result.retry_after_seconds == 13
    assert result.error_message is not None
    assert "rate limit exceeded" in result.error_message.lower()


@pytest.mark.asyncio
async def test_discord_dispatch_unknown_webhook_404_revokes() -> None:
    """Verify HTTP 404 triggers immediate connection revocation."""
    provider = DiscordWebhookProvider()
    valid_url = "https://discord.com/api/webhooks/123456789/token123"

    mock_response = httpx.Response(
        status_code=404,
        json={"message": "Unknown Webhook", "code": 10015},
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, {"embeds": []})

    assert result.success is False
    assert result.status_code == 404
    assert result.is_transient is False
    assert result.is_revocation is True


@pytest.mark.asyncio
async def test_discord_dispatch_server_error_502_transient() -> None:
    """Verify 5xx server errors are classified as transient."""
    provider = DiscordWebhookProvider()
    valid_url = "https://discord.com/api/webhooks/123456789/token123"

    mock_response = httpx.Response(
        status_code=502,
        text="Bad Gateway",
        request=httpx.Request("POST", valid_url),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.dispatch(valid_url, {"embeds": []})

    assert result.success is False
    assert result.status_code == 502
    assert result.is_transient is True


@pytest.mark.asyncio
async def test_discord_dispatch_timeout_transient() -> None:
    """Verify timeouts are classified as transient."""
    provider = DiscordWebhookProvider()
    valid_url = "https://discord.com/api/webhooks/123456789/token123"

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ReadTimeout("Timed out")
        result = await provider.dispatch(valid_url, {"embeds": []})

    assert result.success is False
    assert result.status_code is None
    assert result.is_transient is True
    assert "Request timed out" in (result.error_message or "")
