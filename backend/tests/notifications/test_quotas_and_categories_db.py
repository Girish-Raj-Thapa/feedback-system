"""
PostgreSQL & API integration tests for:
1. NotificationQuotaService (Free vs Pro connection/rule/monthly/hourly SQL counts).
2. NotificationConnectionService workspace-member email enforcement & /connections/quota API.
3. AlertRuleService category_ids DB persistence, deduplication, and cross-workspace validation.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationError
from app.features.auth.models import User, Workspace
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.schemas.alert_rules import AlertRuleCreate, AlertRuleUpdate
from app.features.feedback.services.alert_rules import AlertRuleService
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.models.deliveries import OutboundDelivery
from app.features.notifications.schemas import NotificationConnectionCreate
from app.features.notifications.services.connection_service import (
    NotificationConnectionService,
)
from app.features.notifications.services.quota_service import NotificationQuotaService


@pytest.mark.asyncio
async def test_email_connection_member_verification_and_quota_in_db(
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace,
    auth_client: AsyncClient,
) -> None:
    """Verify real DB member lookup, Free connection quota (2), and GET /connections/quota."""
    conn_svc = NotificationConnectionService(db_session)

    # 1. Non-member email is rejected against real DB
    with pytest.raises(ValidationError, match="verified member"):
        await conn_svc.create_connection(
            test_workspace.id,
            NotificationConnectionCreate(
                name="Outsider Email",
                provider_type="email_alert",
                destination_url="outsider@not-in-workspace.com",
            ),
        )

    # 2. Workspace owner (test_user) is accepted
    email_conn = await conn_svc.create_connection(
        test_workspace.id,
        NotificationConnectionCreate(
            name="Owner Email Alerts",
            provider_type="email_alert",
            destination_url=test_user.email,
        ),
    )
    assert email_conn.provider_type == "email_alert"
    assert email_conn.destination_url == test_user.email.lower()

    # 3. Second connection allowed on Free plan (max_connections = 2)
    slack_conn = await conn_svc.create_connection(
        test_workspace.id,
        NotificationConnectionCreate(
            name="Main Slack",
            provider_type="slack_webhook",
            destination_url="https://hooks.slack.com/services/T1/B2/token_db_test",
        ),
    )

    # 4. Third connection rejected on Free plan
    with pytest.raises(ValidationError, match="Free plan limit reached"):
        await conn_svc.create_connection(
            test_workspace.id,
            NotificationConnectionCreate(
                name="Extra Discord",
                provider_type="discord_webhook",
                destination_url="https://discord.com/api/webhooks/123456/abcdef_token",
            ),
        )

    # 5. Insert real OutboundDelivery rows (active + cancelled) and inspect quota SQL JOIN
    now = datetime.now(UTC)
    test_workspace.cycle_reset_at = now + timedelta(days=29)
    db_session.add_all(
        [
            OutboundDelivery(
                workspace_id=test_workspace.id,
                connection_id=email_conn.id,
                idempotency_key=f"quota_email_1_{uuid4()}",
                status="delivered",
                payload_snapshot={"subject": "Alert 1"},
                created_at=now - timedelta(minutes=10),
            ),
            OutboundDelivery(
                workspace_id=test_workspace.id,
                connection_id=email_conn.id,
                idempotency_key=f"quota_email_cancelled_{uuid4()}",
                status="cancelled",
                payload_snapshot={"subject": "Cancelled"},
                created_at=now - timedelta(minutes=5),
            ),
            OutboundDelivery(
                workspace_id=test_workspace.id,
                connection_id=slack_conn.id,
                idempotency_key=f"quota_slack_old_{uuid4()}",
                status="delivered",
                payload_snapshot={"text": "Slack Old"},
                created_at=now - timedelta(hours=3),
            ),
        ]
    )
    await db_session.commit()

    resp = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/connections/quota"
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["plan_tier"] == "free"
    assert body["max_connections"] == 2
    assert body["connections_used"] == 2
    # Cancelled delivery is excluded from counts
    assert body["monthly_email_used"] == 1
    assert body["hourly_email_used"] == 1
    # Slack delivery from 3h ago counts toward monthly but not hourly burst
    assert body["monthly_webhook_used"] == 1
    assert body["hourly_webhook_used"] == 0

    # 6. Upgrading workspace to 'pro' unlocks higher connection & monthly limits
    test_workspace.plan_tier = "pro"
    await db_session.commit()

    quota_svc = NotificationQuotaService(db_session)
    pro_status = await quota_svc.get_quota_status(test_workspace.id)
    assert pro_status.plan_tier == "pro"
    assert pro_status.limits.max_connections == 15
    assert pro_status.limits.monthly_email_alerts == 1000


@pytest.mark.asyncio
async def test_alert_rule_category_ids_persistence_and_dedup_in_db(
    db_session: AsyncSession,
    test_workspace: Workspace,
) -> None:
    """Verify AlertRuleService persists deduplicated category_ids and rejects foreign categories in DB."""
    conn = NotificationConnection(
        workspace_id=test_workspace.id,
        name="Category Alert Channel",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/cat_token",
    )
    cat = FeedbackCategory(
        workspace_id=test_workspace.id,
        name="Bugs & Reliability",
        slug=f"bugs-{uuid4().hex[:6]}",
        description="Bug reports",
        color="#ef4444",
    )
    db_session.add_all([conn, cat])
    await db_session.commit()

    alert_svc = AlertRuleService(db_session)

    # Reject unknown category_id
    with pytest.raises(ValidationError, match="Category ID .* was not found"):
        await alert_svc.create_alert_rule(
            test_workspace.id,
            AlertRuleCreate(
                connection_id=conn.id,
                name="Bad Category Rule",
                trigger_type="all_feedback",
                category_ids=[uuid4()],
            ),
        )

    # Duplicate category UUIDs are deduplicated cleanly
    rule = await alert_svc.create_alert_rule(
        test_workspace.id,
        AlertRuleCreate(
            connection_id=conn.id,
            name="Bugs Only Rule",
            trigger_type="detractors_only",
            category_ids=[cat.id, cat.id],
        ),
    )
    assert rule.category_ids == [str(cat.id)]

    # Clearing category_ids=[] normalizes back to None (All Categories)
    updated = await alert_svc.update_alert_rule(
        test_workspace.id,
        rule.id,
        AlertRuleUpdate(category_ids=[]),
    )
    assert updated.category_ids is None
