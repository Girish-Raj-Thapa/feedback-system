"""
Database repository for Feedback Forms and Widget Configurations.
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.models.forms import Form


class FormRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_active(self, workspace_id: UUID) -> Sequence[Form]:
        """
        List all non-deleted forms for a workspace, ordered by created_at desc.
        """
        stmt = (
            select(Form)
            .where(
                Form.workspace_id == workspace_id,
                Form.deleted_at.is_(None),
            )
            .order_by(Form.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        workspace_id: UUID,
        form_id: UUID,
    ) -> Form | None:
        """
        Get a non-deleted form by ID within a workspace.
        """
        stmt = select(Form).where(
            Form.id == form_id,
            Form.workspace_id == workspace_id,
            Form.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_slug(
        self,
        workspace_id: UUID,
        slug: str,
    ) -> Form | None:
        """
        Get a non-deleted form by slug (case-insensitive) within a workspace.
        """
        stmt = select(Form).where(
            Form.workspace_id == workspace_id,
            func.lower(Form.slug) == slug.lower().strip(),
            Form.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_public_form(
        self,
        workspace_slug: str,
        form_slug: str,
    ) -> tuple[Form, Workspace] | None:
        """
        Fetch an active form and its workspace by their URL slugs for public embedding and rendering.
        """
        stmt = (
            select(Form, Workspace)
            .join(Workspace, Form.workspace_id == Workspace.id)
            .where(
                func.lower(Workspace.slug) == workspace_slug.lower().strip(),
                func.lower(Form.slug) == form_slug.lower().strip(),
                Form.is_active.is_(True),
                Form.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if not row:
            return None
        return row[0], row[1]

    async def slug_exists(
        self,
        workspace_id: UUID,
        slug: str,
        exclude_id: UUID | None = None,
    ) -> bool:
        """
        Check if an active form with this slug exists in the workspace.
        """
        stmt = select(Form.id).where(
            Form.workspace_id == workspace_id,
            func.lower(Form.slug) == slug.lower().strip(),
            Form.deleted_at.is_(None),
        )
        if exclude_id:
            stmt = stmt.where(Form.id != exclude_id)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create(self, form: Form) -> Form:
        """
        Persist a new form.
        """
        self.session.add(form)
        await self.session.flush()
        return form

    async def update(self, form: Form, attributes: dict[str, Any]) -> Form:
        """
        Apply attribute updates to a form.
        """
        for key, value in attributes.items():
            if hasattr(form, key):
                setattr(form, key, value)
        form.updated_at = datetime.now(UTC)
        await self.session.flush()
        return form

    async def soft_delete(self, form: Form) -> None:
        """
        Soft-delete a form.
        """
        form.deleted_at = datetime.now(UTC)
        form.is_active = False
        await self.session.flush()
