"""
Service layer for Feedback Alert Rules.
Manages creation, updates, and validation of workspace alert routing rules.
"""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.repositories.alert_rules import AlertRuleRepository
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.forms import FormRepository
from app.features.feedback.schemas.alert_rules import (
    AlertRuleCreate,
    AlertRuleUpdate,
)
from app.features.notifications.repositories.connections import (
    NotificationConnectionRepository,
)
from app.features.notifications.services.quota_service import NotificationQuotaService

logger = get_logger("app.features.feedback.services.alert_rules")


class AlertRuleService:
    """
    Service managing feedback alert rules routing.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rule_repo = AlertRuleRepository(session)
        self.connection_repo = NotificationConnectionRepository(session)
        self.form_repo = FormRepository(session)
        self.category_repo = FeedbackCategoryRepository(session)
        self.quota_service = NotificationQuotaService(session)

    async def list_alert_rules(
        self,
        workspace_id: UUID,
    ) -> Sequence[AlertRule]:
        """List all configured alert rules for a workspace."""
        return await self.rule_repo.list_by_workspace(workspace_id)

    async def get_alert_rule(
        self,
        workspace_id: UUID,
        rule_id: UUID,
    ) -> AlertRule:
        """Fetch alert rule by ID scoped to workspace."""
        rule = await self.rule_repo.get_by_id(workspace_id, rule_id)
        if not rule:
            raise NotFoundError("Alert rule not found")
        return rule

    async def _validate_form_ids(
        self,
        workspace_id: UUID,
        form_ids: list[UUID],
    ) -> list[str]:
        """Validate and deduplicate form IDs in a single SQL query."""
        unique_ids = list(dict.fromkeys(form_ids))
        existing_ids = await self.form_repo.get_existing_ids(workspace_id, unique_ids)
        for f_id in unique_ids:
            if f_id not in existing_ids:
                raise ValidationError(
                    f"Form ID '{f_id}' was not found in this workspace"
                )
        return [str(f_id) for f_id in unique_ids]

    async def _validate_category_ids(
        self,
        workspace_id: UUID,
        category_ids: list[UUID],
    ) -> list[str]:
        """Validate and deduplicate category IDs in a single SQL query."""
        unique_ids = list(dict.fromkeys(category_ids))
        existing_ids = await self.category_repo.get_existing_ids(
            workspace_id, unique_ids
        )
        for c_id in unique_ids:
            if c_id not in existing_ids:
                raise ValidationError(
                    f"Category ID '{c_id}' was not found in this workspace"
                )
        return [str(c_id) for c_id in unique_ids]

    async def create_alert_rule(
        self,
        workspace_id: UUID,
        payload: AlertRuleCreate,
    ) -> AlertRule:
        """
        Create a new feedback notification alert rule.
        Validates plan quota and ensures connection, target forms, and target categories belong to this workspace.
        """
        await self.quota_service.enforce_alert_rule_creation_quota(workspace_id)

        # Validate connection existence without loading the full row
        if not await self.connection_repo.exists_by_id(
            workspace_id, payload.connection_id
        ):
            raise ValidationError(
                "Selected notification connection does not exist in this workspace"
            )

        form_ids_str = (
            await self._validate_form_ids(workspace_id, payload.form_ids)
            if payload.form_ids
            else None
        )
        category_ids_str = (
            await self._validate_category_ids(workspace_id, payload.category_ids)
            if payload.category_ids
            else None
        )

        rule = AlertRule(
            workspace_id=workspace_id,
            connection_id=payload.connection_id,
            name=payload.name.strip(),
            trigger_type=payload.trigger_type,
            form_ids=form_ids_str,
            category_ids=category_ids_str,
            include_customer_email=payload.include_customer_email,
            is_active=True,
        )

        created = await self.rule_repo.create(rule)
        await self.session.commit()
        await self.session.refresh(created, ["connection"])

        logger.info(
            "feedback.alert_rule.created",
            workspace_id=str(workspace_id),
            rule_id=str(created.id),
            trigger_type=created.trigger_type,
            connection_id=str(created.connection_id),
        )
        return created

    async def update_alert_rule(
        self,
        workspace_id: UUID,
        rule_id: UUID,
        payload: AlertRuleUpdate,
    ) -> AlertRule:
        """
        Update an existing alert rule.
        """
        rule = await self.get_alert_rule(workspace_id, rule_id)

        if payload.connection_id is not None:
            if not await self.connection_repo.exists_by_id(
                workspace_id, payload.connection_id
            ):
                raise ValidationError(
                    "Selected notification connection does not exist in this workspace"
                )
            rule.connection_id = payload.connection_id

        if payload.form_ids is not None:
            rule.form_ids = (
                None
                if len(payload.form_ids) == 0
                else await self._validate_form_ids(workspace_id, payload.form_ids)
            )

        if payload.category_ids is not None:
            rule.category_ids = (
                None
                if len(payload.category_ids) == 0
                else await self._validate_category_ids(
                    workspace_id, payload.category_ids
                )
            )

        if payload.name is not None:
            rule.name = payload.name.strip()

        if payload.trigger_type is not None:
            rule.trigger_type = payload.trigger_type

        if payload.include_customer_email is not None:
            rule.include_customer_email = payload.include_customer_email

        if payload.is_active is not None:
            rule.is_active = payload.is_active

        await self.session.commit()
        await self.session.refresh(rule, ["connection"])

        logger.info(
            "feedback.alert_rule.updated",
            workspace_id=str(workspace_id),
            rule_id=str(rule.id),
            is_active=rule.is_active,
        )
        return rule

    async def delete_alert_rule(
        self,
        workspace_id: UUID,
        rule_id: UUID,
    ) -> None:
        """
        Soft-delete an alert rule.
        """
        rule = await self.get_alert_rule(workspace_id, rule_id)
        await self.rule_repo.soft_delete(rule)
        await self.session.commit()

        logger.info(
            "feedback.alert_rule.deleted",
            workspace_id=str(workspace_id),
            rule_id=str(rule_id),
        )

