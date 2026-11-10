"""
FastAPI router for Workspace Decision Logs (Before vs. After Impact Tracker).
Workspace-scoped and protected by RBAC permissions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import PaginationDep
from app.core.responses import Page
from app.features.auth.dependencies import CurrentUser, require_permission
from app.features.feedback.dependencies import DecisionLogServiceDep
from app.features.feedback.schemas.decision_logs import (
    DecisionLogCreate,
    DecisionLogRead,
    DecisionLogUpdate,
)

router = APIRouter(
    prefix="/decision-logs",
    tags=["decision-logs"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("analytics:read"))],
    response_model=Page[DecisionLogRead],
)
async def list_decision_logs(
    workspace_id: UUID,
    service: DecisionLogServiceDep,
    pagination: PaginationDep,
    category_id: UUID | None = Query(default=None, description="Filter by linked category UUID"),
) -> Page[DecisionLogRead]:
    """
    List decision logs for the workspace with Before vs. After impact metrics.
    Protected by analytics:read permission.
    """
    items, total = await service.list_decision_logs(
        workspace_id=workspace_id,
        category_id=category_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return Page(
        items=items,
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("decision_log:create"))],
    response_model=DecisionLogRead,
)
async def create_decision_log(
    workspace_id: UUID,
    payload: DecisionLogCreate,
    service: DecisionLogServiceDep,
    current_user: CurrentUser,
) -> DecisionLogRead:
    """
    Record a new decision milestone and compute its 30-day impact.
    Protected by decision_log:create permission.
    """
    return await service.create_decision_log(
        workspace_id=workspace_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.get(
    "/{decision_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("analytics:read"))],
    response_model=DecisionLogRead,
)
async def get_decision_log(
    workspace_id: UUID,
    decision_id: UUID,
    service: DecisionLogServiceDep,
) -> DecisionLogRead:
    """
    Get a single decision log with full Before vs. After impact metrics.
    Protected by analytics:read permission.
    """
    return await service.get_decision_log(
        workspace_id=workspace_id,
        decision_id=decision_id,
    )


@router.patch(
    "/{decision_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("decision_log:update"))],
    response_model=DecisionLogRead,
)
async def update_decision_log(
    workspace_id: UUID,
    decision_id: UUID,
    payload: DecisionLogUpdate,
    service: DecisionLogServiceDep,
) -> DecisionLogRead:
    """
    Update a decision log's title, description, category, or milestone date.
    Protected by decision_log:update permission.
    """
    return await service.update_decision_log(
        workspace_id=workspace_id,
        decision_id=decision_id,
        payload=payload,
    )


@router.delete(
    "/{decision_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("decision_log:update"))],
)
async def delete_decision_log(
    workspace_id: UUID,
    decision_id: UUID,
    service: DecisionLogServiceDep,
) -> None:
    """
    Delete a decision log milestone.
    Protected by decision_log:update permission.
    """
    await service.delete_decision_log(
        workspace_id=workspace_id,
        decision_id=decision_id,
    )
