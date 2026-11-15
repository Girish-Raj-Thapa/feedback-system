"""
Generic Outbound JSON Webhook Formatter.
Constructs a clean, standardized VoC event JSON payload for automation tools
(Zapier, Make, n8n, Linear) and custom customer endpoints.
"""

from datetime import UTC, datetime
from typing import Any

from app.features.feedback.formatters.common import extract_voc_signal
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission


def format_generic_voc_payload(
    submission: FeedbackSubmission,
    rule: AlertRule,
    workspace_slug: str,
    form_title: str | None = None,
    category_name: str | None = None,
    frontend_base_url: str | None = None,
) -> dict[str, Any]:
    """
    Format a FeedbackSubmission into a standardized outbound JSON event payload.
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
        event_name = "feedback.detractor"
    elif sig.sentiment == "positive":
        event_name = "feedback.promoter"
    else:
        event_name = "feedback.submitted"

    created_at = getattr(submission, "created_at", None)
    created_at_iso = (
        created_at.isoformat()
        if isinstance(created_at, datetime)
        else datetime.now(UTC).isoformat()
    )

    return {
        "event": event_name,
        "event_id": f"sub_{submission.id}",
        "timestamp": created_at_iso,
        "workspace": {
            "id": str(submission.workspace_id),
            "slug": workspace_slug,
        },
        "form": {
            "id": str(getattr(submission, "form_id", "")),
            "title": sig.form_display,
        },
        "feedback": {
            "id": str(submission.id),
            "rating": submission.rating,
            "rating_scale": submission.rating_scale_type,
            "sentiment": sig.sentiment,
            "category": sig.category_display,
            "comment": sig.comment_text,
            "customer_email": sig.customer_email,
            "customer_name": sig.customer_name,
            "customer_metadata": dict(submission.customer_metadata or {}),
            "source": getattr(submission, "source", None),
            "status": getattr(submission, "status", "new"),
            "created_at": created_at_iso,
            "triage_url": sig.triage_url,
        },
    }
