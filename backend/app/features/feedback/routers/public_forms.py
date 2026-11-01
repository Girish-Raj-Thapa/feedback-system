"""
Public unauthenticated router for Feedback Forms.
Used by embeddable widgets and standalone hosted pages (/f/{workspace_slug}/{form_slug}).
"""

from fastapi import APIRouter, status

from app.features.feedback.dependencies import FormServiceDep, SubmissionServiceDep
from app.features.feedback.schemas.forms import PublicFormRead
from app.features.feedback.schemas.submissions import (
    FeedbackSubmissionCreate,
    FeedbackSubmissionResponse,
)

router = APIRouter(
    prefix="/public/forms",
    tags=["public-forms"],
)


@router.get(
    "/{workspace_slug}/{form_slug}",
    status_code=status.HTTP_200_OK,
    response_model=PublicFormRead,
)
async def get_public_form(
    workspace_slug: str,
    form_slug: str,
    service: FormServiceDep,
) -> PublicFormRead:
    """
    Publicly fetch active form schema and styling for widget embedding or hosted link display.
    No authentication required.
    """
    return await service.get_public_form(workspace_slug, form_slug)


@router.post(
    "/{workspace_slug}/{form_slug}/submit",
    status_code=status.HTTP_201_CREATED,
    response_model=FeedbackSubmissionResponse,
)
async def submit_feedback(
    workspace_slug: str,
    form_slug: str,
    payload: FeedbackSubmissionCreate,
    service: SubmissionServiceDep,
) -> FeedbackSubmissionResponse:
    """
    Publicly submit feedback through an embedded widget or standalone link.
    Validates form rules, saves ratings/answers, and returns tailored outcome screen.
    No authentication required.
    """
    return await service.submit_feedback(workspace_slug, form_slug, payload)
