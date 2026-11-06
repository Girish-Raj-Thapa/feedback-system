"""
End-to-End Integration Tests for Notifications Pipeline:
Tests submission alert evaluation -> outbox delivery persistence -> provider dispatch -> circuit breaking.
Verifies cross-module imports and mappers across the full lifecycle.
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.tasks import evaluate_submission_alerts_task
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.models.deliveries import OutboundDelivery
from app.features.notifications.providers.base import ProviderResult
from app.features.notifications.tasks import dispatch_outbound_delivery_task


@pytest.mark.asyncio
async def test_full_pipeline_evaluation_to_slack_delivery_success() -> None:
    """
    End-to-End Test:
    1. Submission is evaluated.
    2. OutboundDelivery is written to outbox.
    3. Dispatch task sends Block Kit to Slack (mocked).
    4. Delivery transitions to 'delivered' and submission marked evaluated.
    """
    sub_id = uuid4()
    ws_id = uuid4()
    conn_id = uuid4()
    rule_id = uuid4()
    delivery_id = uuid4()

    # Setup Submission
    sub = MagicMock(spec=FeedbackSubmission)
    sub.id = sub_id
    sub.workspace_id = ws_id
    sub.alert_evaluated_at = None
    sub.alert_evaluation_attempts = 0
    sub.rating = 2
    sub.rating_scale_type = "5_star"
    sub.comment = "Urgent: payment processing broken"
    sub.customer_email = "lead@acme.com"
    sub.customer_name = "Jane"
    sub.category_pill_label = "Bug"
    sub.workspace = MagicMock(slug="acme-saas")
    sub.form = MagicMock(title="Checkout Feedback")
    sub.category = MagicMock(name="Billing Bug")

    # Setup Rule
    rule = MagicMock(spec=AlertRule)
    rule.id = rule_id
    rule.connection_id = conn_id
    rule.name = "Checkout Detractors"
    rule.include_customer_email = True

    # Setup Connection
    conn = MagicMock(spec=NotificationConnection)
    conn.id = conn_id
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T111/B222/token999"
    conn.secret_token = None
    conn.paused_until = None

    # Setup Delivery
    delivery = OutboundDelivery(
        id=delivery_id,
        workspace_id=ws_id,
        connection_id=conn_id,
        alert_rule_id=rule_id,
        idempotency_key=f"sub_{sub_id}_rule_{rule_id}",
        status="pending",
        attempts_count=0,
        payload_snapshot={},
    )

    # 1. Mock DB Session for Phase 1 (Evaluation)
    eval_session = AsyncMock()
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = sub
    eval_session.execute.return_value = eval_res

    mock_evaluator = AsyncMock()
    mock_evaluator.find_matching_rules.return_value = [rule]

    mock_delivery_service = AsyncMock()
    mock_delivery_service.create_delivery_in_tx.return_value = delivery

    # 2. Mock DB Session for Phase 2 (Dispatch)
    dispatch_session = AsyncMock()
    mock_delivery_repo = AsyncMock()
    mock_delivery_repo.claim_for_processing.return_value = delivery
    mock_conn_repo = AsyncMock()
    mock_conn_repo.get_by_id_system.return_value = conn

    # 3. Mock Slack HTTP Provider
    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=True,
        status_code=200,
        response_body="ok",
        error_message=None,
        is_transient=False,
    )

    # Execute Phase 1: Alert Evaluation
    with (
        patch(
            "app.features.feedback.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=eval_session),
                __aexit__=AsyncMock(return_value=None),
            ),
        ),
        patch(
            "app.features.feedback.tasks.AlertEvaluatorService",
            return_value=mock_evaluator,
        ),
        patch(
            "app.features.feedback.tasks.NotificationDeliveryService",
            return_value=mock_delivery_service,
        ),
        patch(
            "app.features.feedback.tasks.dispatch_outbound_delivery_task.kiq",
            new_callable=AsyncMock,
        ) as mock_dispatch_kiq,
    ):
        eval_ok = await evaluate_submission_alerts_task(str(sub_id))

    assert eval_ok is True
    assert sub.alert_evaluated_at is not None
    mock_dispatch_kiq.assert_called_once_with(str(delivery_id))

    # Execute Phase 2: Outbound Dispatch
    with (
        patch(
            "app.features.notifications.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=dispatch_session),
                __aexit__=AsyncMock(return_value=None),
            ),
        ),
        patch(
            "app.features.notifications.services.delivery_service.OutboundDeliveryRepository",
            return_value=mock_delivery_repo,
        ),
        patch(
            "app.features.notifications.services.delivery_service.NotificationConnectionRepository",
            return_value=mock_conn_repo,
        ),
        patch(
            "app.features.notifications.services.delivery_service.provider_registry.get",
            return_value=mock_provider,
        ),
    ):
        dispatch_ok = await dispatch_outbound_delivery_task(str(delivery_id))

    assert dispatch_ok is True
    assert delivery.status == "delivered"
    assert delivery.attempts_count == 1
    mock_conn_repo.record_success.assert_called_once_with(conn.id)


@pytest.mark.asyncio
async def test_pipeline_http_400_fails_delivery_without_revoking_connection() -> None:
    """
    Regression Test: If Slack rejects with 400 (bad format/block), delivery fails
    but connection health remains untouched.
    """
    delivery_id = uuid4()
    conn_id = uuid4()

    delivery = OutboundDelivery(
        id=delivery_id,
        workspace_id=uuid4(),
        connection_id=conn_id,
        idempotency_key="key_test_400",
        status="processing",
        attempts_count=0,
        payload_snapshot={},
    )

    conn = MagicMock(spec=NotificationConnection)
    conn.id = conn_id
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T111/B222/token999"
    conn.secret_token = None
    conn.paused_until = None

    dispatch_session = AsyncMock()
    mock_delivery_repo = AsyncMock()
    mock_delivery_repo.claim_for_processing.return_value = delivery
    mock_conn_repo = AsyncMock()
    mock_conn_repo.get_by_id_system.return_value = conn

    # Mock Slack rejecting with HTTP 400 invalid_blocks
    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=False,
        status_code=400,
        response_body="invalid_blocks",
        error_message="Slack rejected webhook (HTTP 400): invalid_blocks",
        is_transient=False,
        is_revocation=False,
    )

    with (
        patch(
            "app.features.notifications.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=dispatch_session),
                __aexit__=AsyncMock(return_value=None),
            ),
        ),
        patch(
            "app.features.notifications.services.delivery_service.OutboundDeliveryRepository",
            return_value=mock_delivery_repo,
        ),
        patch(
            "app.features.notifications.services.delivery_service.NotificationConnectionRepository",
            return_value=mock_conn_repo,
        ),
        patch(
            "app.features.notifications.services.delivery_service.provider_registry.get",
            return_value=mock_provider,
        ),
    ):
        dispatch_ok = await dispatch_outbound_delivery_task(str(delivery_id))

    assert dispatch_ok is False
    assert delivery.status == "failed"
    # is_permanent must be False so connection health is NOT revoked
    mock_conn_repo.record_failure.assert_called_once_with(
        connection_id=conn.id,
        reason="Slack rejected webhook (HTTP 400): invalid_blocks",
        is_permanent=False,
        trip_threshold=5,
    )


@pytest.mark.asyncio
async def test_pipeline_http_404_revokes_uninstalled_connection() -> None:
    """
    Regression Test: If Slack rejects with 404/410 (channel deleted/uninstalled),
    delivery fails AND connection is marked revoked immediately.
    """
    delivery_id = uuid4()
    conn_id = uuid4()

    delivery = OutboundDelivery(
        id=delivery_id,
        workspace_id=uuid4(),
        connection_id=conn_id,
        idempotency_key="key_test_404",
        status="processing",
        attempts_count=0,
        payload_snapshot={},
    )

    conn = MagicMock(spec=NotificationConnection)
    conn.id = conn_id
    conn.is_active = True
    conn.health_status = "healthy"
    conn.provider_type = "slack_webhook"
    conn.destination_url = "https://hooks.slack.com/services/T111/B222/token999"
    conn.secret_token = None
    conn.paused_until = None

    dispatch_session = AsyncMock()
    mock_delivery_repo = AsyncMock()
    mock_delivery_repo.claim_for_processing.return_value = delivery
    mock_conn_repo = AsyncMock()
    mock_conn_repo.get_by_id_system.return_value = conn

    # Mock Slack rejecting with HTTP 404 channel_not_found
    mock_provider = AsyncMock()
    mock_provider.dispatch.return_value = ProviderResult(
        success=False,
        status_code=404,
        response_body="channel_not_found",
        error_message="Slack rejected webhook (HTTP 404): channel_not_found",
        is_transient=False,
        is_revocation=True,
    )

    with (
        patch(
            "app.features.notifications.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=dispatch_session),
                __aexit__=AsyncMock(return_value=None),
            ),
        ),
        patch(
            "app.features.notifications.services.delivery_service.OutboundDeliveryRepository",
            return_value=mock_delivery_repo,
        ),
        patch(
            "app.features.notifications.services.delivery_service.NotificationConnectionRepository",
            return_value=mock_conn_repo,
        ),
        patch(
            "app.features.notifications.services.delivery_service.provider_registry.get",
            return_value=mock_provider,
        ),
    ):
        dispatch_ok = await dispatch_outbound_delivery_task(str(delivery_id))

    assert dispatch_ok is False
    assert delivery.status == "failed"
    # is_permanent must be True -> immediately trips circuit breaker to 'revoked'
    mock_conn_repo.record_failure.assert_called_once_with(
        connection_id=conn.id,
        reason="Slack rejected webhook (HTTP 404): channel_not_found",
        is_permanent=True,
        trip_threshold=5,
    )

