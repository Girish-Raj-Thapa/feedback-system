"""
SMTP email delivery service and Jinja2 HTML template rendering.
"""

import asyncio
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any

import jinja2

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.core.email")

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_jinja_env: jinja2.Environment | None = None


def get_jinja_env() -> jinja2.Environment:
    """
    Get or initialize the shared Jinja2 template environment.
    """
    global _jinja_env
    if _jinja_env is None:
        _jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(TEMPLATES_DIR),
            autoescape=jinja2.select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )
    return _jinja_env


def render_email_template(template_name: str, **context: Any) -> str:
    """
    Render an HTML email template with Jinja2 inheritance support.
    """
    env = get_jinja_env()
    try:
        template = env.get_template(template_name)
    except jinja2.TemplateNotFound as exc:
        raise FileNotFoundError(f"Email template not found: {template_name}") from exc
    return template.render(**context)


def _send_smtp(message: EmailMessage) -> None:
    try:
        with smtplib.SMTP(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            timeout=10,
        ) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except Exception as exc:
        logger.error(
            "email.send_failed",
            error=str(exc),
            recipient=message["To"],
            subject=message["Subject"],
        )
        if settings.is_production:
            raise


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
) -> None:
    """
    Send an HTML email asynchronously via the configured SMTP server.
    """
    message = EmailMessage()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(html_content, subtype="html")

    await asyncio.to_thread(_send_smtp, message)
