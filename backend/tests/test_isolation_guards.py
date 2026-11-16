"""
Self-tests verifying global test harness isolation:
1. Pytest runs strictly in ENVIRONMENT=test against feedback_test DB and Redis /15.
2. Unmocked SMTP sockets and send_email are blocked loudly.
3. Unmocked outbound httpx requests are blocked while ASGITransport and MockTransport work.
4. Taskiq .kiq() calls are intercepted in memory without touching Redis/workers.
"""

import smtplib
from typing import Any

import httpx
import pytest

from app.core.config import settings
from app.core.email import send_email
from app.features.auth.tasks import send_verification_email_task


def test_environment_points_to_isolated_test_infra() -> None:
    """Verify tests never run against dev DB, Redis /0, or live SMTP credentials."""
    assert settings.is_test is True
    assert settings.ENVIRONMENT == "test"
    assert settings.DATABASE_URL.endswith("/feedback_test")
    assert settings.REDIS_URL.endswith("/15")
    assert settings.LLM_PROVIDER == "mock"
    assert settings.SMTP_HOST == "127.0.0.1"


@pytest.mark.asyncio
async def test_real_smtp_and_send_email_are_blocked() -> None:
    """Verify unmocked SMTP connections and send_email fail loudly in tests."""
    with pytest.raises(RuntimeError, match="Blocked real SMTP"):
        smtplib.SMTP("sandbox.smtp.mailtrap.io", 2525)

    with pytest.raises(RuntimeError, match="Real SMTP delivery is disabled"):
        await send_email(
            to_email="user_leak@test.com",
            subject="Should Never Send",
            html_content="<p>Blocked</p>",
            raise_on_error=True,
        )


@pytest.mark.asyncio
async def test_real_outbound_httpx_is_blocked_while_mock_transport_works() -> None:
    """Verify real external HTTP requests are rejected while MockTransport passes."""
    async with httpx.AsyncClient() as http:
        with pytest.raises(RuntimeError, match="Blocked real outbound HTTP request"):
            await http.post("https://hooks.slack.com/services/T1/B2/secret")

    mock_transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json={"ok": True})
    )
    async with httpx.AsyncClient(transport=mock_transport) as http:
        resp = await http.get("https://hooks.slack.com/services/T1/B2/mock")
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_taskiq_kiq_is_intercepted_in_memory(kicked_tasks: list[Any]) -> None:
    """Verify unmocked .kiq() dispatches go to kicked_tasks and never to Redis."""
    assert len(kicked_tasks) == 0
    await send_verification_email_task.kiq("isolated@test.com", "dummy-token")
    assert len(kicked_tasks) == 1
    assert "send_verification_email_task" in kicked_tasks[0].task_name
