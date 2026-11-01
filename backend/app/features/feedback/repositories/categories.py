"""
Database repository for Feedback Categories.
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.feedback.models.categories import FeedbackCategory


class FeedbackCategoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_active(self, workspace_id: UUID) -> Sequence[FeedbackCategory]:
        """
        List all active non-deleted categories for a workspace ordered by display_order.
        """
        stmt = (
            select(FeedbackCategory)
            .where(
                FeedbackCategory.workspace_id == workspace_id,
                FeedbackCategory.deleted_at.is_(None),
            )
            .order_by(
                FeedbackCategory.display_order.asc(),
                FeedbackCategory.created_at.asc(),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        workspace_id: UUID,
        category_id: UUID,
    ) -> FeedbackCategory | None:
        """
        Get an active category by ID within a workspace.
        """
        stmt = select(FeedbackCategory).where(
            FeedbackCategory.id == category_id,
            FeedbackCategory.workspace_id == workspace_id,
            FeedbackCategory.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(
        self,
        workspace_id: UUID,
        name: str,
    ) -> FeedbackCategory | None:
        """
        Get an active category by name (case-insensitive) within a workspace.
        """
        stmt = select(FeedbackCategory).where(
            FeedbackCategory.workspace_id == workspace_id,
            func.lower(FeedbackCategory.name) == name.strip().lower(),
            FeedbackCategory.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_uncategorized(self, workspace_id: UUID) -> FeedbackCategory | None:
        """
        Get the designated 'Other / Uncategorized' category for a workspace.
        """
        stmt = select(FeedbackCategory).where(
            FeedbackCategory.workspace_id == workspace_id,
            FeedbackCategory.is_uncategorized.is_(True),
            FeedbackCategory.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_next_display_order(self, workspace_id: UUID) -> int:
        """
        Get the next available display_order index for a workspace.
        """
        stmt = select(
            func.coalesce(func.max(FeedbackCategory.display_order), -1)
        ).where(
            FeedbackCategory.workspace_id == workspace_id,
            FeedbackCategory.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        max_order = result.scalar()
        return (max_order or 0) + 1

    async def count_active(self, workspace_id: UUID) -> int:
        """
        Count active categories for a workspace.
        """
        stmt = select(func.count(FeedbackCategory.id)).where(
            FeedbackCategory.workspace_id == workspace_id,
            FeedbackCategory.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def create(self, category: FeedbackCategory) -> FeedbackCategory:
        self.session.add(category)
        await self.session.flush()
        return category

    async def bulk_create(
        self,
        categories: list[FeedbackCategory],
    ) -> list[FeedbackCategory]:
        self.session.add_all(categories)
        await self.session.flush()
        return categories

    async def soft_delete(self, category: FeedbackCategory) -> None:
        category.deleted_at = datetime.now(UTC)
        await self.session.flush()

    async def soft_delete_all(self, workspace_id: UUID) -> None:
        """
        Soft-delete all active categories for a workspace (used during force re-seed).
        """
        now = datetime.now(UTC)
        categories = await self.list_active(workspace_id)
        for cat in categories:
            cat.deleted_at = now
        await self.session.flush()
