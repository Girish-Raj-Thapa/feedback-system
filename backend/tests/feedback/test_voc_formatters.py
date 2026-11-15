"""
Unit tests for Discord Embed, Generic JSON, and unified VoC payload formatter dispatcher.
"""

from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import uuid4

from app.features.feedback.formatters.discord_voc import (
    COLOR_DETRACTOR,
    COLOR_PROMOTER,
    format_discord_voc_payload,
)
from app.features.feedback.formatters.dispatcher import format_voc_payload
from app.features.feedback.formatters.generic_voc import format_generic_voc_payload
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission


def _make_submission(
    *,
    rating: int | None = 2,
    sentiment: str = "negative",
    comment: str | None = "Checkout crashed on Safari.",
    email: str | None = "buyer@acme.io",
) -> MagicMock:
    sub = MagicMock(spec=FeedbackSubmission)
    sub.id = uuid4()
    sub.workspace_id = uuid4()
    sub.form_id = uuid4()
    sub.rating = rating
    sub.rating_scale_type = "5_star"
    sub.sentiment = sentiment
    sub.comment = comment
    sub.category_pill_label = "Bugs"
    sub.customer_email = email
    sub.customer_name = "Alex"
    sub.customer_metadata = {"plan_tier": "pro", "ref": "checkout"}
    sub.source = "widget"
    sub.status = "new"
    sub.created_at = datetime(2026, 11, 15, 12, 0, 0, tzinfo=UTC)
    return sub


def test_format_discord_voc_payload_detractor() -> None:
    """Verify Discord Rich Embed contains red bar, Core Signal Trio, and triage link."""
    sub = _make_submission(rating=2, sentiment="negative")
    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = True

    payload = format_discord_voc_payload(
        submission=sub,
        rule=rule,
        workspace_slug="acme",
        form_title="Checkout Survey",
        category_name="Product Bugs",
        frontend_base_url="https://app.voc.test",
    )

    assert "embeds" in payload
    embed = payload["embeds"][0]
    assert embed["color"] == COLOR_DETRACTOR
    assert "🔴 Detractor Feedback • Checkout Survey" in embed["title"]
    assert '> "Checkout crashed on Safari."' == embed["description"]
    assert embed["url"] == f"https://app.voc.test/workspace/acme?tab=inbox&id={sub.id}"

    fields_map = {f["name"]: f["value"] for f in embed["fields"]}
    assert "★★☆☆☆ (2/5)" in fields_map["Rating"]
    assert "Product Bugs" in fields_map["Theme Bucket"]
    assert "`buyer@acme.io`" in fields_map["Customer"]
    assert "`pro`" in fields_map["Plan"]


def test_format_discord_voc_payload_promoter_privacy() -> None:
    """Verify promoter uses green color and redacts email when privacy is enabled."""
    sub = _make_submission(rating=5, sentiment="positive", email="secret@user.com")
    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = False

    payload = format_discord_voc_payload(
        submission=sub,
        rule=rule,
        workspace_slug="acme",
    )
    embed = payload["embeds"][0]
    assert embed["color"] == COLOR_PROMOTER
    assert "secret@user.com" not in str(payload)


def test_format_generic_voc_payload_structure() -> None:
    """Verify Generic JSON payload includes clean structured event and feedback data."""
    sub = _make_submission(rating=1, sentiment="negative")
    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = True

    payload = format_generic_voc_payload(
        submission=sub,
        rule=rule,
        workspace_slug="acme",
        form_title="Exit Survey",
        category_name="Pricing & Billing",
        frontend_base_url="https://app.voc.test",
    )

    assert payload["event"] == "feedback.detractor"
    assert payload["event_id"] == f"sub_{sub.id}"
    assert payload["workspace"]["slug"] == "acme"
    assert payload["form"]["title"] == "Exit Survey"
    fb = payload["feedback"]
    assert fb["rating"] == 1
    assert fb["category"] == "Pricing & Billing"
    assert fb["customer_email"] == "buyer@acme.io"
    assert fb["customer_metadata"] == {"plan_tier": "pro", "ref": "checkout"}
    assert fb["triage_url"] == f"https://app.voc.test/workspace/acme?tab=inbox&id={sub.id}"


def test_format_generic_voc_payload_redacts_pii() -> None:
    """Verify Generic JSON omits customer email & name when include_customer_email is False."""
    sub = _make_submission(rating=5, sentiment="positive", email="hidden@user.com")
    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = False

    payload = format_generic_voc_payload(
        submission=sub,
        rule=rule,
        workspace_slug="acme",
    )
    assert payload["event"] == "feedback.promoter"
    assert payload["feedback"]["customer_email"] is None
    assert payload["feedback"]["customer_name"] is None


def test_format_voc_payload_dispatcher_routing() -> None:
    """Verify format_voc_payload routes correctly based on provider_type."""
    sub = _make_submission()
    rule = MagicMock(spec=AlertRule)
    rule.include_customer_email = True

    slack_out = format_voc_payload("slack_webhook", sub, rule, "acme")
    assert "blocks" in slack_out

    discord_out = format_voc_payload("discord_webhook", sub, rule, "acme")
    assert "embeds" in discord_out

    generic_out = format_voc_payload("generic_webhook", sub, rule, "acme")
    assert generic_out["event"] == "feedback.detractor"
    assert "feedback" in generic_out
