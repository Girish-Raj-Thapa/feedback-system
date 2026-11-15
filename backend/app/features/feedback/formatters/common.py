"""
Shared Voice of Customer (VoC) signal extraction helpers for outbound formatters.
Ensures consistent severity, score formatting, privacy masking, and deep-link generation
across Slack, Discord, and Generic JSON Webhook formatters.
"""

from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission


@dataclass(frozen=True)
class VoCSignalContext:
    """
    Normalized VoC signal fields ready for channel-specific payload formatting.
    """

    is_detractor: bool
    sentiment: str
    sentiment_display: str
    header_prefix: str
    form_display: str
    header_text: str
    score_text: str
    category_display: str
    comment_text: str | None
    customer_email: str | None
    customer_name: str | None
    plan_tier: str | None
    spend: str | None
    ref: str | None
    triage_url: str


def extract_voc_signal(
    submission: FeedbackSubmission,
    rule: AlertRule,
    workspace_slug: str,
    form_title: str | None = None,
    category_name: str | None = None,
    frontend_base_url: str | None = None,
) -> VoCSignalContext:
    """
    Extract and normalize the Core Signal Trio and context metadata from a submission.
    """
    base_url = (frontend_base_url or settings.FRONTEND_URL).rstrip("/")
    triage_url = f"{base_url}/workspace/{workspace_slug}?tab=inbox&id={submission.id}"

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

    cat_display = (
        category_name.strip()
        if category_name
        else (submission.category_pill_label or "General / Uncategorized")
    )

    sentiment_emoji_map = {
        "positive": "🟢 Positive",
        "neutral": "⚪ Neutral",
        "negative": "🔴 Negative",
    }
    sentiment_display = sentiment_emoji_map.get(
        sentiment, sentiment.capitalize()
    )

    comment_text = (
        submission.comment.strip()
        if submission.comment and submission.comment.strip()
        else None
    )

    include_identity = bool(getattr(rule, "include_customer_email", True))
    customer_email = (
        submission.customer_email if include_identity and submission.customer_email else None
    )
    customer_name = (
        getattr(submission, "customer_name", None) if include_identity else None
    )

    meta: dict[str, Any] = submission.customer_metadata or {}
    plan_tier = meta.get("plan_tier") or meta.get("tier")
    spend = meta.get("monthly_spend") or meta.get("spend")
    ref = meta.get("ref") or meta.get("source")

    return VoCSignalContext(
        is_detractor=is_detractor,
        sentiment=sentiment,
        sentiment_display=sentiment_display,
        header_prefix=header_prefix,
        form_display=form_display,
        header_text=header_text,
        score_text=score_text,
        category_display=cat_display,
        comment_text=comment_text,
        customer_email=customer_email,
        customer_name=str(customer_name) if customer_name else None,
        plan_tier=str(plan_tier) if plan_tier is not None else None,
        spend=str(spend) if spend is not None else None,
        ref=str(ref) if ref is not None else None,
        triage_url=triage_url,
    )
