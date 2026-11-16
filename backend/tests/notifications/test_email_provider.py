"""
Unit tests for EmailAlertProvider.
Verifies single-recipient email validation, SMTP error classification, test email payload,
and ProviderRegistry resolution.
"""

import smtplib
from unittest.mock import AsyncMock, patch

import pytest

from app.features.notifications.providers.email import EmailAlertProvider
from app.features.notifications.providers.registry import provider_registry


def test_email_provider_registered_in_registry() -> None:
    """Verify EmailAlertProvider is registered under 'email_alert'."""
    assert provider_registry.is_supported("email_alert")
    provider = provider_registry.get("email_alert")
    assert isinstance(provider, EmailAlertProvider)


def test_email_provider_validation_success() -> None:
    """Verify valid single email addresses pass validation."""
    provider = EmailAlertProvider()
    provider.validate_destination_url("owner@acme.com")
    provider.validate_destination_url("founder.name+alerts@sub.domain.co")


@pytest.mark.parametrize(
    "invalid_email, expected_match",
    [
        ("", "required"),
        ("not-an-email", "Invalid recipient email"),
        ("owner@acme.com, second@acme.com", "single workspace member email"),
        ("owner@acme.com; second@acme.com", "single workspace member email"),
        ("owner@acme.com\r\nBcc:evil@attacker.com", "Invalid characters"),
    ],
)
def test_email_provider_validation_rejections(
    invalid_email: str, expected_match: str
) -> None:
    """Verify invalid syntax, multiple recipients, and CRLF injection are rejected."""
    provider = EmailAlertProvider()
    with pytest.raises(ValueError, match=expected_match):
        provider.validate_destination_url(invalid_email)


def test_email_build_test_payload() -> None:
    """Verify test email payload contains subject and rendered HTML."""
    provider = EmailAlertProvider()
    payload = provider.build_test_payload("Acme SaaS")

    assert payload["event"] == "test.ping"
    assert "Acme SaaS" in payload["subject"]
    assert "Acme SaaS" in payload["html"]
    assert "Channel Verified" in payload["html"]


@pytest.mark.asyncio
async def test_email_dispatch_success() -> None:
    """Verify successful SMTP delivery returns 250 OK."""
    provider = EmailAlertProvider()
    payload = {
        "subject": "[Feedback System] Low Rating Alert",
        "html": "<p>Test Alert</p>",
    }

    with patch(
        "app.features.notifications.providers.email.send_email",
        new_callable=AsyncMock,
    ) as mock_send:
        result = await provider.dispatch("Owner@Acme.com", payload)

    assert result.success is True
    assert result.status_code == 250
    assert result.is_transient is False
    mock_send.assert_awaited_once_with(
        to_email="owner@acme.com",
        subject="[Feedback System] Low Rating Alert",
        html_content="<p>Test Alert</p>",
        raise_on_error=True,
    )


@pytest.mark.asyncio
async def test_email_dispatch_recipient_refused_is_permanent_revocation() -> None:
    """Verify SMTP 550 recipient rejection is classified as permanent revocation."""
    provider = EmailAlertProvider()

    with patch(
        "app.features.notifications.providers.email.send_email",
        new_callable=AsyncMock,
        side_effect=smtplib.SMTPRecipientsRefused(
            {"bounce@acme.com": (550, b"5.1.1 User unknown")}
        ),
    ):
        result = await provider.dispatch(
            "bounce@acme.com",
            {"subject": "Alert", "html": "<p>Body</p>"},
        )

    assert result.success is False
    assert result.status_code == 550
    assert result.is_transient is False
    assert result.is_revocation is True


@pytest.mark.asyncio
async def test_email_dispatch_transient_smtp_421_and_timeout() -> None:
    """Verify SMTP 4xx and network timeouts are classified as transient retryable errors."""
    provider = EmailAlertProvider()

    with patch(
        "app.features.notifications.providers.email.send_email",
        new_callable=AsyncMock,
        side_effect=smtplib.SMTPResponseException(
            421, b"Service temporarily unavailable"
        ),
    ):
        res_421 = await provider.dispatch(
            "owner@acme.com",
            {"subject": "Alert", "html": "<p>Body</p>"},
        )

    assert res_421.success is False
    assert res_421.status_code == 421
    assert res_421.is_transient is True
    assert res_421.is_revocation is False

    with patch(
        "app.features.notifications.providers.email.send_email",
        new_callable=AsyncMock,
        side_effect=TimeoutError("SMTP connection timed out"),
    ):
        res_timeout = await provider.dispatch(
            "owner@acme.com",
            {"subject": "Alert", "html": "<p>Body</p>"},
        )

    assert res_timeout.success is False
    assert res_timeout.is_transient is True
