"""
Taskiq background tasks for Feedback Submissions:
Asynchronous alert evaluation and periodic reconciliation sweeper.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.core.tasks import broker
from app.db.session import async_session_factory
from app.features.feedback.formatters.slack_voc import format_slack_voc_payload
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.services.alert_evaluator import AlertEvaluatorService
from app.features.notifications.services.delivery_service import (
    NotificationDeliveryService,
)
from app.features.notifications.tasks import dispatch_outbound_delivery_task

logger = get_logger("app.features.feedback.tasks")


@broker.task
async def evaluate_submission_alerts_task(submission_id_str: str) -> bool:
    """
    Asynchronously evaluates alert rules for a newly created submission,
    persists OutboundDelivery records into PostgreSQL, and enqueues dispatch tasks.
    Idempotent and resilient to crashes.
    """
    logger.info("feedback.alerts.eval_started", submission_id=submission_id_str)
    try:
        submission_id = UUID(submission_id_str)
    except (ValueError, TypeError) as exc:
        logger.error(
            "feedback.alerts.invalid_uuid",
            submission_id=submission_id_str,
            error=str(exc),
        )
        return False

    delivery_ids_to_dispatch: list[UUID] = []

    async with async_session_factory() as session:
        # 1. Fetch submission with eager-loaded relations
        stmt = (
            select(FeedbackSubmission)
            .where(FeedbackSubmission.id == submission_id)
            .options(
                selectinload(FeedbackSubmission.workspace),
                selectinload(FeedbackSubmission.form),
                selectinload(FeedbackSubmission.category),
            )
            .with_for_update(skip_locked=True)
        )
        result = await session.execute(stmt)
        submission = result.scalar_one_or_none()

        if not submission:
            logger.debug(
                "feedback.alerts.already_locked_or_missing",
                submission_id=submission_id_str,
            )
            return False

        # Idempotency check: already evaluated
        if submission.alert_evaluated_at is not None:
            logger.info(
                "feedback.alerts.already_evaluated",
                submission_id=submission_id_str,
            )
            return True

        submission.alert_evaluation_attempts += 1

        # Poison submission guard: abandon after 5 failed attempts
        if submission.alert_evaluation_attempts > 5:
            logger.error(
                "feedback.alerts.poison_submission_abandoned",
                submission_id=submission_id_str,
                attempts=submission.alert_evaluation_attempts,
            )
            submission.alert_evaluated_at = datetime.now(UTC)
            await session.commit()
            return False

        try:
            alert_evaluator = AlertEvaluatorService(session)
            matched_rules = await alert_evaluator.find_matching_rules(
                submission, submission.workspace_id
            )

            if matched_rules:
                delivery_service = NotificationDeliveryService(session)
                form_title = submission.form.title if submission.form else "Feedback"
                category_name = (
                    submission.category.name
                    if submission.category
                    else submission.category_pill_label
                )
                workspace_slug = (
                    submission.workspace.slug if submission.workspace else ""
                )

                for rule in matched_rules:
                    payload_snapshot = format_slack_voc_payload(
                        submission=submission,
                        rule=rule,
                        workspace_slug=workspace_slug,
                        form_title=form_title,
                        category_name=category_name,
                    )
                    idempotency_key = f"sub_{submission.id}_rule_{rule.id}"
                    delivery = await delivery_service.create_delivery_in_tx(
                        workspace_id=submission.workspace_id,
                        connection_id=rule.connection_id,
                        alert_rule_id=rule.id,
                        idempotency_key=idempotency_key,
                        payload_snapshot=payload_snapshot,
                    )
                    if delivery:
                        delivery_ids_to_dispatch.append(delivery.id)

            # Mark evaluated regardless of whether 0 or N rules matched
            submission.alert_evaluated_at = datetime.now(UTC)
            await session.commit()

        except Exception as exc:
            logger.error(
                "feedback.alerts.evaluation_failed",
                submission_id=submission_id_str,
                attempts=submission.alert_evaluation_attempts,
                error=str(exc),
            )
            await session.commit()  # commit incremented attempt counter
            return False

    # 2. Dispatch deliveries via worker
    for d_id in delivery_ids_to_dispatch:
        try:
            await dispatch_outbound_delivery_task.kiq(str(d_id))
        except Exception as exc:
            logger.warning(
                "feedback.alerts.dispatch_enqueue_failed",
                delivery_id=str(d_id),
                error=str(exc),
            )

    logger.info(
        "feedback.alerts.eval_completed",
        submission_id=submission_id_str,
        deliveries_created=len(delivery_ids_to_dispatch),
    )
    return True


@broker.task
async def reconcile_unnotified_submissions_task(batch_size: int = 50) -> int:
    """
    Self-healing reconciliation sweeper:
    Finds feedback submissions from the past 7 days that were never evaluated
    (due to worker outages, redis crashes, or bad code deployments) and enqueues them.
    Limits to batch_size to prevent task spikes.
    """
    logger.info("feedback.reconciliation.started", batch_size=batch_size)
    cutoff = datetime.now(UTC) - timedelta(days=7)

    async with async_session_factory() as session:
        stmt = (
            select(FeedbackSubmission.id)
            .where(
                FeedbackSubmission.alert_evaluated_at.is_(None),
                FeedbackSubmission.alert_evaluation_attempts < 5,
                FeedbackSubmission.created_at >= cutoff,
            )
            .order_by(FeedbackSubmission.created_at.asc())
            .limit(batch_size)
        )
        result = await session.execute(stmt)
        sub_ids = result.scalars().all()

    enqueued_count = 0
    for s_id in sub_ids:
        try:
            await evaluate_submission_alerts_task.kiq(str(s_id))
            enqueued_count += 1
        except Exception as exc:
            logger.warning(
                "feedback.reconciliation.enqueue_failed",
                submission_id=str(s_id),
                error=str(exc),
            )

    logger.info(
        "feedback.reconciliation.completed",
        found=len(sub_ids),
        enqueued=enqueued_count,
    )
    return enqueued_count

