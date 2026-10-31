"""
Business logic and transaction orchestration for Feedback Categories.
"""

import re
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.presets.categories import get_preset_categories
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.schemas.categories import (
    FeedbackCategoryCreate,
    FeedbackCategoryRead,
    FeedbackCategoryReorderRequest,
    FeedbackCategoryUpdate,
)

logger = get_logger("app.features.feedback.services.categories")


def slugify(value: str) -> str:
    """
    Generate a URL-friendly slug from a string.
    """
    clean = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    return re.sub(r"[-\s]+", "-", clean)


class FeedbackCategoryService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.categories_repo = FeedbackCategoryRepository(session)

    async def list_categories(
        self,
        workspace_id: UUID,
    ) -> list[FeedbackCategoryRead]:
        """
        List all active feedback categories for a workspace.
        """
        categories = await self.categories_repo.list_active(workspace_id)
        return [FeedbackCategoryRead.model_validate(c) for c in categories]

    async def get_category(
        self,
        workspace_id: UUID,
        category_id: UUID,
    ) -> FeedbackCategoryRead:
        """
        Get a specific active feedback category by ID.
        """
        category = await self.categories_repo.get_by_id(workspace_id, category_id)
        if category is None:
            raise NotFoundError("Feedback category not found")
        return FeedbackCategoryRead.model_validate(category)

    async def create_category(
        self,
        workspace_id: UUID,
        payload: FeedbackCategoryCreate,
    ) -> FeedbackCategoryRead:
        """
        Create a new custom feedback category in the workspace.
        """
        existing = await self.categories_repo.get_by_name(workspace_id, payload.name)
        if existing is not None:
            raise ConflictError(
                f"A feedback category with name '{payload.name}' already exists"
            )

        display_order = (
            payload.display_order
            if payload.display_order is not None
            else await self.categories_repo.get_next_display_order(workspace_id)
        )

        category = FeedbackCategory(
            workspace_id=workspace_id,
            name=payload.name.strip(),
            slug=slugify(payload.name),
            description=payload.description.strip(),
            color=payload.color.strip(),
            icon=payload.icon.strip() if payload.icon else None,
            keywords=[k.strip().lower() for k in payload.keywords if k.strip()],
            is_uncategorized=False,
            is_active=True,
            display_order=display_order,
        )

        try:
            await self.categories_repo.create(category)
            await self.session.commit()
            await self.session.refresh(category)
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError(
                f"Feedback category '{payload.name}' already exists"
            ) from exc

        return FeedbackCategoryRead.model_validate(category)

    async def update_category(
        self,
        workspace_id: UUID,
        category_id: UUID,
        payload: FeedbackCategoryUpdate,
    ) -> FeedbackCategoryRead:
        """
        Update an existing feedback category.
        """
        category = await self.categories_repo.get_by_id(workspace_id, category_id)
        if category is None:
            raise NotFoundError("Feedback category not found")

        if (
            payload.name is not None
            and payload.name.strip().lower() != category.name.lower()
        ):
            existing = await self.categories_repo.get_by_name(
                workspace_id, payload.name
            )
            if existing is not None and existing.id != category_id:
                raise ConflictError(
                    f"A feedback category with name '{payload.name}' already exists"
                )
            category.name = payload.name.strip()
            category.slug = slugify(payload.name)

        if payload.description is not None:
            category.description = payload.description.strip()

        if payload.color is not None:
            category.color = payload.color.strip()

        if payload.icon is not None:
            category.icon = payload.icon.strip() or None

        if payload.keywords is not None:
            category.keywords = [
                k.strip().lower() for k in payload.keywords if k.strip()
            ]

        if payload.is_active is not None:
            if category.is_uncategorized and not payload.is_active:
                raise ValidationError(
                    "The default Uncategorized category cannot be deactivated"
                )
            category.is_active = payload.is_active

        if payload.display_order is not None:
            category.display_order = payload.display_order

        category.updated_at = datetime.now(UTC)

        try:
            await self.session.commit()
            await self.session.refresh(category)
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError(
                "Feedback category update failed due to conflict"
            ) from exc

        return FeedbackCategoryRead.model_validate(category)

    async def delete_category(
        self,
        workspace_id: UUID,
        category_id: UUID,
    ) -> None:
        """
        Soft-delete a feedback category.
        Protected: The 'Other / Uncategorized' category cannot be deleted.
        """
        category = await self.categories_repo.get_by_id(workspace_id, category_id)
        if category is None:
            raise NotFoundError("Feedback category not found")

        if category.is_uncategorized:
            raise ValidationError(
                "The default Uncategorized category cannot be deleted"
            )

        await self.categories_repo.soft_delete(category)
        await self.session.commit()

    async def seed_categories(
        self,
        workspace_id: UUID,
        industry: str | None = None,
        force_reset: bool = False,
    ) -> list[FeedbackCategoryRead]:
        """
        Seed industry-standard pre-defined categories for a workspace.
        """
        if force_reset:
            await self.categories_repo.soft_delete_all(workspace_id)
        else:
            active_count = await self.categories_repo.count_active(workspace_id)
            if active_count > 0:
                return await self.list_categories(workspace_id)

        preset_data = get_preset_categories(industry)
        new_categories: list[FeedbackCategory] = []

        for item in preset_data:
            cat = FeedbackCategory(
                workspace_id=workspace_id,
                name=item["name"],
                slug=item["slug"],
                description=item["description"],
                color=item["color"],
                icon=item.get("icon"),
                keywords=[k.lower() for k in item.get("keywords", [])],
                is_uncategorized=item.get("is_uncategorized", False),
                is_active=True,
                display_order=item.get("display_order", 0),
            )
            new_categories.append(cat)

        try:
            await self.categories_repo.bulk_create(new_categories)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            logger.warning(
                "seed_categories_collision",
                workspace_id=str(workspace_id),
                error=str(exc),
            )
            return await self.list_categories(workspace_id)

        return await self.list_categories(workspace_id)

    async def reorder_categories(
        self,
        workspace_id: UUID,
        payload: FeedbackCategoryReorderRequest,
    ) -> list[FeedbackCategoryRead]:
        """
        Update the display_order of multiple feedback categories in a single transaction.
        """
        order_map = {item.id: item.display_order for item in payload.items}
        active_cats = await self.categories_repo.list_active(workspace_id)

        for cat in active_cats:
            if cat.id in order_map:
                cat.display_order = order_map[cat.id]
                cat.updated_at = datetime.now(UTC)

        await self.session.commit()
        return await self.list_categories(workspace_id)
