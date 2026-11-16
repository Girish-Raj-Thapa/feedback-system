"""
Provider-aware VoC payload formatter dispatcher.
Routes submission formatting to Slack Block Kit, Discord Rich Embed, or Generic JSON.
"""

from typing import Any

from app.features.feedback.formatters.discord_voc import format_discord_voc_payload
from app.features.feedback.formatters.email_voc import format_email_voc_payload
from app.features.feedback.formatters.generic_voc import format_generic_voc_payload
from app.features.feedback.formatters.slack_voc import format_slack_voc_payload
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.submissions import FeedbackSubmission


def format_voc_payload(
    provider_type: str,
    submission: FeedbackSubmission,
    rule: AlertRule,
    workspace_slug: str,
    form_title: str | None = None,
    category_name: str | None = None,
    frontend_base_url: str | None = None,
) -> dict[str, Any]:
    """
    Dispatch payload formatting to the formatter matching the connection's provider_type.
    """
    normalized = (provider_type or "slack_webhook").lower()

    if normalized == "discord_webhook":
        return format_discord_voc_payload(
            submission=submission,
            rule=rule,
            workspace_slug=workspace_slug,
            form_title=form_title,
            category_name=category_name,
            frontend_base_url=frontend_base_url,
        )

    if normalized == "generic_webhook":
        return format_generic_voc_payload(
            submission=submission,
            rule=rule,
            workspace_slug=workspace_slug,
            form_title=form_title,
            category_name=category_name,
            frontend_base_url=frontend_base_url,
        )

    if normalized == "email_alert":
        return format_email_voc_payload(
            submission=submission,
            rule=rule,
            workspace_slug=workspace_slug,
            form_title=form_title,
            category_name=category_name,
            frontend_base_url=frontend_base_url,
        )

    return format_slack_voc_payload(
        submission=submission,
        rule=rule,
        workspace_slug=workspace_slug,
        form_title=form_title,
        category_name=category_name,
        frontend_base_url=frontend_base_url,
    )
