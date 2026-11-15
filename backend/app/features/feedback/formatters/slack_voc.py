"""
Slack Voice of Customer (VoC) Block Kit Formatter.
Constructs rich, standardized Core Signal Trio alert cards from feedback submissions.
"""

from typing import Any

from app.features.feedback.formatters.common import extract_voc_signal
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission


def format_slack_voc_payload(
    submission: FeedbackSubmission,
    rule: AlertRule,
    workspace_slug: str,
    form_title: str | None = None,
    category_name: str | None = None,
    frontend_base_url: str | None = None,
) -> dict[str, Any]:
    """
    Format a FeedbackSubmission into a standardized Slack Block Kit card.
    Adheres strictly to the VoC "Core Signal Trio":
    1. Quantitative Score & Sentiment
    2. Locked Theme Bucket
    3. Verbatim Customer Comment
    Plus optional customer metadata and a deep link to the dashboard triage drawer.
    """
    sig = extract_voc_signal(
        submission=submission,
        rule=rule,
        workspace_slug=workspace_slug,
        form_title=form_title,
        category_name=category_name,
        frontend_base_url=frontend_base_url,
    )

    theme_text = f"🏷️ {sig.category_display}"

    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": sig.header_text[:150],
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Rating:*\n{sig.score_text}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Theme Bucket:*\n{theme_text}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Sentiment:*\n{sig.sentiment_display}",
                },
            ],
        },
    ]

    if sig.comment_text:
        clean_comment = sig.comment_text
        if len(clean_comment) > 2500:
            clean_comment = clean_comment[:2497] + "..."
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f'> "{clean_comment}"',
                },
            }
        )
    else:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "_No written explanation provided._",
                },
            }
        )

    context_elements: list[dict[str, str]] = []

    if sig.customer_email:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"👤 *Customer:* `{sig.customer_email}`",
            }
        )
    if sig.plan_tier:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"💼 *Plan:* `{sig.plan_tier}`",
            }
        )
    if sig.spend:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"💰 *Spend:* `{sig.spend}`",
            }
        )
    if sig.ref:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"🔗 *ref:* `{sig.ref}`",
            }
        )

    if context_elements:
        blocks.append(
            {
                "type": "context",
                "elements": context_elements[:10],
            }
        )

    # Slack Block Kit Button rules:
    # "style" ONLY accepts "primary" (green) or "danger" (red).
    # "default" is INVALID and causes Slack to reject with HTTP 400 invalid_blocks.
    button_element: dict[str, Any] = {
        "type": "button",
        "text": {
            "type": "plain_text",
            "text": "🔍 View in Dashboard & Triage ↗",
            "emoji": True,
        },
        "url": sig.triage_url,
        "action_id": f"triage_btn_{submission.id}",
    }
    if sig.is_detractor:
        button_element["style"] = "danger"
    elif sig.sentiment == "positive":
        button_element["style"] = "primary"

    blocks.append(
        {
            "type": "actions",
            "elements": [button_element],
        }
    )

    fallback_text = (
        f"{sig.header_text} - Rating: {sig.score_text} | Theme: {theme_text}"
    )

    return {
        "text": fallback_text,
        "blocks": blocks,
    }
