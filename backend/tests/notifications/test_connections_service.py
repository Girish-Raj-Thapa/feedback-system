"""
Unit tests for NotificationConnectionService and Slack Webhook URL masking.
Verifies connection lifecycle, SSRF validation, test dispatching, and credential masking.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.errors import NotFoundError, ValidationError
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.providers.base import ProviderResult
from app.features.notifications.schemas import (
    NotificationConnectionCreate,
    NotificationConnectionRead,
    NotificationConnectionUpdate,
    mask_webhook_url,
)
from app.features.notifications.services.connection_service import (
    NotificationConnectionService,
    format_slack_test_card,
)


def test_mask_webhook_url() -> None:
    """Verify webhook URL secret token is masked."""
    url = "https://hooks.slack.com/services/T_SAMPLE/B_SAMPLE/sample_token_7890"
    masked = mask_webhook_url(url)
    assert masked == "https://hooks.slack.com/services/T_SAMPLE/B_SAMPLE/****7890"
    assert "sample_token" not in masked

    # Generic short URL
    assert mask_webhook_url("") == ""
    assert mask_webhook_url("http://short.co") == "******"


def test_format_slack_test_card() -> None:
    """Verify test Slack card Block Kit structure."""
    card = format_slack_test_card("acme-corp", "#churn-alerts")
    assert "🔔 FeedbackFlow Test" in card["text"]
    assert len(card["blocks"]) >= 3
    blocks_str = str(card["blocks"])
    assert "acme-corp" in blocks_str
    assert "#churn-alerts" in blocks_str


@pytest.mark.asyncio
async def test_create_connection_success() -> None:
    """Verify creating a connection with valid Slack URL succeeds and flushes."""
    session = AsyncMock()
    service = NotificationConnectionService(session)

    valid_url = "https://hooks.slack.com/services/T1111/B2222/token3333"
    payload = NotificationConnectionCreate(
        name="Team Alerts",
        provider_type="slack_webhook",
        destination_url=valid_url,
    )
    workspace_id = uuid4()

    created_conn = NotificationConnection(
        id=uuid4(),
        workspace_id=workspace_id,
        name="Team Alerts",
        provider_type="slack_webhook",
        destination_url=valid_url,
        is_active=True,
        health_status="healthy",
    )

    with patch.object(
        service.connection_repo, "create", return_value=created_conn
    ):
        result = await service.create_connection(workspace_id, payload)
        assert result.name == "Team Alerts"
        assert result.destination_url == valid_url
        assert session.commit.called


@pytest.mark.asyncio
async def test_create_connection_invalid_ssrf_url() -> None:
    """Verify invalid URL schemes or hosts are rejected before database insert."""
    session = AsyncMock()
    service = NotificationConnectionService(session)

    # 1. Plain HTTP
    with pytest.raises(ValidationError, match="HTTPS"):
        await service.create_connection(
            uuid4(),
            NotificationConnectionCreate(
                name="Bad Scheme",
                provider_type="slack_webhook",
                destination_url="http://hooks.slack.com/services/T1/B2/token",
            ),
        )

    # 2. SSRF Host
    with pytest.raises(ValidationError, match="hooks.slack.com"):
        await service.create_connection(
            uuid4(),
            NotificationConnectionCreate(
                name="Evil Host",
                provider_type="slack_webhook",
                destination_url="https://evil-attacker.com/services/T1/B2/token",
            ),
        )


@pytest.mark.asyncio
async def test_update_connection_resets_health_on_url_change() -> None:
    """Verify updating the webhook URL resets circuit breaker failure counters."""
    session = AsyncMock()
    service = NotificationConnectionService(session)

    workspace_id = uuid4()
    conn_id = uuid4()
    conn = NotificationConnection(
        id=conn_id,
        workspace_id=workspace_id,
        name="Old Name",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/oldtoken",
        is_active=False,
        health_status="revoked",
        consecutive_failures=5,
        failure_reason="Channel archived",
    )

    with patch.object(service.connection_repo, "get_by_id", return_value=conn):
        new_url = "https://hooks.slack.com/services/T1/B2/newtoken123"
        update_payload = NotificationConnectionUpdate(
            name="New Name",
            destination_url=new_url,
            is_active=True,
        )
        updated = await service.update_connection(
            workspace_id, conn_id, update_payload
        )

        assert updated.name == "New Name"
        assert updated.destination_url == new_url
        assert updated.is_active is True
        assert updated.health_status == "healthy"
        assert updated.consecutive_failures == 0
        assert updated.failure_reason is None
        assert session.commit.called


@pytest.mark.asyncio
async def test_test_connection_dispatch() -> None:
    """Verify test_connection dispatches test card and logs success."""
    session = AsyncMock()
    service = NotificationConnectionService(session)

    workspace_id = uuid4()
    conn_id = uuid4()
    conn = NotificationConnection(
        id=conn_id,
        workspace_id=workspace_id,
        name="Slack Dev",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/testtoken",
        is_active=True,
        health_status="healthy",
    )

    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=True,
        status_code=200,
        response_body="ok",
        error_message=None,
        is_transient=False,
    )

    with (
        patch.object(service.connection_repo, "get_by_id", return_value=conn),
        patch.object(service.registry, "get", return_value=mock_provider),
        patch.object(
            service.connection_repo, "record_success"
        ) as mock_record_success,
    ):
        result = await service.test_connection(workspace_id, conn_id)

        assert result.success is True
        assert mock_provider.dispatch.called
        mock_record_success.assert_called_with(conn_id)


def test_schema_serialization_masks_url() -> None:
    """Verify NotificationConnectionRead schema correctly masks webhook token."""
    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Security Test",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T123/B456/SECRET9876",
        is_active=True,
        health_status="healthy",
    )
    dto = NotificationConnectionRead.from_model(conn)
    assert dto.destination_url_masked.startswith(
        "https://hooks.slack.com/services/T123/B456/"
    )
    assert "SECRET" not in dto.destination_url_masked
    assert dto.destination_url_masked.endswith("9876")
