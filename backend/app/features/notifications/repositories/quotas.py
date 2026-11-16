"""
Repository layer for Notification Quotas and Usage Aggregations.
Consolidates quota counts into minimal single-round-trip SQL queries.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.models.alert_rules import AlertRule
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.models.deliveries import OutboundDelivery


class NotificationQuotaRepository:
    """
    Aggregated read queries for workspace notification quotas and dispatch telemetry.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _connection_count_subquery(workspace_id: UUID) -> Any:
        return (
            select(func.count(NotificationConnection.id))
            .where(
                NotificationConnection.workspace_id == workspace_id,
                NotificationConnection.deleted_at.is_(None),
            )
            .scalar_subquery()
        )

    @staticmethod
    def _alert_rule_count_subquery(workspace_id: UUID) -> Any:
        return (
            select(func.count(AlertRule.id))
            .where(
                AlertRule.workspace_id == workspace_id,
                AlertRule.deleted_at.is_(None),
            )
            .scalar_subquery()
        )

    async def get_workspace_plan_tier(self, workspace_id: UUID) -> str | None:
        """Fetch only Workspace.plan_tier (used for rate-limit checks without extra counts)."""
        stmt = select(Workspace.plan_tier).where(Workspace.id == workspace_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_workspace_plan_and_connection_count(
        self, workspace_id: UUID
    ) -> tuple[str | None, int]:
        """Fetch only plan_tier and active connection count in a single SQL query."""
        stmt = select(
            Workspace.plan_tier,
            self._connection_count_subquery(workspace_id),
        ).where(Workspace.id == workspace_id)
        result = await self.session.execute(stmt)
        row = result.first()
        if row is None:
            return None, 0
        return row[0], int(row[1])

    async def get_workspace_plan_and_alert_rule_count(
        self, workspace_id: UUID
    ) -> tuple[str | None, int]:
        """Fetch only plan_tier and active alert rule count in a single SQL query."""
        stmt = select(
            Workspace.plan_tier,
            self._alert_rule_count_subquery(workspace_id),
        ).where(Workspace.id == workspace_id)
        result = await self.session.execute(stmt)
        row = result.first()
        if row is None:
            return None, 0
        return row[0], int(row[1])

    async def get_workspace_plan_and_resource_counts(
        self, workspace_id: UUID
    ) -> tuple[str | None, datetime | None, int, int]:
        """
        Fetch plan_tier, cycle_reset_at, active connection count, and active alert rule count
        in a single SQL round-trip.
        """
        stmt = select(
            Workspace.plan_tier,
            Workspace.cycle_reset_at,
            self._connection_count_subquery(workspace_id),
            self._alert_rule_count_subquery(workspace_id),
        ).where(Workspace.id == workspace_id)

        result = await self.session.execute(stmt)
        row = result.first()
        if row is None:
            return None, None, 0, 0
        return row[0], row[1], int(row[2]), int(row[3])

    async def get_delivery_usage_counts(
        self,
        workspace_id: UUID,
        cycle_start: datetime,
        one_hour_ago: datetime,
    ) -> tuple[int, int, int, int]:
        """
        Compute monthly and hourly email vs. webhook delivery counts in one aggregated SQL query.
        Returns (monthly_email, monthly_webhook, hourly_email, hourly_webhook).
        """
        stmt = (
            select(
                func.count(OutboundDelivery.id).filter(
                    NotificationConnection.provider_type == "email_alert"
                ),
                func.count(OutboundDelivery.id).filter(
                    NotificationConnection.provider_type != "email_alert"
                ),
                func.count(OutboundDelivery.id).filter(
                    NotificationConnection.provider_type == "email_alert",
                    OutboundDelivery.created_at >= one_hour_ago,
                ),
                func.count(OutboundDelivery.id).filter(
                    NotificationConnection.provider_type != "email_alert",
                    OutboundDelivery.created_at >= one_hour_ago,
                ),
            )
            .select_from(OutboundDelivery)
            .join(
                NotificationConnection,
                OutboundDelivery.connection_id == NotificationConnection.id,
            )
            .where(
                OutboundDelivery.workspace_id == workspace_id,
                OutboundDelivery.created_at >= cycle_start,
                OutboundDelivery.status != "cancelled",
            )
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if row is None:
            return 0, 0, 0, 0
        return int(row[0]), int(row[1]), int(row[2]), int(row[3])
