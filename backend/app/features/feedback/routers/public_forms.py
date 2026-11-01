"""
Public unauthenticated router for Feedback Forms.
Used by embeddable widgets and standalone hosted pages (/f/{workspace_slug}/{form_slug}).
"""

from fastapi import APIRouter, status

from app.features.feedback.dependencies import FormServiceDep
from app.features.feedback.schemas.forms import PublicFormRead

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

