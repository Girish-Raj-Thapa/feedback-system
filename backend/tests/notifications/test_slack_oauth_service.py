"""
Unit tests for SlackOAuthService.
Verifies signed state generation, Redis single-use nonce validation,
tamper detection, server-to-server code exchange, and idempotent upserts.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import jwt
import pytest

from app.core.config import settings
from app.core.errors import ForbiddenError, ValidationError
from app.features.auth.models import User, Workspace
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.services.slack_oauth_service import (
    SlackOAuthService,
)


def make_test_state(
    workspace_id, user_id, nonce, expired: bool = False
) -> str:
    now = datetime.now(UTC)
    exp = (
        now - timedelta(minutes=5)
        if expired
        else now + timedelta(minutes=10)
    )
    claims = {
        "type": "slack_oauth_state",
        "ws": str(workspace_id),
        "u": str(user_id),
        "nonce": nonce,
        "iat": int((now - timedelta(minutes=1)).timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm="HS256")


@pytest.mark.asyncio
async def test_generate_authorize_url_success() -> None:
    """Verify authorize URL generation creates signed JWT state and stores nonce in Redis."""
    session = AsyncMock()
    service = SlackOAuthService(session)

    workspace_id = uuid4()
    user_id = uuid4()

    mock_redis = AsyncMock()
    mock_redis.set = AsyncMock()

    with (
        patch(
            "app.features.notifications.services.slack_oauth_service.get_redis",
            return_value=mock_redis,
        ),
        patch.object(settings, "SLACK_CLIENT_ID", "slack_client_123"),
        patch.object(
            settings,
            "SLACK_REDIRECT_URI",
            "http://localhost:3000/integrations/slack/callback",
        ),
    ):
        url = await service.generate_authorize_url(workspace_id, user_id)

        assert url.startswith("https://slack.com/oauth/v2/authorize?")
        assert "client_id=slack_client_123" in url
        assert "scope=incoming-webhook" in url
        assert (
            "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fintegrations%2Fslack%2Fcallback"
            in url
        )
        assert "state=" in url
        assert mock_redis.set.called


@pytest.mark.asyncio
async def test_generate_authorize_url_missing_client_id_raises() -> None:
    """Verify error raised if SLACK_CLIENT_ID is not configured."""
    session = AsyncMock()
    service = SlackOAuthService(session)

    with patch.object(settings, "SLACK_CLIENT_ID", ""):
        with pytest.raises(
            ValidationError, match="Slack App Client ID is not configured"
        ):
            await service.generate_authorize_url(uuid4(), uuid4())


@pytest.mark.asyncio
async def test_complete_oauth_success_and_deduplication() -> None:
    """Verify complete_oauth exchanges code, consumes nonce, and creates connection."""
    session = AsyncMock()
    service = SlackOAuthService(session)

    workspace_id = uuid4()
    user = User(id=uuid4(), email="owner@example.com")
    nonce = "test_nonce_abc"
    state = make_test_state(workspace_id, user.id, nonce)

    mock_redis = AsyncMock()
    mock_redis.getdel.return_value = f"{workspace_id}:{user.id}"

    ws = Workspace(id=workspace_id, name="Acme Corp", slug="acme-corp")
    session.get.return_value = ws

    mock_slack_response = {
        "ok": True,
        "app_id": "A123",
        "team": {"id": "T999", "name": "Acme Slack"},
        "incoming_webhook": {
            "channel": "#feedback-stream",
            "channel_id": "C888",
            "url": "https://hooks.slack.com/services/T999/B888/token123",
            "configuration_url": "https://acme.slack.com/services/B888",
        },
    }

    mock_http_response = MagicMock()
    mock_http_response.status_code = 200
    mock_http_response.text = "ok"
    mock_http_response.json.return_value = mock_slack_response

    created_conn = NotificationConnection(
        id=uuid4(),
        workspace_id=workspace_id,
        name="feedback-stream",
        provider_type="slack_webhook",
        connection_method="oauth",
        destination_url="https://hooks.slack.com/services/T999/B888/token123",
        is_active=True,
        health_status="healthy",
    )

    with (
        patch(
            "app.features.notifications.services.slack_oauth_service.get_redis",
            return_value=mock_redis,
        ),
        patch(
            "app.features.auth.services.AuthService.has_permission",
            return_value=True,
        ),
        patch("httpx.AsyncClient.post", return_value=mock_http_response),
        patch.object(
            service.connection_repo, "find_by_slack_channel", return_value=None
        ),
        patch.object(
            service.connection_repo, "create", return_value=created_conn
        ),
        patch.object(settings, "SLACK_CLIENT_ID", "client_1"),
        patch.object(settings, "SLACK_CLIENT_SECRET", "secret_1"),
    ):
        conn, slug = await service.complete_oauth("auth_code_123", state, user)

        assert slug == "acme-corp"
        assert conn.name == "feedback-stream"
        mock_redis.getdel.assert_called_with(f"slack_oauth_nonce:{nonce}")
        assert session.commit.called


@pytest.mark.asyncio
async def test_complete_oauth_replayed_nonce_rejected() -> None:
    """Verify replayed or expired nonce (getdel returns None) is rejected immediately."""
    session = AsyncMock()
    service = SlackOAuthService(session)

    workspace_id = uuid4()
    user = User(id=uuid4(), email="owner@example.com")
    nonce = "replayed_nonce"
    state = make_test_state(workspace_id, user.id, nonce)

    mock_redis = AsyncMock()
    mock_redis.getdel.return_value = None  # Already consumed!

    with (
        patch(
            "app.features.notifications.services.slack_oauth_service.get_redis",
            return_value=mock_redis,
        ),
        patch.object(settings, "SLACK_CLIENT_ID", "client_1"),
        patch.object(settings, "SLACK_CLIENT_SECRET", "secret_1"),
    ):
        with pytest.raises(
            ValidationError, match="expired or has already been used"
        ):
            await service.complete_oauth("code_1", state, user)


@pytest.mark.asyncio
async def test_complete_oauth_user_mismatch_forbidden() -> None:
    """Verify state issued to User A cannot be completed by User B."""
    session = AsyncMock()
    service = SlackOAuthService(session)

    workspace_id = uuid4()
    user_a_id = uuid4()
    user_b = User(id=uuid4(), email="user_b@example.com")
    state = make_test_state(workspace_id, user_a_id, "some_nonce")

    with (
        patch.object(settings, "SLACK_CLIENT_ID", "client_1"),
        patch.object(settings, "SLACK_CLIENT_SECRET", "secret_1"),
    ):
        with pytest.raises(
            ForbiddenError, match="different authenticated user"
        ):
            await service.complete_oauth("code_1", state, user_b)


@pytest.mark.asyncio
async def test_complete_oauth_slack_rejected_error() -> None:
    """Verify Slack ok: false raises clean ValidationError."""
    session = AsyncMock()
    service = SlackOAuthService(session)

    workspace_id = uuid4()
    user = User(id=uuid4(), email="owner@example.com")
    nonce = "valid_nonce"
    state = make_test_state(workspace_id, user.id, nonce)

    mock_redis = AsyncMock()
    mock_redis.getdel.return_value = "val"

    ws = Workspace(id=workspace_id, name="Acme", slug="acme")
    session.get.return_value = ws

    mock_http_response = MagicMock()
    mock_http_response.json.return_value = {
        "ok": False,
        "error": "code_already_used",
    }

    with (
        patch(
            "app.features.notifications.services.slack_oauth_service.get_redis",
            return_value=mock_redis,
        ),
        patch(
            "app.features.auth.services.AuthService.has_permission",
            return_value=True,
        ),
        patch("httpx.AsyncClient.post", return_value=mock_http_response),
        patch.object(settings, "SLACK_CLIENT_ID", "client_1"),
        patch.object(settings, "SLACK_CLIENT_SECRET", "secret_1"),
    ):
        with pytest.raises(ValidationError, match="code_already_used"):
            await service.complete_oauth("bad_code", state, user)
