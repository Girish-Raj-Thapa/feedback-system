"""
Taskiq background tasks for Outbound Delivery execution and crash recovery.
"""

from uuid import UUID

from app.core.logging import get_logger
from app.core.tasks import broker
from app.db.session import async_session_factory
from app.features.notifications.services.delivery_service import (
    NotificationDeliveryService,
)

logger = get_logger("app.features.notifications.tasks")


@broker.task
async def dispatch_outbound_delivery_task(delivery_id_str: str) -> bool:
    """
    Background execution task for an individual outbound delivery.
    Picks up the delivery, resolves provider, dispatches HTTP request, and updates retry state.
    """
    logger.info("notifications.task.dispatch_started", delivery_id=delivery_id_str)
    try:
        delivery_id = UUID(delivery_id_str)
    except (ValueError, TypeError) as exc:
        logger.error(
            "notifications.task.invalid_uuid",
            delivery_id=delivery_id_str,
            error=str(exc),
        )
        return False

    async with async_session_factory() as session:
        service = NotificationDeliveryService(session)
        success = await service.process_delivery(delivery_id)
        logger.info(
            "notifications.task.dispatch_completed",
            delivery_id=delivery_id_str,
            success=success,
        )
        return success


@broker.task
async def sweep_stuck_and_due_deliveries_task() -> int:
    """
    Reaper and sweeper cron task:
    1. Reclaims deliveries stuck in 'processing' whose lease expired due to worker crashes.
    2. Enqueues due deliveries that were scheduled for retry or dropped by Redis.
    """
    logger.info("notifications.task.sweep_started")
    reclaimed = 0

    async with async_session_factory() as session:
        service = NotificationDeliveryService(session)
        # 1. Reclaim stuck leases
        reclaimed = await service.reap_stuck_processing_jobs(timeout_minutes=5)

        # 2. Find due deliveries and trigger execution
        due_deliveries = await service.delivery_repo.list_due_deliveries(
            limit=50
        )
        for delivery in due_deliveries:
            await dispatch_outbound_delivery_task.kiq(str(delivery.id))

    # 3. Self-healing reconciliation: evaluate any submissions missed during outages/deployments
    reconciled_submissions = 0
    try:
        from app.features.feedback.tasks import (
            reconcile_unnotified_submissions_task,
        )

        reconciled_submissions = await reconcile_unnotified_submissions_task(
            batch_size=50
        )
    except Exception as exc:
        logger.warning(
            "notifications.task.reconciliation_failed", error=str(exc)
        )

    logger.info(
        "notifications.task.sweep_completed",
        reclaimed=reclaimed,
        due_dispatched=len(due_deliveries),
        reconciled_submissions=reconciled_submissions,
    )
    return reclaimed

