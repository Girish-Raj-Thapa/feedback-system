"""
Service layer for Feedback Forms and Widget Configurations.
Handles slug generation, template defaults, validation, and duplication.
"""

import re
from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.models.forms import Form
from app.features.feedback.presets.form_templates import get_form_template
from app.features.feedback.repositories.forms import FormRepository
from app.features.feedback.schemas.forms import (
    FormCreate,
    FormDuplicateRequest,
    FormUpdate,
    PublicFormRead,
)


def slugify(text: str) -> str:
    """
    Generate an alphanumeric-hyphen slug from text.
    """
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "feedback-form"


class FormService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.form_repo = FormRepository(session)

    async def _ensure_workspace_exists(self, workspace_id: UUID) -> Workspace:
        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )
        return ws

    async def _generate_unique_slug(
        self,
        workspace_id: UUID,
        base_slug: str,
        exclude_id: UUID | None = None,
    ) -> str:
        """
        Generate a unique slug in the workspace by appending increments if needed.
        """
        candidate = base_slug
        counter = 1
        while await self.form_repo.slug_exists(
            workspace_id, candidate, exclude_id=exclude_id
        ):
            counter += 1
            candidate = f"{base_slug}-{counter}"
        return candidate

    async def list_forms(self, workspace_id: UUID) -> Sequence[Form]:
        """
        List all active forms for a workspace.
        """
        await self._ensure_workspace_exists(workspace_id)
        return await self.form_repo.list_active(workspace_id)

    async def get_form(self, workspace_id: UUID, form_id: UUID) -> Form:
        """
        Get a specific form by ID.
        """
        await self._ensure_workspace_exists(workspace_id)
        form = await self.form_repo.get_by_id(workspace_id, form_id)
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Feedback form not found",
            )
        return form

    async def get_public_form(
        self,
        workspace_slug: str,
        form_slug: str,
    ) -> PublicFormRead:
        """
        Retrieve a public form configuration for embed widgets and hosted standalone pages.
        """
        row = await self.form_repo.get_public_form(workspace_slug, form_slug)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found or is currently inactive",
            )
        form, ws = row
        return PublicFormRead(
            id=form.id,
            workspace_slug=ws.slug,
            workspace_name=ws.name,
            name=form.name,
            slug=form.slug,
            is_active=form.is_active,
            title=form.title,
            subtitle=form.subtitle,
            rating_scale_type=form.rating_scale_type,
            rating_required=form.rating_required,
            category_pills=form.category_pills,
            custom_questions=form.custom_questions,
            open_feedback_prompt=form.open_feedback_prompt,
            open_feedback_placeholder=form.open_feedback_placeholder,
            contact_field_mode=form.contact_field_mode,
            theme_config=form.theme_config,
            outcome_screen=form.outcome_screen,
            widget_settings=form.widget_settings,
        )

    async def create_form(self, workspace_id: UUID, payload: FormCreate) -> Form:
        """
        Create a new feedback form, applying template defaults if requested.
        """
        await self._ensure_workspace_exists(workspace_id)

        # Base template defaults
        template = get_form_template(payload.template_type)

        # Slug resolution
        if payload.slug and payload.slug.strip():
            target_slug = slugify(payload.slug)
            if await self.form_repo.slug_exists(workspace_id, target_slug):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A form with slug '{target_slug}' already exists in this workspace",
                )
        else:
            base = slugify(payload.name)
            target_slug = await self._generate_unique_slug(workspace_id, base)

        form = Form(
            workspace_id=workspace_id,
            name=payload.name.strip(),
            slug=target_slug,
            template_type=payload.template_type,
            title=payload.title or template["title"],
            subtitle=payload.subtitle
            if payload.subtitle is not None
            else template.get("subtitle"),
            rating_scale_type=payload.rating_scale_type
            or template["rating_scale_type"],
            rating_required=(
                payload.rating_required
                if payload.rating_required is not None
                else template["rating_required"]
            ),
            category_pills=(
                payload.category_pills
                if payload.category_pills is not None
                else template.get("category_pills", [])
            ),
            custom_questions=(
                payload.custom_questions
                if payload.custom_questions is not None
                else template.get("custom_questions", [])
            ),
            open_feedback_prompt=(
                payload.open_feedback_prompt or template["open_feedback_prompt"]
            ),
            open_feedback_placeholder=(
                payload.open_feedback_placeholder
                if payload.open_feedback_placeholder is not None
                else template.get("open_feedback_placeholder")
            ),
            contact_field_mode=(
                payload.contact_field_mode or template["contact_field_mode"]
            ),
            theme_config=(
                payload.theme_config
                if payload.theme_config is not None
                else template.get("theme_config", {})
            ),
            outcome_screen=(
                payload.outcome_screen
                if payload.outcome_screen is not None
                else template.get("outcome_screen", {})
            ),
            widget_settings=(
                payload.widget_settings
                if payload.widget_settings is not None
                else template.get("widget_settings", {})
            ),
            allowed_domains=payload.allowed_domains or [],
        )

        await self.form_repo.create(form)
        await self.session.commit()
        await self.session.refresh(form)
        return form

    async def update_form(
        self,
        workspace_id: UUID,
        form_id: UUID,
        payload: FormUpdate,
    ) -> Form:
        """
        Update an existing form configuration.
        """
        form = await self.get_form(workspace_id, form_id)

        update_data = payload.model_dump(exclude_unset=True)

        if "slug" in update_data and update_data["slug"]:
            new_slug = slugify(update_data["slug"])
            if new_slug != form.slug:
                if await self.form_repo.slug_exists(
                    workspace_id, new_slug, exclude_id=form.id
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Slug '{new_slug}' is already taken in this workspace",
                    )
                update_data["slug"] = new_slug

        if "name" in update_data and update_data["name"]:
            update_data["name"] = update_data["name"].strip()

        updated_form = await self.form_repo.update(form, update_data)
        await self.session.commit()
        await self.session.refresh(updated_form)
        return updated_form

    async def delete_form(self, workspace_id: UUID, form_id: UUID) -> None:
        """
        Soft-delete a form.
        """
        form = await self.get_form(workspace_id, form_id)
        await self.form_repo.soft_delete(form)
        await self.session.commit()

    async def duplicate_form(
        self,
        workspace_id: UUID,
        form_id: UUID,
        payload: FormDuplicateRequest,
    ) -> Form:
        """
        Clone an existing form with all its questions, pills, theme, and outcome screens.
        """
        source = await self.get_form(workspace_id, form_id)

        dup_name = (
            payload.name.strip()
            if payload.name and payload.name.strip()
            else f"{source.name} (Copy)"
        )
        base_slug = slugify(dup_name)
        new_slug = await self._generate_unique_slug(workspace_id, base_slug)

        new_form = Form(
            workspace_id=workspace_id,
            name=dup_name,
            slug=new_slug,
            template_type=source.template_type,
            title=source.title,
            subtitle=source.subtitle,
            rating_scale_type=source.rating_scale_type,
            rating_required=source.rating_required,
            category_pills=list(source.category_pills),
            custom_questions=list(source.custom_questions),
            open_feedback_prompt=source.open_feedback_prompt,
            open_feedback_placeholder=source.open_feedback_placeholder,
            contact_field_mode=source.contact_field_mode,
            theme_config=dict(source.theme_config),
            outcome_screen=dict(source.outcome_screen),
            widget_settings=dict(source.widget_settings),
            allowed_domains=list(source.allowed_domains),
        )

        await self.form_repo.create(new_form)
        await self.session.commit()
        await self.session.refresh(new_form)
        return new_form
