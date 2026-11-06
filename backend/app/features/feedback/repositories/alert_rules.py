"""
Repository layer for Feedback Alert Rules.
Provides data access operations for workspace feedback notification routing rules.
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.features.feedback.models.alert_rules import AlertRule


class AlertRuleRepository:
    """
    Data access operations for AlertRule entities.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, rule: AlertRule) -> AlertRule:
        """Persist a new alert rule."""
        self.session.add(rule)
        await self.session.flush()
        return rule

    async def get_by_id(
        self,
        workspace_id: UUID,
        rule_id: UUID,
    ) -> AlertRule | None:
        """Get an active alert rule by ID scoped to a workspace."""
        stmt = (
            select(AlertRule)
            .options(joinedload(AlertRule.connection))
            .where(
                AlertRule.id == rule_id,
                AlertRule.workspace_id == workspace_id,
                AlertRule.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active_for_evaluation(
        self,
        workspace_id: UUID,
    ) -> Sequence[AlertRule]:
        """
        List all active non-deleted alert rules for a workspace with connection joined.
        Used by the ingestion evaluation pipeline.
        """
        stmt = (
            select(AlertRule)
            .options(joinedload(AlertRule.connection))
            .where(
                AlertRule.workspace_id == workspace_id,
                AlertRule.is_active.is_(True),
                AlertRule.deleted_at.is_(None),
            )
            .order_by(AlertRule.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_by_workspace(
        self,
        workspace_id: UUID,
    ) -> Sequence[AlertRule]:
        """List all non-deleted alert rules for workspace settings."""
        stmt = (
            select(AlertRule)
            .options(joinedload(AlertRule.connection))
            .where(
                AlertRule.workspace_id == workspace_id,
                AlertRule.deleted_at.is_(None),
            )
            .order_by(AlertRule.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def soft_delete(self, rule: AlertRule) -> None:
        """Soft-delete an alert rule and deactivate it."""
        rule.deleted_at = datetime.now(UTC)
        rule.is_active = False
        await self.session.flush()

