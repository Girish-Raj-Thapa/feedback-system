"""
Outbound Email Alert notification provider.
Delivers instant VoC alerts to a verified workspace member via SMTP.
"""

import smtplib
from typing import Any

from email_validator import EmailNotValidError, validate_email

from app.core.config import settings
from app.core.email import render_email_template, send_email
from app.core.logging import get_logger
from app.features.notifications.providers.base import (
    BaseNotificationProvider,
    ProviderResult,
)

logger = get_logger("app.features.notifications.providers.email")


class EmailAlertProvider(BaseNotificationProvider):
    """
    Provider for internal workspace-member instant email alerts ('email_alert').
    """

    @property
    def provider_type(self) -> str:
        return "email_alert"

    def validate_destination_url(self, url: str) -> None:
        """
        Validate that destination_url is a single valid email address with no CR/LF or multiple recipients.
        """
        if not url or not isinstance(url, str):
            raise ValueError("Recipient email address is required.")

        raw = url.strip()
        if "\r" in raw or "\n" in raw:
            raise ValueError("Invalid characters in email address.")

        if "," in raw or ";" in raw or " " in raw:
            raise ValueError(
                "Only a single workspace member email address is allowed per connection."
            )

        try:
            validate_email(raw, check_deliverability=False)
        except EmailNotValidError as exc:
            raise ValueError(f"Invalid recipient email address: {exc}") from exc

    def build_test_payload(self, workspace_name: str) -> dict[str, Any]:
        """
        Build a verification test email payload for a workspace member.
        """
        subject = f"[{settings.APP_NAME}] Test Email Alert • {workspace_name}"
        html = render_email_template(
            "feedback_alert.html",
            app_name=settings.APP_NAME,
            subject_title=subject,
            is_test=True,
            is_detractor=False,
            badge_label="Channel Verified",
            header_text=f"Email Alerts Connected for {workspace_name}",
            workspace_name=workspace_name,
        )
        return {
            "event": "test.ping",
            "subject": subject,
            "html": html,
        }

    async def dispatch(
        self,
        url: str,
        payload: dict[str, Any],
        secret_token: str | None = None,
    ) -> ProviderResult:
        """
        Send the rendered HTML email via SMTP and classify SMTP errors into transient vs permanent.
        """
        try:
            self.validate_destination_url(url)
        except ValueError as exc:
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=str(exc),
                is_transient=False,
                is_revocation=True,
            )

        recipient = url.strip().lower()
        subject = str(
            payload.get("subject")
            or f"[{settings.APP_NAME}] Customer Feedback Alert"
        )
        html_body = str(payload.get("html") or "")
        if not html_body:
            test_fallback = self.build_test_payload(settings.APP_NAME)
            html_body = str(test_fallback["html"])

        try:
            await send_email(
                to_email=recipient,
                subject=subject,
                html_content=html_body,
                raise_on_error=True,
            )
            return ProviderResult(
                success=True,
                status_code=250,
                response_body="SMTP 250 OK",
                error_message=None,
                is_transient=False,
            )
        except smtplib.SMTPRecipientsRefused as exc:
            logger.warning(
                "notifications.email.recipient_refused",
                recipient=recipient,
                error=str(exc),
            )
            return ProviderResult(
                success=False,
                status_code=550,
                response_body=str(exc)[:500],
                error_message="Recipient email address was rejected by the mail server (550).",
                is_transient=False,
                is_revocation=True,
            )
        except smtplib.SMTPResponseException as exc:
            code = exc.smtp_code
            is_permanent = 500 <= code < 600
            return ProviderResult(
                success=False,
                status_code=code,
                response_body=str(exc)[:500],
                error_message=f"SMTP error {code}: {exc.smtp_error!r}",
                is_transient=not is_permanent,
                is_revocation=is_permanent and code in (550, 551, 553),
            )
        except Exception as exc:
            logger.warning(
                "notifications.email.transient_error",
                recipient=recipient,
                error=str(exc),
            )
            return ProviderResult(
                success=False,
                status_code=None,
                response_body=None,
                error_message=f"Email delivery error: {exc}",
                is_transient=True,
            )
