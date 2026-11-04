"""
FastAPI router for Workspace Feedback Insights & Score Drivers.
Workspace-scoped and protected by RBAC permissions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.features.auth.dependencies import require_permission
from app.features.feedback.dependencies import InsightsServiceDep
from app.features.feedback.schemas.insights import FeedbackInsightsResponse

router = APIRouter(
    prefix="/insights",
    tags=["feedback-insights"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:read"))],
    response_model=FeedbackInsightsResponse,
)
async def get_feedback_insights(
    workspace_id: UUID,
    service: InsightsServiceDep,
    days: int | None = Query(default=30, description="Filter timeframe in days; 0 or None for all-time"),
    form_id: UUID | None = Query(default=None, description="Optional form UUID filter"),
) -> FeedbackInsightsResponse:
    """
    Get aggregated satisfaction metrics, sentiment distribution, and net score drivers for a workspace.
    Protected by forms:read permission.
    """
    return await service.get_insights(
        workspace_id=workspace_id,
        days=days,
        form_id=form_id,
    )

