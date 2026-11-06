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
from app.features.feedback.repositories.forms import FormRepository
from app.features.feedback.schemas.alert_rules import (
    AlertRuleCreate,
    AlertRuleUpdate,
)
from app.features.notifications.repositories.connections import (
    NotificationConnectionRepository,
)

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

    async def create_alert_rule(
        self,
        workspace_id: UUID,
        payload: AlertRuleCreate,
    ) -> AlertRule:
        """
        Create a new feedback notification alert rule.
        Validates that connection and target forms belong to this workspace.
        """
        # Validate connection
        conn = await self.connection_repo.get_by_id(
            workspace_id, payload.connection_id
        )
        if not conn:
            raise ValidationError(
                "Selected notification connection does not exist in this workspace"
            )

        # Validate forms if provided
        form_ids_str: list[str] | None = None
        if payload.form_ids:
            form_ids_str = []
            for f_id in payload.form_ids:
                form = await self.form_repo.get_by_id(workspace_id, f_id)
                if not form:
                    raise ValidationError(
                        f"Form ID '{f_id}' was not found in this workspace"
                    )
                form_ids_str.append(str(f_id))

        rule = AlertRule(
            workspace_id=workspace_id,
            connection_id=payload.connection_id,
            name=payload.name.strip(),
            trigger_type=payload.trigger_type,
            form_ids=form_ids_str,
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
            conn = await self.connection_repo.get_by_id(
                workspace_id, payload.connection_id
            )
            if not conn:
                raise ValidationError(
                    "Selected notification connection does not exist in this workspace"
                )
            rule.connection_id = payload.connection_id

        if payload.form_ids is not None:
            if len(payload.form_ids) == 0:
                rule.form_ids = None
            else:
                form_ids_str: list[str] = []
                for f_id in payload.form_ids:
                    form = await self.form_repo.get_by_id(workspace_id, f_id)
                    if not form:
                        raise ValidationError(
                            f"Form ID '{f_id}' was not found in this workspace"
                        )
                    form_ids_str.append(str(f_id))
                rule.form_ids = form_ids_str

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

