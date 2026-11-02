"""
FastAPI router for Workspace Feedback Submissions (Inbox).
Workspace-scoped and protected by RBAC permissions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.dependencies import PaginationDep
from app.core.responses import Page
from app.features.auth.dependencies import require_permission
from app.features.feedback.dependencies import SubmissionServiceDep
from app.features.feedback.schemas.submissions import (
    CustomerHistoryRead,
    FeedbackSubmissionRead,
    FeedbackSubmissionUpdate,
)

router = APIRouter(
    prefix="/submissions",
    tags=["feedback-submissions"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:read"))],
    response_model=Page[FeedbackSubmissionRead],
)
async def list_submissions(
    workspace_id: UUID,
    pagination: PaginationDep,
    service: SubmissionServiceDep,
) -> Page[FeedbackSubmissionRead]:
    """
    List feedback submissions for the workspace with pagination.
    Protected by forms:read permission.
    """
    items, total = await service.list_submissions(
        workspace_id=workspace_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return Page(
        items=[FeedbackSubmissionRead.model_validate(item) for item in items],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get(
    "/{submission_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:read"))],
    response_model=FeedbackSubmissionRead,
)
async def get_submission(
    workspace_id: UUID,
    submission_id: UUID,
    service: SubmissionServiceDep,
) -> FeedbackSubmissionRead:
    """
    Get detailed feedback submission by ID.
    Protected by forms:read permission.
    """
    submission = await service.get_submission(workspace_id, submission_id)
    return FeedbackSubmissionRead.model_validate(submission)


@router.get(
    "/{submission_id}/customer-history",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:read"))],
    response_model=CustomerHistoryRead,
)
async def get_customer_history(
    workspace_id: UUID,
    submission_id: UUID,
    service: SubmissionServiceDep,
) -> CustomerHistoryRead:
    """
    Get customer submission history and average rating.
    Protected by forms:read permission.
    """
    return await service.get_customer_history(workspace_id, submission_id)


@router.patch(
    "/{submission_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("submissions:triage"))],
    response_model=FeedbackSubmissionRead,
)
async def update_submission(
    workspace_id: UUID,
    submission_id: UUID,
    payload: FeedbackSubmissionUpdate,
    service: SubmissionServiceDep,
) -> FeedbackSubmissionRead:
    """
    Update submission status (e.g. reviewed, archived) or classification.
    Protected by submissions:triage permission.
    """
    submission = await service.update_submission(
        workspace_id=workspace_id,
        submission_id=submission_id,
        payload=payload,
    )
    return FeedbackSubmissionRead.model_validate(submission)
