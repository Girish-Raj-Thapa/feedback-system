"""
Unit tests for NotificationConnectionService and Slack Webhook URL masking.
Verifies connection lifecycle, SSRF validation, test dispatching, and credential masking.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.core.errors import ValidationError
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
    """Verify webhook URL secret token is masked for Slack, Discord, and generic URLs."""
    url = "https://hooks.slack.com/services/T_SAMPLE/B_SAMPLE/sample_token_7890"
    masked = mask_webhook_url(url)
    assert masked == "https://hooks.slack.com/services/T_SAMPLE/B_SAMPLE/****7890"
    assert "sample_token" not in masked

    discord_url = "https://discord.com/api/webhooks/1234567890/secret_discord_token_9876"
    masked_discord = mask_webhook_url(discord_url)
    assert masked_discord == "https://discord.com/api/webhooks/1234567890/****9876"
    assert "secret_discord_token" not in masked_discord

    # Generic short URL
    assert mask_webhook_url("") == ""
    assert mask_webhook_url("http://short.co") == "******"

    # Email recipient masking
    assert mask_webhook_url("founder@acme.com") == "fo***@acme.com"
    assert mask_webhook_url("a@b.co") == "a***@b.co"


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

    with (
        patch.object(
            service.quota_service,
            "enforce_connection_creation_quota",
            new_callable=AsyncMock,
        ),
        patch.object(
            service.connection_repo, "create", return_value=created_conn
        ),
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

    with patch.object(
        service.quota_service,
        "enforce_connection_creation_quota",
        new_callable=AsyncMock,
    ):
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
        patch.object(
            service.quota_service,
            "enforce_test_ping_rate_limit",
            new_callable=AsyncMock,
        ),
        patch.object(service.connection_repo, "get_by_id", return_value=conn),
        patch.object(
            service.connection_repo,
            "get_workspace_name",
            new_callable=AsyncMock,
            return_value="acme-corp",
        ),
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
    assert dto.has_secret_token is False

    conn_with_secret = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Custom JSON Hook",
        provider_type="generic_webhook",
        destination_url="https://webhooks.example.com/events",
        secret_token="hmac_secret_value",
        is_active=True,
        health_status="healthy",
    )
    dto_secret = NotificationConnectionRead.from_model(conn_with_secret)
    assert dto_secret.has_secret_token is True


@pytest.mark.asyncio
async def test_create_email_alert_connection_requires_verified_workspace_member() -> None:
    """Verify email_alert connections enforce verified workspace member lookup."""
    session = AsyncMock()
    service = NotificationConnectionService(session)
    workspace_id = uuid4()

    payload = NotificationConnectionCreate(
        name="Owner Email Alerts",
        provider_type="email_alert",
        destination_url="owner@acme.com",
    )

    # 1. Non-member email is rejected
    with (
        patch.object(
            service.quota_service,
            "enforce_connection_creation_quota",
            new_callable=AsyncMock,
        ),
        patch.object(
            service,
            "_verify_workspace_member_email",
            new_callable=AsyncMock,
            side_effect=ValidationError(
                "Email alert recipient must be an active, verified member of this workspace"
            ),
        ),
        pytest.raises(ValidationError, match="verified member"),
    ):
        await service.create_connection(workspace_id, payload)

    # 2. Verified workspace member succeeds
    created_conn = NotificationConnection(
        id=uuid4(),
        workspace_id=workspace_id,
        name="Owner Email Alerts",
        provider_type="email_alert",
        destination_url="owner@acme.com",
        is_active=True,
        health_status="healthy",
    )
    with (
        patch.object(
            service.quota_service,
            "enforce_connection_creation_quota",
            new_callable=AsyncMock,
        ),
        patch.object(
            service,
            "_verify_workspace_member_email",
            new_callable=AsyncMock,
            return_value="owner@acme.com",
        ),
        patch.object(
            service.connection_repo,
            "create",
            return_value=created_conn,
        ),
    ):
        res = await service.create_connection(workspace_id, payload)
        assert res.provider_type == "email_alert"
        assert res.destination_url == "owner@acme.com"


@pytest.mark.asyncio
async def test_free_vs_pro_quota_enforcement() -> None:
    """Verify Free vs Pro connection creation and monthly/hourly dispatch limits."""
    from datetime import UTC, datetime

    from app.features.notifications.services.quota_service import (
        PLAN_QUOTA_MATRIX,
        NotificationQuotaService,
        WorkspaceNotificationQuotaStatus,
        resolve_plan_tier,
    )

    assert resolve_plan_tier("free") == "free"
    assert resolve_plan_tier("pro") == "pro"
    assert resolve_plan_tier("growth") == "pro"

    session = AsyncMock()
    quota_svc = NotificationQuotaService(session)
    ws_id = uuid4()

    # Free plan max_connections = 2 -> blocked when count == 2
    with (
        patch.object(
            quota_svc.quota_repo,
            "get_workspace_plan_and_connection_count",
            new_callable=AsyncMock,
            return_value=("free", 2),
        ),
        pytest.raises(ValidationError, match="Free plan limit reached"),
    ):
        await quota_svc.enforce_connection_creation_quota(ws_id)

    # Free plan monthly_email_alerts = 25 -> blocked when monthly_used == 25
    with patch.object(
        quota_svc,
        "get_quota_status",
        new_callable=AsyncMock,
        return_value=WorkspaceNotificationQuotaStatus(
            plan_tier="free",
            limits=PLAN_QUOTA_MATRIX["free"],
            connections_used=1,
            alert_rules_used=1,
            monthly_email_used=25,
            monthly_webhook_used=0,
            hourly_email_used=0,
            hourly_webhook_used=0,
            cycle_starts_at=datetime.now(UTC),
        ),
    ):
        allowed, reason = await quota_svc.can_dispatch_alert(ws_id, "email_alert")
        assert allowed is False
        assert reason is not None
        assert "25" in reason
        assert "Upgrade to Pro" in reason


@pytest.mark.asyncio
async def test_test_ping_rate_limit_blocks_excess_and_prod_redis_failure() -> None:
    """Verify Redis test ping rate limit raises at threshold and fails closed in production."""
    from types import SimpleNamespace

    from app.features.notifications.services.quota_service import (
        NotificationQuotaService,
    )

    session = AsyncMock()
    quota_svc = NotificationQuotaService(session)
    ws_id = uuid4()

    mock_redis = AsyncMock()
    mock_redis.incr = AsyncMock(return_value=6)  # Free limit is 5 per 10 min

    with (
        patch.object(
            quota_svc.quota_repo,
            "get_workspace_plan_tier",
            new_callable=AsyncMock,
            return_value="free",
        ),
        patch("app.core.redis.get_redis", return_value=mock_redis),
        pytest.raises(ValidationError, match="Test rate limit reached"),
    ):
        await quota_svc.enforce_test_ping_rate_limit(ws_id)

    # In production, Redis outage should surface cleanly rather than silently bypassing rate limit
    broken_redis = AsyncMock()
    broken_redis.incr = AsyncMock(side_effect=ConnectionError("redis down"))

    with (
        patch.object(
            quota_svc.quota_repo,
            "get_workspace_plan_tier",
            new_callable=AsyncMock,
            return_value="free",
        ),
        patch("app.core.redis.get_redis", return_value=broken_redis),
        patch("app.core.config.settings", SimpleNamespace(is_production=True)),
        pytest.raises(ValidationError, match="Rate limiting service"),
    ):
        await quota_svc.enforce_test_ping_rate_limit(ws_id)


