"""
FastAPI router for Feedback Alert Rules.
Manages workspace routing rules for real-time customer feedback alerts.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import require_permission
from app.features.feedback.dependencies import AlertRuleServiceDep
from app.features.feedback.schemas.alert_rules import (
    AlertRuleCreate,
    AlertRuleRead,
    AlertRuleUpdate,
)

router = APIRouter(
    prefix="/alerts",
    tags=["feedback-alerts"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def list_alert_rules(
    workspace_id: UUID,
    service: AlertRuleServiceDep,
) -> list[AlertRuleRead]:
    """
    List all configured feedback alert rules for this workspace.
    """
    rules = await service.list_alert_rules(workspace_id)
    return [AlertRuleRead.from_model(r) for r in rules]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def create_alert_rule(
    workspace_id: UUID,
    payload: AlertRuleCreate,
    service: AlertRuleServiceDep,
) -> AlertRuleRead:
    """
    Create a new feedback notification routing rule.
    Configures trigger condition (detractors only vs all) and form filters.
    """
    rule = await service.create_alert_rule(workspace_id, payload)
    return AlertRuleRead.from_model(rule)


@router.get(
    "/{rule_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def get_alert_rule(
    workspace_id: UUID,
    rule_id: UUID,
    service: AlertRuleServiceDep,
) -> AlertRuleRead:
    """
    Get alert rule details by ID.
    """
    rule = await service.get_alert_rule(workspace_id, rule_id)
    return AlertRuleRead.from_model(rule)


@router.patch(
    "/{rule_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def update_alert_rule(
    workspace_id: UUID,
    rule_id: UUID,
    payload: AlertRuleUpdate,
    service: AlertRuleServiceDep,
) -> AlertRuleRead:
    """
    Update an alert rule's name, active state, trigger condition, or form scope.
    """
    updated = await service.update_alert_rule(workspace_id, rule_id, payload)
    return AlertRuleRead.from_model(updated)


@router.delete(
    "/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def delete_alert_rule(
    workspace_id: UUID,
    rule_id: UUID,
    service: AlertRuleServiceDep,
) -> None:
    """
    Soft-delete an alert rule.
    """
    await service.delete_alert_rule(workspace_id, rule_id)

