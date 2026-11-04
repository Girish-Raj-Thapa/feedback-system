"""
FastAPI router for Workspace Feedback Submissions (Inbox).
Workspace-scoped and protected by RBAC permissions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import PaginationDep
from app.core.responses import Page
from app.features.auth.dependencies import require_permission
from app.features.feedback.dependencies import SubmissionServiceDep
from app.features.feedback.schemas.submissions import (
    CustomerHistoryRead,
    FeedbackSubmissionRead,
    FeedbackSubmissionUpdate,
    SampleDataResponse,
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
    status_filter: str | None = Query(default=None, alias="status"),
    category_id: UUID | None = Query(default=None),
    sentiment: str | None = Query(default=None),
    query: str | None = Query(default=None),
) -> Page[FeedbackSubmissionRead]:
    """
    List feedback submissions for the workspace with pagination and filters.
    Protected by forms:read permission.
    """
    items, total = await service.list_submissions(
        workspace_id=workspace_id,
        limit=pagination.limit,
        offset=pagination.offset,
        status_filter=status_filter,
        category_id=category_id,
        sentiment=sentiment,
        query=query,
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


@router.post(
    "/sample-data",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("submissions:triage"))],
    response_model=SampleDataResponse,
)
async def load_sample_data(
    workspace_id: UUID,
    service: SubmissionServiceDep,
) -> SampleDataResponse:
    """
    Seed 6 sample customer feedback responses to preview Score Drivers and triage workflows.
    Protected by submissions:triage permission.
    """
    count = await service.load_sample_data(workspace_id)
    return SampleDataResponse(
        message="Sample feedback data successfully loaded",
        count=count,
    )


@router.delete(
    "/sample-data",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("submissions:triage"))],
    response_model=SampleDataResponse,
)
async def clear_sample_data(
    workspace_id: UUID,
    service: SubmissionServiceDep,
) -> SampleDataResponse:
    """
    Remove all sample/demo feedback responses from the workspace.
    Protected by submissions:triage permission.
    """
    deleted = await service.clear_sample_data(workspace_id)
    return SampleDataResponse(
        message="Sample feedback data cleared",
        count=deleted,
    )
