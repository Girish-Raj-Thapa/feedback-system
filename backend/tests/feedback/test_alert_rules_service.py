"""
Unit tests for AlertRuleService.
Verifies alert rule validation, form existence checking, and lifecycle management.
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.core.errors import NotFoundError, ValidationError
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.forms import Form
from app.features.feedback.schemas.alert_rules import (
    AlertRuleCreate,
    AlertRuleRead,
    AlertRuleUpdate,
)
from app.features.feedback.services.alert_rules import AlertRuleService
from app.features.notifications.models.connections import NotificationConnection


@pytest.mark.asyncio
async def test_create_alert_rule_success_all_forms() -> None:
    """Verify creating an alert rule applicable to all forms."""
    session = AsyncMock()
    service = AlertRuleService(session)

    workspace_id = uuid4()
    conn_id = uuid4()
    conn = NotificationConnection(
        id=conn_id,
        workspace_id=workspace_id,
        name="Team Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )

    rule = AlertRule(
        id=uuid4(),
        workspace_id=workspace_id,
        connection_id=conn_id,
        name="Detractor Alerts",
        trigger_type="detractors_only",
        form_ids=None,
        include_customer_email=True,
        is_active=True,
    )
    rule.connection = conn

    payload = AlertRuleCreate(
        connection_id=conn_id,
        name="Detractor Alerts",
        trigger_type="detractors_only",
        form_ids=None,
        include_customer_email=True,
    )

    with (
        patch.object(service.connection_repo, "get_by_id", return_value=conn),
        patch.object(service.rule_repo, "create", return_value=rule),
    ):
        created = await service.create_alert_rule(workspace_id, payload)
        assert created.name == "Detractor Alerts"
        assert created.trigger_type == "detractors_only"
        assert created.form_ids is None
        assert session.commit.called


@pytest.mark.asyncio
async def test_create_alert_rule_missing_connection_fails() -> None:
    """Verify creating alert rule with invalid connection raises ValidationError."""
    session = AsyncMock()
    service = AlertRuleService(session)

    workspace_id = uuid4()
    payload = AlertRuleCreate(
        connection_id=uuid4(),
        name="Orphan Rule",
        trigger_type="detractors_only",
    )

    with patch.object(service.connection_repo, "get_by_id", return_value=None):
        with pytest.raises(ValidationError, match="connection does not exist"):
            await service.create_alert_rule(workspace_id, payload)


@pytest.mark.asyncio
async def test_create_alert_rule_missing_form_fails() -> None:
    """Verify creating alert rule with an invalid form ID raises ValidationError."""
    session = AsyncMock()
    service = AlertRuleService(session)

    workspace_id = uuid4()
    conn_id = uuid4()
    conn = NotificationConnection(
        id=conn_id,
        workspace_id=workspace_id,
        name="Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )

    bad_form_id = uuid4()
    payload = AlertRuleCreate(
        connection_id=conn_id,
        name="Form Rule",
        trigger_type="all_feedback",
        form_ids=[bad_form_id],
    )

    with (
        patch.object(service.connection_repo, "get_by_id", return_value=conn),
        patch.object(service.form_repo, "get_by_id", return_value=None),
    ):
        with pytest.raises(ValidationError, match="Form ID .* was not found"):
            await service.create_alert_rule(workspace_id, payload)


@pytest.mark.asyncio
async def test_update_alert_rule_success() -> None:
    """Verify updating alert rule trigger type and form scope."""
    session = AsyncMock()
    service = AlertRuleService(session)

    workspace_id = uuid4()
    rule_id = uuid4()
    rule = AlertRule(
        id=rule_id,
        workspace_id=workspace_id,
        connection_id=uuid4(),
        name="Initial Rule",
        trigger_type="detractors_only",
        form_ids=None,
        is_active=True,
    )

    valid_form = Form(
        id=uuid4(),
        workspace_id=workspace_id,
        name="NPS Form",
        slug="nps",
    )

    with (
        patch.object(service.rule_repo, "get_by_id", return_value=rule),
        patch.object(service.form_repo, "get_by_id", return_value=valid_form),
    ):
        update_payload = AlertRuleUpdate(
            name="Updated Rule",
            trigger_type="all_feedback",
            form_ids=[valid_form.id],
        )
        updated = await service.update_alert_rule(
            workspace_id, rule_id, update_payload
        )
        assert updated.name == "Updated Rule"
        assert updated.trigger_type == "all_feedback"
        assert updated.form_ids == [str(valid_form.id)]
        assert session.commit.called


def test_alert_rule_read_dto() -> None:
    """Verify AlertRuleRead correctly extracts connection metadata and form strings."""
    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Engineering Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )
    rule = AlertRule(
        id=uuid4(),
        workspace_id=conn.workspace_id,
        connection_id=conn.id,
        name="Escalations",
        trigger_type="detractors_only",
        form_ids=["f111", "f222"],
        include_customer_email=False,
        is_active=True,
    )
    rule.connection = conn

    dto = AlertRuleRead.from_model(rule)
    assert dto.connection_name == "Engineering Slack"
    assert dto.connection_health == "healthy"
    assert dto.form_ids == ["f111", "f222"]
    assert dto.include_customer_email is False

