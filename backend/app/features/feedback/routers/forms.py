"""
FastAPI router for Workspace Feedback Forms & Widget Studio.
Endpoints are workspace-scoped and protected by RBAC permissions.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import require_permission
from app.features.feedback.dependencies import FormServiceDep
from app.features.feedback.schemas.forms import (
    FormCreate,
    FormDuplicateRequest,
    FormRead,
    FormUpdate,
)

router = APIRouter(
    prefix="/forms",
    tags=["feedback-forms"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:read"))],
)
async def list_forms(
    workspace_id: UUID,
    service: FormServiceDep,
) -> list[FormRead]:
    """
    List all active feedback forms configured in this workspace.
    """
    forms = await service.list_forms(workspace_id)
    return [FormRead.model_validate(f) for f in forms]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("forms:create"))],
)
async def create_form(
    workspace_id: UUID,
    payload: FormCreate,
    service: FormServiceDep,
) -> FormRead:
    """
    Create a new feedback form or embed widget.
    Optionally pre-populates configuration from a starter template ('saas', 'ecommerce', etc.).
    """
    form = await service.create_form(workspace_id, payload)
    return FormRead.model_validate(form)


@router.get(
    "/{form_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:read"))],
)
async def get_form(
    workspace_id: UUID,
    form_id: UUID,
    service: FormServiceDep,
) -> FormRead:
    """
    Get full configuration details for a specific feedback form.
    """
    form = await service.get_form(workspace_id, form_id)
    return FormRead.model_validate(form)


@router.patch(
    "/{form_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("forms:update"))],
)
async def update_form(
    workspace_id: UUID,
    form_id: UUID,
    payload: FormUpdate,
    service: FormServiceDep,
) -> FormRead:
    """
    Update questions, category pills, theme colors, rating scale, or outcome screens.
    """
    form = await service.update_form(workspace_id, form_id, payload)
    return FormRead.model_validate(form)


@router.delete(
    "/{form_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("forms:delete"))],
)
async def delete_form(
    workspace_id: UUID,
    form_id: UUID,
    service: FormServiceDep,
) -> None:
    """
    Soft-delete a feedback form. Historical submissions are preserved.
    """
    await service.delete_form(workspace_id, form_id)


@router.post(
    "/{form_id}/duplicate",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("forms:create"))],
)
async def duplicate_form(
    workspace_id: UUID,
    form_id: UUID,
    payload: FormDuplicateRequest,
    service: FormServiceDep,
) -> FormRead:
    """
    Clone an existing feedback form with all its questions, pills, theme, and outcome screens.
    """
    form = await service.duplicate_form(workspace_id, form_id, payload)
    return FormRead.model_validate(form)

