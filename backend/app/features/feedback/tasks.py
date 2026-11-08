"""
Taskiq background tasks for Feedback Submissions:
Asynchronous alert evaluation and periodic reconciliation sweeper.
"""

import re
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

SPAM_PATTERNS = [
    re.compile(r"\[url=", re.IGNORECASE),
    re.compile(r"casino\s+(bonus|games|online)", re.IGNORECASE),
    re.compile(r"crypto\s+(giveaway|airdrop)", re.IGNORECASE),
    re.compile(r"buy\s+backlinks", re.IGNORECASE),
    re.compile(r"(viagra|cialis)", re.IGNORECASE),
]


def evaluate_spam_heuristics(comment: str | None) -> tuple[bool, int, list[str]]:
    """
    Fast rule-based spam and abuse detection on text comments.
    """
    if not comment:
        return False, 0, []

    text = comment.strip()
    reasons: list[str] = []

    if "\u0000" in text:
        reasons.append("null_byte_detected")

    urls = re.findall(r"https?://\S+", text)
    if len(urls) >= 4:
        reasons.append("excessive_urls")

    for pat in SPAM_PATTERNS:
        if pat.search(text):
            reasons.append(f"pattern_matched:{pat.pattern}")
            break

    if re.search(r"(.)\1{24,}", text):
        reasons.append("repetitive_character_spam")

    if reasons:
        return True, 100, reasons
    return False, 0, []


@broker.task
async def triage_submission_task(submission_id_str: str) -> bool:
    """
    Asynchronously triages incoming feedback submissions:
    1. Evaluates spam heuristics (excessive URLs, gibberish, known patterns).
    2. Respects lane C quarantine status.
    3. If clean and verified, transitions triage_state='done' and enqueues evaluate_submission_alerts_task.
    4. If spam or quarantined, sets triage_state='done' and suppresses alerts.
    """
    logger.info("feedback.triage.started", submission_id=submission_id_str)
    try:
        submission_id = UUID(submission_id_str)
    except (ValueError, TypeError) as exc:
        logger.error(
            "feedback.triage.invalid_uuid",
            submission_id=submission_id_str,
            error=str(exc),
        )
        return False

    async with async_session_factory() as session:
        submission = await session.get(FeedbackSubmission, submission_id)
        if not submission:
            logger.warning(
                "feedback.triage.not_found", submission_id=submission_id_str
            )
            return False

        if submission.triage_state == "done":
            logger.info(
                "feedback.triage.already_done", submission_id=submission_id_str
            )
            return True

        # Check if already quarantined (e.g. Lane C)
        if submission.status == "quarantined":
            submission.triage_state = "done"
            await session.commit()
            logger.info(
                "feedback.triage.quarantined_skip_alerts",
                submission_id=submission_id_str,
            )
            return True

        # Run spam heuristics
        is_spam, score, reasons = evaluate_spam_heuristics(submission.comment)
        submission.spam_score = score
        submission.spam_reasons = reasons
        submission.triage_state = "done"

        if is_spam:
            submission.status = "spam"
            await session.commit()
            logger.info(
                "feedback.triage.flagged_as_spam",
                submission_id=submission_id_str,
                reasons=reasons,
            )
            return True

        # Clean submission!
        await session.commit()

    # Enqueue alerts ONLY for clean submissions
    try:
        await evaluate_submission_alerts_task.kiq(submission_id_str)
        logger.info(
            "feedback.triage.alerts_enqueued", submission_id=submission_id_str
        )
    except Exception as exc:
        logger.warning(
            "feedback.triage.alert_enqueue_failed",
            submission_id=submission_id_str,
            error=str(exc),
        )

    return True


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

        # Spam & Quarantine guard: never notify on spam or unapproved quarantined submissions
        if submission.status in ("spam", "quarantined"):
            logger.info(
                "feedback.alerts.skipped_unclean_status",
                submission_id=submission_id_str,
                status=submission.status,
            )
            submission.alert_evaluated_at = datetime.now(UTC)
            await session.commit()
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

