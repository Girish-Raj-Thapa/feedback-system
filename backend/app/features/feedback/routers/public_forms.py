"""
Public unauthenticated router for Feedback Forms.
Used by embeddable widgets and standalone hosted pages (/f/{workspace_slug}/{form_slug}).
"""

from fastapi import APIRouter, Request, status

from app.features.feedback.dependencies import FormServiceDep, SubmissionServiceDep
from app.features.feedback.schemas.forms import PublicFormRead, PublicFormTokenResponse
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
    request: Request,
    service: FormServiceDep,
) -> PublicFormRead:
    """
    Publicly fetch active form schema and styling for widget embedding or hosted link display.
    No authentication required.
    """
    origin = request.headers.get("origin") or request.headers.get("referer")
    return await service.get_public_form(
        workspace_slug, form_slug, origin_or_referer=origin
    )


@router.post(
    "/{workspace_slug}/{form_slug}/token",
    status_code=status.HTTP_200_OK,
    response_model=PublicFormTokenResponse,
)
async def get_public_form_token(
    workspace_slug: str,
    form_slug: str,
    request: Request,
    service: FormServiceDep,
) -> PublicFormTokenResponse:
    """
    Issue or refresh an ephemeral HMAC form token for an active feedback session.
    Stateless and replay-protected.
    """
    origin = request.headers.get("origin") or request.headers.get("referer")
    token = await service.get_public_form_token(
        workspace_slug, form_slug, origin_or_referer=origin
    )
    return PublicFormTokenResponse(form_token=token)


@router.post(
    "/{workspace_slug}/{form_slug}/submit",
    status_code=status.HTTP_201_CREATED,
    response_model=FeedbackSubmissionResponse,
)
async def submit_feedback(
    workspace_slug: str,
    form_slug: str,
    payload: FeedbackSubmissionCreate,
    request: Request,
    service: SubmissionServiceDep,
) -> FeedbackSubmissionResponse:
    """
    Publicly submit feedback through an embedded widget or standalone link.
    Validates form rules, saves ratings/answers, and returns tailored outcome screen.
    No authentication required.
    """
    origin = request.headers.get("origin") or request.headers.get("referer")
    client_ip = request.client.host if request.client else None
    return await service.submit_feedback(
        workspace_slug,
        form_slug,
        payload,
        origin_or_referer=origin,
        client_ip=client_ip,
    )
