"""
Repository layer for Outbound Deliveries.
Provides atomic job claiming via FOR UPDATE SKIP LOCKED, outbox persistence, and attempt logging.
"""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.notifications.models.attempts import DeliveryAttempt
from app.features.notifications.models.deliveries import OutboundDelivery


class OutboundDeliveryRepository:
    """
    Data access and queue operations for OutboundDelivery and DeliveryAttempt entities.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, delivery: OutboundDelivery) -> OutboundDelivery:
        """Persist a new outbound delivery record."""
        self.session.add(delivery)
        await self.session.flush()
        return delivery

    async def get_by_id(self, delivery_id: UUID) -> OutboundDelivery | None:
        """Fetch delivery by ID."""
        return await self.session.get(OutboundDelivery, delivery_id)

    async def get_by_idempotency_key(
        self, idempotency_key: str
    ) -> OutboundDelivery | None:
        """Fetch delivery by unique idempotency key."""
        stmt = select(OutboundDelivery).where(
            OutboundDelivery.idempotency_key == idempotency_key
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def claim_for_processing(
        self, delivery_id: UUID, lease_seconds: int = 30
    ) -> OutboundDelivery | None:
        """
        Atomically claims a pending or scheduled delivery using FOR UPDATE SKIP LOCKED.
        Sets status to 'processing' and extends locked_until lease.
        Returns the locked delivery, or None if another worker already claimed it.
        """
        now = datetime.now(UTC)
        stmt = (
            select(OutboundDelivery)
            .where(
                OutboundDelivery.id == delivery_id,
                OutboundDelivery.status.in_(["pending", "retry_scheduled"]),
            )
            .with_for_update(skip_locked=True)
        )
        result = await self.session.execute(stmt)
        delivery = result.scalar_one_or_none()

        if delivery:
            delivery.status = "processing"
            delivery.locked_until = now + timedelta(seconds=lease_seconds)
            delivery.updated_at = now
            await self.session.flush()

        return delivery

    async def record_attempt(
        self,
        attempt: DeliveryAttempt,
    ) -> DeliveryAttempt:
        """Persist an individual delivery attempt log."""
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def list_due_deliveries(
        self, limit: int = 50
    ) -> Sequence[OutboundDelivery]:
        """
        Fetch deliveries due for execution (next_retry_at <= NOW() and not locked).
        Used by the sweeper/reaper cron to recover dropped jobs.
        """
        now = datetime.now(UTC)
        stmt = (
            select(OutboundDelivery)
            .where(
                OutboundDelivery.status.in_(["pending", "retry_scheduled"]),
                OutboundDelivery.next_retry_at <= now,
                (OutboundDelivery.locked_until.is_(None))
                | (OutboundDelivery.locked_until < now),
            )
            .order_by(OutboundDelivery.next_retry_at.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def reclaim_stuck_processing_deliveries(
        self, timeout_minutes: int = 5
    ) -> int:
        """
        Reset deliveries stuck in 'processing' whose lease has expired back to 'pending'.
        Recovers jobs when a worker crashes mid-execution.
        """
        now = datetime.now(UTC)
        threshold = now - timedelta(minutes=timeout_minutes)
        stmt = (
            update(OutboundDelivery)
            .where(
                OutboundDelivery.status == "processing",
                (OutboundDelivery.locked_until < now)
                | (
                    OutboundDelivery.locked_until.is_(None)
                    & (OutboundDelivery.updated_at < threshold)
                ),
            )
            .values(
                status="pending",
                locked_until=None,
                updated_at=now,
            )
        )
        result = await self.session.execute(stmt)
        return int(result.rowcount)

    async def list_by_connection(
        self,
        connection_id: UUID,
        limit: int = 20,
    ) -> Sequence[OutboundDelivery]:
        """
        Fetch recent outbound deliveries for a connection with delivery attempts loaded.
        """
        stmt = (
            select(OutboundDelivery)
            .options(selectinload(OutboundDelivery.attempts))
            .where(OutboundDelivery.connection_id == connection_id)
            .order_by(OutboundDelivery.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

