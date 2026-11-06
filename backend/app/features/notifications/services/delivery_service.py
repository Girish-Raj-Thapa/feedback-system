"""
Service layer for Outbound Delivery orchestration.
Manages the durable outbox lifecycle: atomic claiming, provider dispatch, retry scheduling, and circuit breaking.
"""

import random
import time
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.features.notifications.models.attempts import DeliveryAttempt
from app.features.notifications.models.deliveries import OutboundDelivery
from app.features.notifications.providers.registry import provider_registry
from app.features.notifications.repositories.connections import (
    NotificationConnectionRepository,
)
from app.features.notifications.repositories.deliveries import (
    OutboundDeliveryRepository,
)

logger = get_logger("app.features.notifications.services.delivery")


class NotificationDeliveryService:
    """
    Coordinates delivery execution, atomic queue claiming, retries, and failure telemetry.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.delivery_repo = OutboundDeliveryRepository(session)
        self.conn_repo = NotificationConnectionRepository(session)

    async def create_delivery_in_tx(
        self,
        workspace_id: UUID,
        connection_id: UUID,
        idempotency_key: str,
        payload_snapshot: dict[str, Any],
        alert_rule_id: UUID | None = None,
        max_attempts: int = 4,
    ) -> OutboundDelivery | None:
        """
        Persists a pending delivery atomically within the caller's transaction (Transactional Outbox).
        If a delivery with idempotency_key already exists, returns existing record to prevent duplicates.
        """
        existing = await self.delivery_repo.get_by_idempotency_key(
            idempotency_key
        )
        if existing:
            logger.info(
                "notifications.delivery.duplicate_skipped",
                idempotency_key=idempotency_key,
                delivery_id=str(existing.id),
            )
            return existing

        delivery = OutboundDelivery(
            workspace_id=workspace_id,
            connection_id=connection_id,
            alert_rule_id=alert_rule_id,
            idempotency_key=idempotency_key,
            status="pending",
            attempts_count=0,
            max_attempts=max_attempts,
            next_retry_at=datetime.now(UTC),
            payload_snapshot=payload_snapshot,
        )
        await self.delivery_repo.create(delivery)
        return delivery

    async def process_delivery(self, delivery_id: UUID) -> bool:
        """
        Execute an outbound delivery:
        1. Atomically claim using FOR UPDATE SKIP LOCKED.
        2. Resolve connection & provider.
        3. Dispatch HTTP request with timeout.
        4. Record attempt and transition state (delivered, retry_scheduled, or failed).
        """
        now = datetime.now(UTC)

        # 1. Atomic claim
        delivery = await self.delivery_repo.claim_for_processing(
            delivery_id, lease_seconds=30
        )
        if not delivery:
            logger.debug(
                "notifications.delivery.already_claimed_or_unavailable",
                delivery_id=str(delivery_id),
            )
            return False

        await self.session.commit()  # Commit claim lock immediately

        # 2. Re-fetch connection with fresh session
        conn = await self.conn_repo.get_by_id_system(delivery.connection_id)
        if not conn or not conn.is_active or conn.health_status == "revoked":
            logger.warning(
                "notifications.delivery.connection_inactive_or_revoked",
                delivery_id=str(delivery_id),
                connection_id=str(delivery.connection_id),
            )
            delivery.status = "cancelled"
            delivery.last_error = (
                "Destination connection is paused, inactive, or revoked"
            )
            delivery.locked_until = None
            await self.session.commit()
            return False

        # 2b. Check per-connection rate-limit pause (HTTP 429 backoff)
        paused_until = getattr(conn, "paused_until", None)
        if isinstance(paused_until, datetime) and paused_until > now:
            logger.info(
                "notifications.delivery.connection_rate_limited_paused",
                delivery_id=str(delivery_id),
                connection_id=str(conn.id),
                paused_until=paused_until.isoformat(),
            )
            delivery.status = "retry_scheduled"
            delivery.next_retry_at = paused_until
            delivery.locked_until = None
            delivery.last_error = (
                f"Rate limit pause active until {paused_until.isoformat()}"
            )
            await self.session.commit()
            return False

        provider = provider_registry.get(conn.provider_type)
        attempt_number = delivery.attempts_count + 1

        # 3. HTTP Dispatch
        start_time = time.perf_counter()
        result = await provider.dispatch(
            url=conn.destination_url,
            payload=delivery.payload_snapshot,
            secret_token=conn.secret_token,
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        # 4. Log attempt
        attempt = DeliveryAttempt(
            delivery_id=delivery.id,
            attempt_number=attempt_number,
            http_status_code=result.status_code,
            response_snippet=(
                result.response_body[:500] if result.response_body else None
            ),
            error_message=(
                result.error_message[:500] if result.error_message else None
            ),
            duration_ms=duration_ms,
            attempted_at=now,
        )
        await self.delivery_repo.record_attempt(attempt)

        # 5. Handle Outcome
        if result.success:
            delivery.status = "delivered"
            delivery.delivered_at = datetime.now(UTC)
            delivery.attempts_count = attempt_number
            delivery.locked_until = None
            delivery.last_error = None
            conn.paused_until = None  # Clear any active rate-limit pause
            await self.conn_repo.record_success(conn.id)
            await self.session.commit()

            logger.info(
                "notifications.delivery.succeeded",
                delivery_id=str(delivery_id),
                duration_ms=duration_ms,
            )
            return True

        # Handle Failure (Transient vs. Permanent)
        if result.is_transient and attempt_number < delivery.max_attempts:
            # Calculate Exponential Backoff with Jitter
            delay_seconds = self.calculate_backoff_delay(
                attempt_number=attempt_number,
                retry_after=result.retry_after_seconds,
            )
            # If Slack rate limited with 429, pause connection so other dispatches back off
            if result.status_code == 429 and result.retry_after_seconds:
                conn.paused_until = datetime.now(UTC) + timedelta(
                    seconds=result.retry_after_seconds
                )

            delivery.status = "retry_scheduled"
            delivery.next_retry_at = datetime.now(UTC) + timedelta(
                seconds=delay_seconds
            )
            delivery.attempts_count = attempt_number
            delivery.locked_until = None
            delivery.last_error = result.error_message
            await self.session.commit()

            logger.warning(
                "notifications.delivery.retry_scheduled",
                delivery_id=str(delivery_id),
                attempt=attempt_number,
                next_retry_in_seconds=delay_seconds,
                error=result.error_message,
            )
            return False

        # Permanent Failure or Max Retries Exhausted
        delivery.status = "failed"
        delivery.attempts_count = attempt_number
        delivery.locked_until = None
        delivery.last_error = result.error_message

        # Only trip circuit breaker into 'revoked' if provider confirmed revocation (404/410/token_revoked).
        # Application formatting errors (HTTP 400 invalid_payload) fail this delivery, but DO NOT revoke the connection!
        await self.conn_repo.record_failure(
            connection_id=conn.id,
            reason=result.error_message,
            is_permanent=result.is_revocation,
            trip_threshold=5,
        )
        await self.session.commit()

        logger.error(
            "notifications.delivery.permanently_failed",
            delivery_id=str(delivery_id),
            attempt=attempt_number,
            is_transient=result.is_transient,
            error=result.error_message,
        )
        return False

    @staticmethod
    def calculate_backoff_delay(
        attempt_number: int,
        retry_after: int | None = None,
    ) -> int:
        """
        Calculate backoff delay using exponential growth + uniform jitter:
        delay = min(300, 5 * 2^(attempt - 1) + uniform(0, 3))
        If provider supplied Retry-After (e.g. on HTTP 429), respect it.
        """
        base = min(300, 5 * (2 ** (attempt_number - 1)))
        jitter = random.uniform(0.0, 3.0)
        delay = int(base + jitter)
        if retry_after is not None and retry_after > 0:
            delay = max(delay, retry_after)
        return max(1, delay)

    async def reap_stuck_processing_jobs(self, timeout_minutes: int = 5) -> int:
        """Reclaim deliveries stuck in 'processing' whose lease expired."""
        reclaimed_count = (
            await self.delivery_repo.reclaim_stuck_processing_deliveries(
                timeout_minutes=timeout_minutes
            )
        )
        if reclaimed_count > 0:
            await self.session.commit()
            logger.info(
                "notifications.delivery.stuck_jobs_reclaimed",
                count=reclaimed_count,
            )
        return reclaimed_count

