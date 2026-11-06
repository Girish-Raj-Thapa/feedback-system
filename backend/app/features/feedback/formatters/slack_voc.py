"""
Slack Voice of Customer (VoC) Block Kit Formatter.
Constructs rich, standardized Core Signal Trio alert cards from feedback submissions.
"""

from typing import Any

from app.core.config import settings
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
    base_url = (frontend_base_url or settings.FRONTEND_URL).rstrip("/")
    triage_url = f"{base_url}/workspace/{workspace_slug}?tab=inbox&id={submission.id}"

    # 1. Determine Severity Header
    rating = submission.rating
    scale = submission.rating_scale_type or "5_star"
    is_detractor = False

    if rating is not None:
        if scale in ("5_star", "5_emoji"):
            is_detractor = rating <= 3
        elif scale == "1_10_numeric":
            is_detractor = rating <= 6
    elif submission.sentiment == "negative":
        is_detractor = True

    sentiment = (submission.sentiment or "neutral").lower()
    if is_detractor:
        header_prefix = "🔴 Detractor Feedback"
    elif sentiment == "positive":
        header_prefix = "🟢 Promoter Feedback"
    else:
        header_prefix = "⚪ New Feedback"

    form_display = form_title.strip() if form_title else "Customer Survey"
    header_text = f"{header_prefix} • {form_display}"

    # 2. Format Rating Stars / Numbers
    if rating is not None:
        if scale == "5_star":
            stars_filled = "★" * rating
            stars_empty = "☆" * (5 - rating)
            score_text = f"{stars_filled}{stars_empty} ({rating}/5)"
        elif scale == "5_emoji":
            emoji_map = {1: "😡", 2: "🙁", 3: "😐", 4: "🙂", 5: "😍"}
            emoji = emoji_map.get(rating, "⭐")
            score_text = f"{emoji} ({rating}/5)"
        elif scale == "1_10_numeric":
            score_text = f"🎯 {rating}/10"
        else:
            score_text = f"★ {rating}"
    else:
        score_text = "N/A (Unrated)"

    # 3. Format Theme Bucket & Sentiment
    cat_display = (
        category_name.strip()
        if category_name
        else (submission.category_pill_label or "General / Uncategorized")
    )
    theme_text = f"🏷️ {cat_display}"

    sentiment_emoji_map = {
        "positive": "🟢 Positive",
        "neutral": "⚪ Neutral",
        "negative": "🔴 Negative",
    }
    sentiment_display = sentiment_emoji_map.get(
        sentiment, sentiment.capitalize()
    )

    # 4. Assemble Blocks
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": header_text[:150],
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Rating:*\n{score_text}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Theme Bucket:*\n{theme_text}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Sentiment:*\n{sentiment_display}",
                },
            ],
        },
    ]

    # 5. Comment Blockquote
    if submission.comment and submission.comment.strip():
        # Clean and truncate comment if excessively long (Slack limit is 3000 chars per text block)
        clean_comment = submission.comment.strip()
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

    # 6. Optional Context Elements (Email, Plan Tier, Referrer)
    context_elements: list[dict[str, str]] = []

    # Customer Email (subject to privacy setting on the rule)
    if rule.include_customer_email and submission.customer_email:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"👤 *Customer:* `{submission.customer_email}`",
            }
        )

    # Customer Metadata (Plan tier / Monthly spend / Ref)
    meta = submission.customer_metadata or {}
    plan_tier = meta.get("plan_tier") or meta.get("tier")
    if plan_tier:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"💼 *Plan:* `{plan_tier}`",
            }
        )

    spend = meta.get("monthly_spend") or meta.get("spend")
    if spend:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"💰 *Spend:* `{spend}`",
            }
        )

    ref = meta.get("ref") or meta.get("source")
    if ref:
        context_elements.append(
            {
                "type": "mrkdwn",
                "text": f"🔗 *ref:* `{ref}`",
            }
        )

    if context_elements:
        blocks.append(
            {
                "type": "context",
                "elements": context_elements[:10],
            }
        )

    # 7. Action Button: Deep Link to Dashboard Triage Drawer
    # Slack Block Kit Button rules:
    # "style" ONLY accepts "primary" (green) or "danger" (red).
    # "default" is INVALID and causes Slack to reject with HTTP 400 invalid_blocks.
    # For default/neutral buttons, omit the "style" property entirely.
    button_element: dict[str, Any] = {
        "type": "button",
        "text": {
            "type": "plain_text",
            "text": "🔍 View in Dashboard & Triage ↗",
            "emoji": True,
        },
        "url": triage_url,
        "action_id": f"triage_btn_{submission.id}",
    }
    if is_detractor:
        button_element["style"] = "danger"
    elif sentiment == "positive":
        button_element["style"] = "primary"

    blocks.append(
        {
            "type": "actions",
            "elements": [button_element],
        }
    )

    fallback_text = (
        f"{header_text} - Rating: {score_text} | Theme: {theme_text}"
    )

    return {
        "text": fallback_text,
        "blocks": blocks,
    }

