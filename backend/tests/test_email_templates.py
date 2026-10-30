"""
Unit tests for HTML email template rendering.
"""

import pytest

from app.core.config import settings
from app.core.email import render_email_template


def test_render_verify_email_template() -> None:
    # Test with explicit verification_url
    verification_url = (
        "https://app.feedback.local/verify-email?token=sample-verify-token-123"
    )
    html = render_email_template(
        "verify_email.html",
        app_name="Feedback System",
        email="user@test.com",
        token="sample-verify-token-123",
        verification_url=verification_url,
        expires_hours=24,
    )
    assert "Feedback System" in html
    assert "sample-verify-token-123" in html
    assert verification_url in html
    assert "Verify Email Address" in html
    assert "24 hours" in html
    assert "<!DOCTYPE html>" in html
    assert "{{ token }}" not in html
    assert "{{ app_name }}" not in html


def test_render_reset_password_template() -> None:
    reset_url = "https://app.feedback.local/reset-password?token=sample-reset-token-456"
    html = render_email_template(
        "reset_password.html",
        app_name=settings.EMAILS_FROM_NAME,
        email="user@test.com",
        token="sample-reset-token-456",
        reset_url=reset_url,
        expires_minutes=30,
    )
    assert "sample-reset-token-456" in html
    assert reset_url in html
    assert "Reset Password" in html
    assert "user@test.com" in html
    assert "30 minutes" in html
    assert "<!DOCTYPE html>" in html
    assert "{{ token }}" not in html


def test_render_workspace_invite_template() -> None:
    invite_url = "https://app.feedback.local/invite?token=sample-invite-token-789"
    html = render_email_template(
        "workspace_invite.html",
        app_name="Feedback System",
        email="colleague@test.com",
        workspace_name="Acme Corp",
        inviter_name="Alice Owner",
        role_name="Editor",
        token="sample-invite-token-789",
        invite_url=invite_url,
        expires_days=7,
    )
    assert "Feedback System" in html
    assert "Acme Corp" in html
    assert "Alice Owner" in html
    assert "Editor" in html
    assert "sample-invite-token-789" in html
    assert invite_url in html
    assert "Accept Invitation" in html
    assert "7 days" in html
    assert "<!DOCTYPE html>" in html
    assert "{{ token }}" not in html
    assert "{{ workspace_name }}" not in html


def test_render_template_not_found() -> None:
    with pytest.raises(FileNotFoundError):
        render_email_template("non_existent.html")
