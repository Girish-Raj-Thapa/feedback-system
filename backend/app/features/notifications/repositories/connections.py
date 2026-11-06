"""
Repository layer for Notification Connections.
Data access operations for workspace integration destinations (Slack, Discord, webhooks).
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.notifications.models.connections import NotificationConnection


class NotificationConnectionRepository:
    """
    Data access for NotificationConnection entities.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, connection: NotificationConnection
    ) -> NotificationConnection:
        """Persist a new notification connection."""
        self.session.add(connection)
        await self.session.flush()
        return connection

    async def get_by_id(
        self,
        workspace_id: UUID,
        connection_id: UUID,
    ) -> NotificationConnection | None:
        """Fetch an active connection by ID scoped to a workspace."""
        stmt = select(NotificationConnection).where(
            NotificationConnection.id == connection_id,
            NotificationConnection.workspace_id == workspace_id,
            NotificationConnection.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_system(
        self, connection_id: UUID
    ) -> NotificationConnection | None:
        """Fetch connection by ID for background worker dispatch without workspace filter."""
        stmt = select(NotificationConnection).where(
            NotificationConnection.id == connection_id,
            NotificationConnection.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        is_active: bool | None = None,
    ) -> Sequence[NotificationConnection]:
        """List connections for a workspace, optionally filtered by active status."""
        conditions = [
            NotificationConnection.workspace_id == workspace_id,
            NotificationConnection.deleted_at.is_(None),
        ]
        if is_active is not None:
            conditions.append(NotificationConnection.is_active == is_active)

        stmt = (
            select(NotificationConnection)
            .where(*conditions)
            .order_by(NotificationConnection.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def find_by_slack_channel(
        self,
        workspace_id: UUID,
        team_id: str,
        channel_id: str,
    ) -> NotificationConnection | None:
        """Find non-deleted connection in workspace matching Slack team_id and channel_id."""
        stmt = select(NotificationConnection).where(
            NotificationConnection.workspace_id == workspace_id,
            NotificationConnection.deleted_at.is_(None),
            NotificationConnection.provider_metadata["team_id"].as_string()
            == team_id,
            NotificationConnection.provider_metadata["channel_id"].as_string()
            == channel_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def soft_delete(self, connection: NotificationConnection) -> None:
        """Soft-delete a connection and deactivate it."""
        connection.deleted_at = datetime.now(UTC)
        connection.is_active = False
        await self.session.flush()

    async def record_success(self, connection_id: UUID) -> None:
        """Reset consecutive failures and record dispatch timestamp upon successful delivery."""
        now = datetime.now(UTC)
        stmt = (
            update(NotificationConnection)
            .where(NotificationConnection.id == connection_id)
            .values(
                consecutive_failures=0,
                health_status="healthy",
                failure_reason=None,
                last_dispatched_at=now,
                updated_at=now,
            )
        )
        await self.session.execute(stmt)

    async def record_failure(
        self,
        connection_id: UUID,
        reason: str | None,
        is_permanent: bool = False,
        trip_threshold: int = 5,
    ) -> NotificationConnection | None:
        """
        Increment consecutive failures.
        If permanent and consecutive failures reach threshold, trip the circuit breaker.
        """
        conn = await self.get_by_id_system(connection_id)
        if not conn:
            return None

        now = datetime.now(UTC)
        conn.consecutive_failures += 1
        conn.failure_reason = reason[:500] if reason else None
        conn.last_dispatched_at = now
        conn.updated_at = now

        if is_permanent:
            conn.health_status = "revoked"
            conn.is_active = False  # Immediately trip circuit breaker on permanent 404/410/revocation

        elif conn.consecutive_failures >= trip_threshold:
            conn.health_status = "degraded"

        await self.session.flush()
        return conn

