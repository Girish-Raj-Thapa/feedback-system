"""
Email HTML formatter for Voice of Customer (VoC) feedback alerts.
Renders XSS-safe Jinja2 HTML email alerts with the Core Signal Trio and Triage Inbox deep link.
"""

from typing import Any

from app.core.config import settings
from app.core.email import render_email_template
from app.features.feedback.formatters.common import extract_voc_signal
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission


def format_email_voc_payload(
    submission: FeedbackSubmission,
    rule: AlertRule,
    workspace_slug: str,
    form_title: str | None = None,
    category_name: str | None = None,
    frontend_base_url: str | None = None,
) -> dict[str, Any]:
    """
    Build an email alert payload containing subject, rendered HTML, and structured metadata.
    """
    sig = extract_voc_signal(
        submission=submission,
        rule=rule,
        workspace_slug=workspace_slug,
        form_title=form_title,
        category_name=category_name,
        frontend_base_url=frontend_base_url,
    )

    severity_tag = "Low Rating Alert" if sig.is_detractor else "New Feedback"
    subject = f"[{settings.APP_NAME}] {severity_tag}: {sig.form_display} ({sig.category_display})"

    html = render_email_template(
        "feedback_alert.html",
        app_name=settings.APP_NAME,
        subject_title=subject,
        is_test=False,
        is_detractor=sig.is_detractor,
        badge_label="Negative / Low Rating" if sig.is_detractor else "Customer Feedback",
        header_text=sig.header_text,
        score_text=sig.score_text,
        category_display=sig.category_display,
        sentiment_display=sig.sentiment_display,
        comment_text=sig.comment_text,
        customer_email=sig.customer_email,
        customer_name=sig.customer_name,
        plan_tier=sig.plan_tier,
        ref=sig.ref,
        triage_url=sig.triage_url,
    )

    return {
        "event": "feedback.detractor" if sig.is_detractor else "feedback.submitted",
        "subject": subject,
        "html": html,
        "triage_url": sig.triage_url,
    }
