"""
Discord Voice of Customer (VoC) Rich Embed Formatter.
Constructs standardized Core Signal Trio Embed cards from feedback submissions.
"""

from datetime import UTC, datetime
from typing import Any

from app.features.feedback.formatters.common import extract_voc_signal
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission

COLOR_DETRACTOR = 0xEF4444  # Red
COLOR_PROMOTER = 0x10B981  # Green
COLOR_NEUTRAL = 0x6B7280  # Gray


def format_discord_voc_payload(
    submission: FeedbackSubmission,
    rule: AlertRule,
    workspace_slug: str,
    form_title: str | None = None,
    category_name: str | None = None,
    frontend_base_url: str | None = None,
) -> dict[str, Any]:
    """
    Format a FeedbackSubmission into a standardized Discord Rich Embed payload.
    """
    sig = extract_voc_signal(
        submission=submission,
        rule=rule,
        workspace_slug=workspace_slug,
        form_title=form_title,
        category_name=category_name,
        frontend_base_url=frontend_base_url,
    )

    if sig.is_detractor:
        embed_color = COLOR_DETRACTOR
    elif sig.sentiment == "positive":
        embed_color = COLOR_PROMOTER
    else:
        embed_color = COLOR_NEUTRAL

    if sig.comment_text:
        clean_comment = sig.comment_text
        if len(clean_comment) > 2500:
            clean_comment = clean_comment[:2497] + "..."
        description = f'> "{clean_comment}"'
    else:
        description = "*No written explanation provided.*"

    fields: list[dict[str, Any]] = [
        {"name": "Rating", "value": sig.score_text, "inline": True},
        {
            "name": "Theme Bucket",
            "value": f"🏷️ {sig.category_display}",
            "inline": True,
        },
        {"name": "Sentiment", "value": sig.sentiment_display, "inline": True},
    ]

    if sig.customer_email:
        fields.append(
            {"name": "Customer", "value": f"`{sig.customer_email}`", "inline": True}
        )
    if sig.plan_tier:
        fields.append({"name": "Plan", "value": f"`{sig.plan_tier}`", "inline": True})
    if sig.spend:
        fields.append({"name": "Spend", "value": f"`{sig.spend}`", "inline": True})
    if sig.ref:
        fields.append({"name": "Source / Ref", "value": f"`{sig.ref}`", "inline": True})

    created_at = getattr(submission, "created_at", None)
    timestamp_iso = (
        created_at.isoformat()
        if isinstance(created_at, datetime)
        else datetime.now(UTC).isoformat()
    )

    return {
        "content": None,
        "embeds": [
            {
                "title": sig.header_text[:256],
                "description": description,
                "url": sig.triage_url,
                "color": embed_color,
                "fields": fields,
                "footer": {
                    "text": "FeedbackFlow • Click the title above to view & triage in dashboard"
                },
                "timestamp": timestamp_iso,
            }
        ],
    }
