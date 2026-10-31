"""
FastAPI router for Feedback Categories.
Endpoints are workspace-scoped and protected by RBAC permissions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import require_permission
from app.features.feedback.dependencies import FeedbackServiceDep
from app.features.feedback.schemas.categories import (
    FeedbackCategoryCreate,
    FeedbackCategoryRead,
    FeedbackCategoryReorderRequest,
    FeedbackCategorySeedRequest,
    FeedbackCategoryUpdate,
)

router = APIRouter(
    prefix="/categories",
    tags=["feedback-categories"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("taxonomy:read"))],
)
async def list_categories(
    workspace_id: UUID,
    service: FeedbackServiceDep,
) -> list[FeedbackCategoryRead]:
    """
    List all active feedback categories for a workspace ordered by display order.
    """
    return await service.list_categories(workspace_id)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("taxonomy:manage"))],
)
async def create_category(
    workspace_id: UUID,
    payload: FeedbackCategoryCreate,
    service: FeedbackServiceDep,
) -> FeedbackCategoryRead:
    """
    Create a new custom feedback category in the workspace.
    """
    return await service.create_category(workspace_id, payload)


@router.post(
    "/seed",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("taxonomy:manage"))],
)
async def seed_categories(
    workspace_id: UUID,
    payload: FeedbackCategorySeedRequest,
    service: FeedbackServiceDep,
) -> list[FeedbackCategoryRead]:
    """
    Initialize or reset feedback categories using an industry preset.
    """
    return await service.seed_categories(
        workspace_id=workspace_id,
        industry=payload.industry,
        force_reset=payload.force_reset,
    )


@router.post(
    "/reorder",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("taxonomy:manage"))],
)
async def reorder_categories(
    workspace_id: UUID,
    payload: FeedbackCategoryReorderRequest,
    service: FeedbackServiceDep,
) -> list[FeedbackCategoryRead]:
    """
    Reorder feedback categories display order.
    """
    return await service.reorder_categories(workspace_id, payload)


@router.get(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("taxonomy:read"))],
)
async def get_category(
    workspace_id: UUID,
    category_id: UUID,
    service: FeedbackServiceDep,
) -> FeedbackCategoryRead:
    """
    Get a single feedback category by ID.
    """
    return await service.get_category(workspace_id, category_id)


@router.patch(
    "/{category_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("taxonomy:manage"))],
)
async def update_category(
    workspace_id: UUID,
    category_id: UUID,
    payload: FeedbackCategoryUpdate,
    service: FeedbackServiceDep,
) -> FeedbackCategoryRead:
    """
    Update feedback category properties (name, description, color, keywords, order).
    """
    return await service.update_category(workspace_id, category_id, payload)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("taxonomy:manage"))],
)
async def delete_category(
    workspace_id: UUID,
    category_id: UUID,
    service: FeedbackServiceDep,
) -> None:
    """
    Soft-delete a feedback category.
    The default 'Other / Uncategorized' category is protected and cannot be deleted.
    """
    await service.delete_category(workspace_id, category_id)

