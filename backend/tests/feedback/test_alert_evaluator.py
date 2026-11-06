"""
Unit tests for AlertEvaluatorService and SlackVoCFormatter.
Verifies trigger matrix evaluation, form scope filtering, and Core Signal Trio Block Kit card formatting.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.features.feedback.formatters.slack_voc import format_slack_voc_payload
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.services.alert_evaluator import AlertEvaluatorService
from app.features.notifications.models.connections import NotificationConnection


def test_format_slack_voc_payload_detractor() -> None:
    """Verify Slack Block Kit formatting for a detractor feedback submission."""
    submission = MagicMock(spec=FeedbackSubmission)
    submission.id = uuid4()
    submission.rating = 2
    submission.rating_scale_type = "5_star"
    submission.sentiment = "negative"
    submission.comment = "The checkout form crashed twice."
    submission.category_pill_label = "Bugs & Issues"
    submission.customer_email = "alex@startup.io"
    submission.customer_metadata = {
        "plan_tier": "Pro",
        "monthly_spend": "$49/mo",
        "ref": "checkout_page",
    }

    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = True

    payload = format_slack_voc_payload(
        submission=submission,
        rule=rule,
        workspace_slug="acme-corp",
        form_title="Checkout Survey",
        category_name="Product Bugs",
        frontend_base_url="https://app.voc.test",
    )

    assert "🔴 Detractor Feedback • Checkout Survey" in payload["text"]
    blocks = payload["blocks"]
    assert len(blocks) >= 4

    # Header
    assert blocks[0]["type"] == "header"
    assert "🔴 Detractor Feedback" in blocks[0]["text"]["text"]

    # Rating, Theme, Sentiment
    fields_text = " ".join(f["text"] for f in blocks[1]["fields"])
    assert "★★☆☆☆ (2/5)" in fields_text
    assert "🏷️ Product Bugs" in fields_text
    assert "🔴 Negative" in fields_text

    # Comment
    assert '> "The checkout form crashed twice."' in blocks[2]["text"]["text"]

    # Context elements (Email + Plan + Spend + Ref)
    context_block = next(b for b in blocks if b["type"] == "context")
    context_text = " ".join(e["text"] for e in context_block["elements"])
    assert "alex@startup.io" in context_text
    assert "Pro" in context_text
    assert "$49/mo" in context_text
    assert "checkout_page" in context_text

    # Action button deep link
    action_block = next(b for b in blocks if b["type"] == "actions")
    button = action_block["elements"][0]
    expected_url = (
        f"https://app.voc.test/workspace/acme-corp?tab=inbox&id={submission.id}"
    )
    assert button["url"] == expected_url
    assert button["style"] == "danger"


def test_format_slack_voc_payload_privacy_redacts_email() -> None:
    """Verify customer email is omitted when include_customer_email is False."""
    submission = MagicMock(spec=FeedbackSubmission)
    submission.id = uuid4()
    submission.rating = 5
    submission.rating_scale_type = "5_star"
    submission.sentiment = "positive"
    submission.comment = "Loving the product!"
    submission.category_pill_label = None
    submission.customer_email = "private@user.com"
    submission.customer_metadata = {}

    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = False  # Privacy ON

    payload = format_slack_voc_payload(
        submission=submission,
        rule=rule,
        workspace_slug="acme-corp",
    )

    # Search all blocks for the email
    payload_str = str(payload)
    assert "private@user.com" not in payload_str
    assert "🟢 Promoter Feedback" in payload["text"]

    # Promoter button should use primary (green) style and never invalid "default"
    action_block = next(b for b in payload["blocks"] if b["type"] == "actions")
    button = action_block["elements"][0]
    assert button["style"] == "primary"
    assert "default" not in [button.get("style")]


def test_format_slack_voc_payload_neutral_omits_style() -> None:
    """Verify neutral feedback omits style property entirely (Slack default)."""
    submission = MagicMock(spec=FeedbackSubmission)
    submission.id = uuid4()
    submission.rating = None
    submission.rating_scale_type = None
    submission.sentiment = "neutral"
    submission.comment = "It works as expected."
    submission.category_pill_label = None
    submission.customer_email = None
    submission.customer_metadata = {}

    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = False

    payload = format_slack_voc_payload(
        submission=submission,
        rule=rule,
        workspace_slug="acme-corp",
    )

    action_block = next(b for b in payload["blocks"] if b["type"] == "actions")
    button = action_block["elements"][0]
    # Slack strictly forbids "style": "default" - it must be omitted
    assert "style" not in button


@pytest.mark.asyncio
async def test_alert_evaluator_detractors_only_matching() -> None:
    """Verify detractors_only rule matches ratings <= 3 and ignores 4 and 5."""
    session = AsyncMock()
    evaluator = AlertEvaluatorService(session)

    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Detractor Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )

    rule = AlertRule(
        workspace_id=uuid4(),
        connection_id=conn.id,
        name="Detractor Alerts",
        is_active=True,
        trigger_type="detractors_only",
        form_ids=None,  # All forms
    )
    rule.connection = conn

    # Detractor 1 (Rating 2/5) -> Match
    sub_detractor = MagicMock(spec=FeedbackSubmission)
    sub_detractor.form_id = uuid4()
    sub_detractor.rating = 2
    sub_detractor.rating_scale_type = "5_star"
    sub_detractor.sentiment = "negative"
    assert evaluator._matches(sub_detractor, rule) is True

    # Neutral/Promoter (Rating 4/5) -> No match
    sub_promoter = MagicMock(spec=FeedbackSubmission)
    sub_promoter.form_id = uuid4()
    sub_promoter.rating = 4
    sub_promoter.rating_scale_type = "5_star"
    sub_promoter.sentiment = "positive"
    assert evaluator._matches(sub_promoter, rule) is False

    # Neutral rating 3/5 -> Match (<= 3 is detractor)
    sub_3 = MagicMock(spec=FeedbackSubmission)
    sub_3.form_id = uuid4()
    sub_3.rating = 3
    sub_3.rating_scale_type = "5_star"
    sub_3.sentiment = "neutral"
    assert evaluator._matches(sub_3, rule) is True


@pytest.mark.asyncio
async def test_alert_evaluator_all_feedback_matching() -> None:
    """Verify all_feedback rule matches every submission."""
    session = AsyncMock()
    evaluator = AlertEvaluatorService(session)

    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="All Feedback Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )

    rule = AlertRule(
        workspace_id=uuid4(),
        connection_id=conn.id,
        name="All Feedback",
        is_active=True,
        trigger_type="all_feedback",
        form_ids=None,
    )
    rule.connection = conn

    sub_5 = MagicMock(spec=FeedbackSubmission)
    sub_5.form_id = uuid4()
    sub_5.rating = 5
    sub_5.rating_scale_type = "5_star"
    sub_5.sentiment = "positive"
    assert evaluator._matches(sub_5, rule) is True


@pytest.mark.asyncio
async def test_alert_evaluator_form_scope_filtering() -> None:
    """Verify rule with specific form_ids only matches submissions from allowed forms."""
    session = AsyncMock()
    evaluator = AlertEvaluatorService(session)

    target_form_id = uuid4()
    other_form_id = uuid4()

    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Form Specific Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )

    rule = AlertRule(
        workspace_id=uuid4(),
        connection_id=conn.id,
        name="Form Specific Alert",
        is_active=True,
        trigger_type="all_feedback",
        form_ids=[str(target_form_id)],  # Only target_form_id
    )
    rule.connection = conn

    sub_target = MagicMock(spec=FeedbackSubmission)
    sub_target.form_id = target_form_id
    sub_target.rating = 5
    sub_target.rating_scale_type = "5_star"
    sub_target.sentiment = "positive"
    assert evaluator._matches(sub_target, rule) is True

    sub_other = MagicMock(spec=FeedbackSubmission)
    sub_other.form_id = other_form_id
    sub_other.rating = 5
    sub_other.rating_scale_type = "5_star"
    sub_other.sentiment = "positive"
    assert evaluator._matches(sub_other, rule) is False


@pytest.mark.asyncio
async def test_alert_evaluator_skips_inactive_or_revoked_connection() -> None:
    """Verify rule is ignored if connection is inactive or revoked."""
    session = AsyncMock()
    evaluator = AlertEvaluatorService(session)

    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Revoked Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=False,
        health_status="revoked",
    )

    rule = AlertRule(
        workspace_id=uuid4(),
        connection_id=conn.id,
        name="Revoked Alert",
        is_active=True,
        trigger_type="all_feedback",
        form_ids=None,
    )
    rule.connection = conn

    sub = MagicMock(spec=FeedbackSubmission)
    sub.form_id = uuid4()
    sub.rating = 1
    sub.rating_scale_type = "5_star"
    sub.sentiment = "negative"
    assert evaluator._matches(sub, rule) is False


@pytest.mark.asyncio
async def test_find_matching_rules_service_query() -> None:
    """Verify find_matching_rules queries active rules and filters matches correctly."""
    session = AsyncMock()
    evaluator = AlertEvaluatorService(session)

    conn = NotificationConnection(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Active Slack",
        provider_type="slack_webhook",
        destination_url="https://hooks.slack.com/services/T1/B2/token",
        is_active=True,
        health_status="healthy",
    )
    rule = AlertRule(
        workspace_id=conn.workspace_id,
        connection_id=conn.id,
        name="Detractor Alerts",
        is_active=True,
        trigger_type="detractors_only",
        form_ids=None,
    )
    rule.connection = conn

    with patch.object(
        evaluator.rule_repo, "list_active_for_evaluation", return_value=[rule]
    ):
        sub_detractor = MagicMock(spec=FeedbackSubmission)
        sub_detractor.form_id = uuid4()
        sub_detractor.rating = 2
        sub_detractor.rating_scale_type = "5_star"
        sub_detractor.sentiment = "negative"

        matches = await evaluator.find_matching_rules(sub_detractor, conn.workspace_id)
        assert len(matches) == 1
        assert matches[0].name == "Detractor Alerts"

        sub_promoter = MagicMock(spec=FeedbackSubmission)
        sub_promoter.form_id = uuid4()
        sub_promoter.rating = 5
        sub_promoter.rating_scale_type = "5_star"
        sub_promoter.sentiment = "positive"

        matches_empty = await evaluator.find_matching_rules(
            sub_promoter, conn.workspace_id
        )
        assert len(matches_empty) == 0
