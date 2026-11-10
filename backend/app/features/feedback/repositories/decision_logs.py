"""
Repository layer for Decision Logs and Impact Window Queries.
"""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.feedback.models.decision_logs import DecisionLog
from app.features.feedback.models.submissions import FeedbackSubmission


class DecisionLogRepository:
    """
    Handles database operations for DecisionLog records and fetches
    clean, non-spam submissions across pre- and post-decision time windows.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, decision_log: DecisionLog) -> DecisionLog:
        """Add a new decision log and flush to populate defaults."""
        self.session.add(decision_log)
        await self.session.flush()
        return decision_log

    async def get_by_id(
        self,
        workspace_id: UUID,
        decision_id: UUID,
    ) -> DecisionLog | None:
        """Fetch a single decision log with category and user relationships loaded."""
        stmt = (
            select(DecisionLog)
            .where(
                DecisionLog.workspace_id == workspace_id,
                DecisionLog.id == decision_id,
            )
            .options(
                selectinload(DecisionLog.category),
                selectinload(DecisionLog.created_by),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        category_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[DecisionLog], int]:
        """
        List decision logs for a workspace with optional category filter.
        Returns a tuple of (items, total_count).
        """
        conditions = [DecisionLog.workspace_id == workspace_id]
        if category_id is not None:
            conditions.append(DecisionLog.category_id == category_id)

        # 1. Fetch paginated records
        query = (
            select(DecisionLog)
            .where(*conditions)
            .options(
                selectinload(DecisionLog.category),
                selectinload(DecisionLog.created_by),
            )
            .order_by(
                DecisionLog.decision_date.desc(),
                DecisionLog.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(query)
        items = result.scalars().all()

        # 2. Total count
        count_stmt = (
            select(func.count())
            .select_from(DecisionLog)
            .where(*conditions)
        )
        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one()

        return items, total

    async def delete(self, decision_log: DecisionLog) -> None:
        """Delete a decision log record."""
        await self.session.delete(decision_log)
        await self.session.flush()

    async def fetch_submissions_in_window(
        self,
        workspace_id: UUID,
        category_id: UUID | None,
        start_dt: datetime,
        end_dt: datetime,
    ) -> Sequence[FeedbackSubmission]:
        """
        Retrieve clean, non-spam submissions within a time window for impact calculation.
        Strictly excludes spam, quarantined, or soft-deleted items.
        """
        conditions = [
            FeedbackSubmission.workspace_id == workspace_id,
            FeedbackSubmission.status.notin_(["spam", "quarantined"]),
            FeedbackSubmission.created_at >= start_dt,
            FeedbackSubmission.created_at < end_dt,
        ]
        if category_id is not None:
            conditions.append(FeedbackSubmission.category_id == category_id)

        stmt = select(FeedbackSubmission).where(*conditions)
        result = await self.session.execute(stmt)
        return result.scalars().all()
