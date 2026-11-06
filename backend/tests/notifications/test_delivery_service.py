"""
Unit tests for NotificationDeliveryService.
Tests exponential backoff math, atomic claiming, state transitions, circuit breaking, and outbox idempotency.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.models.deliveries import OutboundDelivery
from app.features.notifications.providers.base import ProviderResult
from app.features.notifications.services.delivery_service import (
    NotificationDeliveryService,
)


def test_calculate_backoff_delay_exponential_growth() -> None:
    """Verify exponential backoff calculation increases properly with attempts."""
    delay1 = NotificationDeliveryService.calculate_backoff_delay(attempt_number=1)
    delay2 = NotificationDeliveryService.calculate_backoff_delay(attempt_number=2)
    delay3 = NotificationDeliveryService.calculate_backoff_delay(attempt_number=3)

    # Attempt 1: 5 * 2^0 = 5 (+ uniform(0,3)) -> 5 to 8
    assert 5 <= delay1 <= 8
    # Attempt 2: 5 * 2^1 = 10 (+ uniform(0,3)) -> 10 to 13
    assert 10 <= delay2 <= 13
    # Attempt 3: 5 * 2^2 = 20 (+ uniform(0,3)) -> 20 to 23
    assert 20 <= delay3 <= 23


def test_calculate_backoff_delay_respects_retry_after() -> None:
    """Verify that HTTP 429 Retry-After header overrides computed backoff if larger."""
    delay = NotificationDeliveryService.calculate_backoff_delay(
        attempt_number=1, retry_after=60
    )
    assert delay == 60

    delay_small = NotificationDeliveryService.calculate_backoff_delay(
        attempt_number=3, retry_after=5
    )
    # Computed backoff (~20s) should be larger than small retry_after (5s)
    assert delay_small >= 20


def test_calculate_backoff_delay_cap_at_300() -> None:
    """Verify backoff delay is capped at 300 seconds maximum."""
    delay = NotificationDeliveryService.calculate_backoff_delay(attempt_number=10)
    assert delay <= 303  # 300 + max 3s jitter


@pytest.mark.asyncio
async def test_create_delivery_in_tx_idempotent() -> None:
    """Verify duplicate idempotency_key returns existing delivery without re-creating."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    existing_delivery = MagicMock(spec=OutboundDelivery)
    existing_delivery.id = uuid4()
    service.delivery_repo.get_by_idempotency_key = AsyncMock(
        return_value=existing_delivery
    )
    service.delivery_repo.create = AsyncMock()

    result = await service.create_delivery_in_tx(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="sub_1_rule_2",
        payload_snapshot={"text": "hello"},
    )

    assert result == existing_delivery
    service.delivery_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_process_delivery_already_claimed_returns_false() -> None:
    """Verify that if another worker already claimed the delivery, process_delivery exits cleanly."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=None)

    success = await service.process_delivery(delivery_id=uuid4())
    assert success is False
    session.commit.assert_not_called()


@pytest.mark.asyncio
async def test_process_delivery_cancelled_when_connection_revoked() -> None:
    """Verify delivery transitions to cancelled if connection is paused or revoked."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    delivery = OutboundDelivery(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="key_1",
        status="processing",
        payload_snapshot={},
    )
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=delivery)

    # Connection is revoked
    revoked_conn = MagicMock(spec=NotificationConnection)
    revoked_conn.is_active = False
    revoked_conn.health_status = "revoked"
    service.conn_repo.get_by_id_system = AsyncMock(return_value=revoked_conn)

    success = await service.process_delivery(delivery_id=uuid4())
    assert success is False
    assert delivery.status == "cancelled"
    assert "revoked" in delivery.last_error


@pytest.mark.asyncio
async def test_process_delivery_success_200_ok() -> None:
    """Verify delivery transitions to delivered and success recorded on connection."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    delivery = OutboundDelivery(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="key_1",
        status="processing",
        attempts_count=0,
        payload_snapshot={"text": "test"},
    )
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=delivery)
    service.delivery_repo.record_attempt = AsyncMock()

    conn = MagicMock(spec=NotificationConnection)
    conn.id = uuid4()
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T1/B2/token"
    conn.secret_token = None
    service.conn_repo.get_by_id_system = AsyncMock(return_value=conn)
    service.conn_repo.record_success = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=True,
        status_code=200,
        response_body="ok",
        error_message=None,
        is_transient=False,
    )

    with patch(
        "app.features.notifications.services.delivery_service.provider_registry.get",
        return_value=mock_provider,
    ):
        success = await service.process_delivery(delivery_id=uuid4())

    assert success is True
    assert delivery.status == "delivered"
    assert delivery.delivered_at is not None
    assert delivery.attempts_count == 1
    service.conn_repo.record_success.assert_called_once_with(conn.id)
    service.delivery_repo.record_attempt.assert_called_once()


@pytest.mark.asyncio
async def test_process_delivery_transient_failure_schedules_retry() -> None:
    """Verify transient error transitions delivery to retry_scheduled with future next_retry_at."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    delivery = OutboundDelivery(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="key_1",
        status="processing",
        attempts_count=0,
        max_attempts=4,
        payload_snapshot={"text": "test"},
    )
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=delivery)
    service.delivery_repo.record_attempt = AsyncMock()

    conn = MagicMock(spec=NotificationConnection)
    conn.id = uuid4()
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T1/B2/token"
    conn.secret_token = None
    service.conn_repo.get_by_id_system = AsyncMock(return_value=conn)

    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=False,
        status_code=503,
        response_body="Service Unavailable",
        error_message="Slack server error (HTTP 503)",
        is_transient=True,
    )

    with patch(
        "app.features.notifications.services.delivery_service.provider_registry.get",
        return_value=mock_provider,
    ):
        success = await service.process_delivery(delivery_id=uuid4())

    assert success is False
    assert delivery.status == "retry_scheduled"
    assert delivery.attempts_count == 1
    assert delivery.next_retry_at is not None
    assert delivery.last_error == "Slack server error (HTTP 503)"


@pytest.mark.asyncio
async def test_process_delivery_permanent_failure_trips_circuit_breaker() -> None:
    """Verify permanent 404 marks delivery failed and registers failure on connection."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    delivery = OutboundDelivery(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="key_1",
        status="processing",
        attempts_count=0,
        max_attempts=4,
        payload_snapshot={"text": "test"},
    )
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=delivery)
    service.delivery_repo.record_attempt = AsyncMock()

    conn = MagicMock(spec=NotificationConnection)
    conn.id = uuid4()
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T1/B2/token"
    conn.secret_token = None
    service.conn_repo.get_by_id_system = AsyncMock(return_value=conn)
    service.conn_repo.record_failure = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=False,
        status_code=404,
        response_body="channel_not_found",
        error_message="Slack rejected webhook (HTTP 404): channel_not_found",
        is_transient=False,
        is_revocation=True,  # 404 is a confirmed revocation
    )

    with patch(
        "app.features.notifications.services.delivery_service.provider_registry.get",
        return_value=mock_provider,
    ):
        success = await service.process_delivery(delivery_id=uuid4())

    assert success is False
    assert delivery.status == "failed"
    assert delivery.attempts_count == 1
    # Must record failure with is_permanent=True
    service.conn_repo.record_failure.assert_called_once_with(
        connection_id=conn.id,
        reason="Slack rejected webhook (HTTP 404): channel_not_found",
        is_permanent=True,
        trip_threshold=5,
    )


@pytest.mark.asyncio
async def test_process_delivery_http_400_fails_delivery_without_revocation() -> None:
    """Verify HTTP 400 (formatting bug) fails the delivery but does NOT trip connection revocation."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    delivery = OutboundDelivery(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="key_400",
        status="processing",
        attempts_count=0,
        max_attempts=4,
        payload_snapshot={"text": "bad_format"},
    )
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=delivery)
    service.delivery_repo.record_attempt = AsyncMock()

    conn = MagicMock(spec=NotificationConnection)
    conn.id = uuid4()
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T1/B2/token"
    conn.secret_token = None
    conn.paused_until = None
    service.conn_repo.get_by_id_system = AsyncMock(return_value=conn)
    service.conn_repo.record_failure = AsyncMock()

    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=False,
        status_code=400,
        response_body="invalid_blocks",
        error_message="Slack rejected webhook (HTTP 400): invalid_blocks",
        is_transient=False,
        is_revocation=False,  # Formatting error is NOT a channel revocation
    )

    with patch(
        "app.features.notifications.services.delivery_service.provider_registry.get",
        return_value=mock_provider,
    ):
        success = await service.process_delivery(delivery_id=uuid4())

    assert success is False
    assert delivery.status == "failed"
    # Connection failure recorded with is_permanent=False (will not revoke active connection)
    service.conn_repo.record_failure.assert_called_once_with(
        connection_id=conn.id,
        reason="Slack rejected webhook (HTTP 400): invalid_blocks",
        is_permanent=False,
        trip_threshold=5,
    )


@pytest.mark.asyncio
async def test_process_delivery_paused_when_rate_limited() -> None:
    """Verify delivery reschedules without dispatching when connection has active paused_until."""
    session = AsyncMock()
    service = NotificationDeliveryService(session)

    delivery = OutboundDelivery(
        workspace_id=uuid4(),
        connection_id=uuid4(),
        idempotency_key="key_429",
        status="processing",
        attempts_count=0,
        payload_snapshot={"text": "test"},
    )
    service.delivery_repo.claim_for_processing = AsyncMock(return_value=delivery)

    future_pause = datetime.now(UTC) + timedelta(seconds=60)
    conn = MagicMock(spec=NotificationConnection)
    conn.id = uuid4()
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.paused_until = future_pause
    service.conn_repo.get_by_id_system = AsyncMock(return_value=conn)

    mock_provider = AsyncMock()

    with patch(
        "app.features.notifications.services.delivery_service.provider_registry.get",
        return_value=mock_provider,
    ):
        success = await service.process_delivery(delivery_id=uuid4())

    assert success is False
    assert delivery.status == "retry_scheduled"
    assert delivery.next_retry_at == future_pause
    # Provider dispatch must NOT have been called while paused
    mock_provider.dispatch.assert_not_called()


