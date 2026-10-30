"""
Background tasks for user verification and password recovery.
"""

from app.core.config import settings
from app.core.email import render_email_template, send_email
from app.core.logging import get_logger
from app.core.tasks import broker

logger = get_logger("app.features.auth.tasks")


@broker.task
async def send_verification_email_task(email: str, token: str) -> None:
    """
    Send an account verification email containing a clickable verification link.
    """
    logger.info("auth.task.send_verification_email", email=email)
    base_url = settings.FRONTEND_URL.rstrip("/")
    verification_url = f"{base_url}/verify-email?token={token}"

    html_content = render_email_template(
        "verify_email.html",
        app_name=settings.EMAILS_FROM_NAME,
        email=email,
        token=token,
        verification_url=verification_url,
        expires_hours=settings.EMAIL_VERIFY_TOKEN_TTL_HOURS,
    )
    await send_email(
        to_email=email,
        subject=f"Verify your email - {settings.EMAILS_FROM_NAME}",
        html_content=html_content,
    )


@broker.task
async def send_password_reset_email_task(email: str, token: str) -> None:
    """
    Send a password reset email containing a clickable reset link.
    """
    logger.info("auth.task.send_password_reset_email", email=email)
    base_url = settings.FRONTEND_URL.rstrip("/")
    reset_url = f"{base_url}/reset-password?token={token}"

    html_content = render_email_template(
        "reset_password.html",
        app_name=settings.EMAILS_FROM_NAME,
        email=email,
        token=token,
        reset_url=reset_url,
        expires_minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    )
    await send_email(
        to_email=email,
        subject=f"Reset your password - {settings.EMAILS_FROM_NAME}",
        html_content=html_content,
    )


@broker.task
async def send_workspace_invite_email_task(
    email: str,
    workspace_name: str,
    inviter_name: str | None,
    role_name: str,
    token: str,
) -> None:
    """
    Send a workspace invitation email containing a clickable join link.
    """
    logger.info(
        "auth.task.send_workspace_invite_email",
        email=email,
        workspace_name=workspace_name,
        role=role_name,
    )
    base_url = settings.FRONTEND_URL.rstrip("/")
    invite_url = f"{base_url}/invite?token={token}"

    html_content = render_email_template(
        "workspace_invite.html",
        app_name=settings.EMAILS_FROM_NAME,
        email=email,
        workspace_name=workspace_name,
        inviter_name=inviter_name,
        role_name=role_name,
        token=token,
        invite_url=invite_url,
        expires_days=settings.WORKSPACE_INVITE_TOKEN_TTL_DAYS,
    )
    await send_email(
        to_email=email,
        subject=f"Invitation to join {workspace_name} - {settings.EMAILS_FROM_NAME}",
        html_content=html_content,
    )
