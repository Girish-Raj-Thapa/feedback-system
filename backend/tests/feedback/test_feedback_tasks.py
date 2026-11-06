"""
Unit tests for Feedback background tasks:
Tests asynchronous alert evaluation, poison submission guards, zero-match markers,
and self-healing reconciliation sweeper.
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.tasks import (
    evaluate_submission_alerts_task,
    reconcile_unnotified_submissions_task,
)


@pytest.mark.asyncio
async def test_evaluate_submission_alerts_success_creates_deliveries() -> None:
    """Verify evaluation matches rules, creates outbox delivery, sets alert_evaluated_at."""
    sub_id = uuid4()
    ws_id = uuid4()
    conn_id = uuid4()
    rule_id = uuid4()

    mock_sub = MagicMock(spec=FeedbackSubmission)
    mock_sub.id = sub_id
    mock_sub.workspace_id = ws_id
    mock_sub.alert_evaluated_at = None
    mock_sub.alert_evaluation_attempts = 0
    mock_sub.rating = 2
    mock_sub.rating_scale_type = "5_star"
    mock_sub.comment = "Bad service"
    mock_sub.customer_email = "test@example.com"
    mock_sub.customer_name = "Alice"
    mock_sub.category_pill_label = "Bug"
    mock_sub.workspace = MagicMock(slug="acme")
    mock_sub.form = MagicMock(title="Exit Survey")
    mock_sub.category = MagicMock(name="Bug")

    mock_rule = MagicMock(spec=AlertRule)
    mock_rule.id = rule_id
    mock_rule.connection_id = conn_id
    mock_rule.name = "Detractor Alerts"
    mock_rule.include_customer_email = True

    mock_session = AsyncMock()
    # Mock scalar_one_or_none returning the submission
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_sub
    mock_session.execute.return_value = mock_result

    mock_evaluator = AsyncMock()
    mock_evaluator.find_matching_rules.return_value = [mock_rule]

    mock_delivery = MagicMock(id=uuid4())
    mock_delivery_service = AsyncMock()
    mock_delivery_service.create_delivery_in_tx.return_value = mock_delivery

    with (
        patch(
            "app.features.feedback.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=mock_session),
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
        result = await evaluate_submission_alerts_task(str(sub_id))

    assert result is True
    assert mock_sub.alert_evaluation_attempts == 1
    assert mock_sub.alert_evaluated_at is not None
    mock_delivery_service.create_delivery_in_tx.assert_called_once()
    mock_dispatch_kiq.assert_called_once_with(str(mock_delivery.id))
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_evaluate_submission_alerts_zero_matches_marks_evaluated() -> None:
    """Verify submissions matching 0 rules still get marked alert_evaluated_at to avoid re-eval loops."""
    sub_id = uuid4()
    ws_id = uuid4()

    mock_sub = MagicMock(spec=FeedbackSubmission)
    mock_sub.id = sub_id
    mock_sub.workspace_id = ws_id
    mock_sub.alert_evaluated_at = None
    mock_sub.alert_evaluation_attempts = 0
    mock_sub.rating = 5
    mock_sub.workspace = MagicMock(slug="acme")
    mock_sub.form = MagicMock(title="Exit Survey")
    mock_sub.category = None

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_sub
    mock_session.execute.return_value = mock_result

    mock_evaluator = AsyncMock()
    mock_evaluator.find_matching_rules.return_value = []  # 0 matches

    with (
        patch(
            "app.features.feedback.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=mock_session),
                __aexit__=AsyncMock(return_value=None),
            ),
        ),
        patch(
            "app.features.feedback.tasks.AlertEvaluatorService",
            return_value=mock_evaluator,
        ),
    ):
        result = await evaluate_submission_alerts_task(str(sub_id))

    assert result is True
    assert mock_sub.alert_evaluated_at is not None
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_evaluate_submission_alerts_already_evaluated_is_noop() -> None:
    """Verify re-running task on already-evaluated submission exits immediately."""
    sub_id = uuid4()
    mock_sub = MagicMock(spec=FeedbackSubmission)
    mock_sub.id = sub_id
    mock_sub.alert_evaluated_at = datetime.now(UTC)  # Already evaluated

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_sub
    mock_session.execute.return_value = mock_result

    with patch(
        "app.features.feedback.tasks.async_session_factory",
        return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_session),
            __aexit__=AsyncMock(return_value=None),
        ),
    ):
        result = await evaluate_submission_alerts_task(str(sub_id))

    assert result is True


@pytest.mark.asyncio
async def test_evaluate_submission_poison_guard_stops_at_max_attempts() -> None:
    """Verify poison submissions that fail 5 times are abandoned and not retried forever."""
    sub_id = uuid4()
    mock_sub = MagicMock(spec=FeedbackSubmission)
    mock_sub.id = sub_id
    mock_sub.alert_evaluated_at = None
    mock_sub.alert_evaluation_attempts = 5  # Already tried 5 times

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_sub
    mock_session.execute.return_value = mock_result

    with patch(
        "app.features.feedback.tasks.async_session_factory",
        return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_session),
            __aexit__=AsyncMock(return_value=None),
        ),
    ):
        result = await evaluate_submission_alerts_task(str(sub_id))

    assert result is False
    # Marked evaluated so sweeper drops it from queue
    assert mock_sub.alert_evaluated_at is not None
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_reconcile_unnotified_submissions_enqueues_batch() -> None:
    """Verify sweeper batches un-evaluated submissions and calls evaluate_submission_alerts_task.kiq."""
    sub_ids = [uuid4(), uuid4(), uuid4()]

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = sub_ids
    mock_session.execute.return_value = mock_result

    with (
        patch(
            "app.features.feedback.tasks.async_session_factory",
            return_value=AsyncMock(
                __aenter__=AsyncMock(return_value=mock_session),
                __aexit__=AsyncMock(return_value=None),
            ),
        ),
        patch(
            "app.features.feedback.tasks.evaluate_submission_alerts_task.kiq",
            new_callable=AsyncMock,
        ) as mock_eval_kiq,
    ):
        enqueued = await reconcile_unnotified_submissions_task(batch_size=50)

    assert enqueued == 3
    assert mock_eval_kiq.call_count == 3

