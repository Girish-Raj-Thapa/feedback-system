"""
Slack OAuth v2 integration service.
Handles CSRF state generation, single-use nonce validation via Redis,
server-to-server code exchange, and idempotent connection upserts.
"""

import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from uuid import UUID

import httpx
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.features.auth.models import User, Workspace
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.providers.registry import provider_registry
from app.features.notifications.repositories.connections import (
    NotificationConnectionRepository,
)
from app.features.notifications.services.connection_service import (
    format_slack_test_card,
)

logger = get_logger("app.features.notifications.services.slack_oauth")


class SlackOAuthService:
    """
    Orchestrates the 1-click Slack OAuth v2 installation flow.
    """

    STATE_EXPIRY_MINUTES = 10

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.connection_repo = NotificationConnectionRepository(session)
        self.registry = provider_registry

    async def generate_authorize_url(
        self,
        workspace_id: UUID,
        user_id: UUID,
    ) -> str:
        """
        Generate signed Slack OAuth authorization URL with single-use Redis nonce.
        """
        if not settings.SLACK_CLIENT_ID:
            raise ValidationError(
                "Slack App Client ID is not configured on the server."
            )

        # 1. Generate secure random nonce
        nonce = secrets.token_urlsafe(32)

        # 2. Store nonce in Redis with TTL to guarantee single-use consumption
        redis = get_redis()
        redis_key = f"slack_oauth_nonce:{nonce}"
        await redis.set(
            redis_key,
            f"{workspace_id}:{user_id}",
            ex=self.STATE_EXPIRY_MINUTES * 60,
        )

        # 3. Create signed, tamper-proof JWT state
        now = datetime.now(UTC)
        expires_at = now + timedelta(minutes=self.STATE_EXPIRY_MINUTES)
        claims = {
            "type": "slack_oauth_state",
            "ws": str(workspace_id),
            "u": str(user_id),
            "nonce": nonce,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp()),
        }
        state = jwt.encode(
            claims,
            settings.JWT_SECRET_KEY,
            algorithm="HS256",
        )

        # 4. Construct Slack authorization URL
        params = {
            "client_id": settings.SLACK_CLIENT_ID,
            "scope": "incoming-webhook",
            "redirect_uri": settings.SLACK_REDIRECT_URI,
            "state": state,
        }
        return f"https://slack.com/oauth/v2/authorize?{urlencode(params)}"

    async def complete_oauth(
        self,
        code: str,
        state: str,
        user: User,
    ) -> tuple[NotificationConnection, str]:
        """
        Validate state, exchange authorization code with Slack, and upsert connection.
        """
        if not settings.SLACK_CLIENT_ID or not settings.SLACK_CLIENT_SECRET:
            raise ValidationError(
                "Slack App credentials are not configured on the server."
            )

        # 1. Validate JWT state signature and expiration
        try:
            payload = jwt.decode(
                state,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"],
                options={"require": ["exp", "iat"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise ValidationError(
                "Slack authorization request has expired. Please try connecting again."
            ) from exc
        except jwt.PyJWTError as exc:
            raise ValidationError(
                "Invalid or tampered Slack authorization state token."
            ) from exc

        if payload.get("type") != "slack_oauth_state":
            raise ValidationError("Invalid authorization token type.")

        # 2. Verify state is bound to current user
        if payload.get("u") != str(user.id):
            raise ForbiddenError(
                "Slack authorization session belongs to a different authenticated user."
            )

        # 3. Single-use nonce validation via Redis GETDEL
        nonce = payload.get("nonce")
        if not nonce:
            raise ValidationError("Malformed authorization state token.")

        redis = get_redis()
        redis_key = f"slack_oauth_nonce:{nonce}"
        nonce_val = await redis.getdel(redis_key)
        if not nonce_val:
            raise ValidationError(
                "Authorization state has expired or has already been used."
            )

        workspace_id = UUID(payload["ws"])

        # 4. Enforce workspace RBAC permission
        from app.features.auth.services import AuthService

        auth_service = AuthService(self.session)
        has_perm = await auth_service.has_permission(
            workspace_id=workspace_id,
            user=user,
            required_permission="webhooks:manage",
        )
        if not has_perm:
            raise ForbiddenError(
                "You lack permission to manage integrations on this workspace."
            )

        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise NotFoundError("Target workspace not found.")

        # 5. Server-to-server code exchange with Slack (oauth.v2.access)
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                res = await client.post(
                    "https://slack.com/api/oauth.v2.access",
                    data={
                        "client_id": settings.SLACK_CLIENT_ID,
                        "client_secret": settings.SLACK_CLIENT_SECRET,
                        "code": code.strip(),
                        "redirect_uri": settings.SLACK_REDIRECT_URI,
                    },
                )
                data = res.json()
        except Exception as exc:
            logger.error("slack_oauth.exchange_http_failed", error=str(exc))
            raise ValidationError(
                "Failed to communicate with Slack OAuth service. Please try again."
            ) from exc

        if not data.get("ok"):
            err_code = data.get("error", "unknown_error")
            logger.warning("slack_oauth.exchange_rejected", error=err_code)
            raise ValidationError(
                f"Slack authorization was not approved: {err_code}"
            )

        # 6. Extract team and incoming webhook details
        team = data.get("team", {})
        team_id = team.get("id")
        team_name = team.get("name") or "Slack Workspace"

        incoming = data.get("incoming_webhook", {})
        webhook_url = incoming.get("url")
        channel_name = (incoming.get("channel") or "general").lstrip("#")
        channel_id = incoming.get("channel_id")
        config_url = incoming.get("configuration_url")

        if not webhook_url:
            raise ValidationError(
                "Slack did not grant an incoming webhook URL for this authorization."
            )

        # Validate URL format and SSRF defense
        provider = self.registry.get("slack_webhook")
        if provider:
            provider.validate_destination_url(webhook_url)

        # 7. Idempotent Upsert (Deduplicate on workspace + team_id + channel_id)
        provider_meta = {
            "app_id": data.get("app_id"),
            "team_id": team_id,
            "team_name": team_name,
            "channel_id": channel_id,
            "channel_name": f"#{channel_name}",
            "configuration_url": config_url,
        }

        existing_conn = None
        if team_id and channel_id:
            existing_conn = await self.connection_repo.find_by_slack_channel(
                workspace_id=workspace_id,
                team_id=team_id,
                channel_id=channel_id,
            )

        if existing_conn:
            existing_conn.name = channel_name
            existing_conn.destination_url = webhook_url
            existing_conn.connection_method = "oauth"
            existing_conn.is_active = True
            existing_conn.health_status = "healthy"
            existing_conn.consecutive_failures = 0
            existing_conn.failure_reason = None
            existing_conn.provider_metadata = provider_meta
            existing_conn.created_by_user_id = user.id
            conn = existing_conn
        else:
            conn = NotificationConnection(
                workspace_id=workspace_id,
                name=channel_name,
                provider_type="slack_webhook",
                connection_method="oauth",
                destination_url=webhook_url,
                is_active=True,
                health_status="healthy",
                consecutive_failures=0,
                provider_metadata=provider_meta,
                created_by_user_id=user.id,
            )
            await self.connection_repo.create(conn)

        await self.session.commit()
        await self.session.refresh(conn)

        logger.info(
            "slack_oauth.connection_established",
            workspace_id=str(workspace_id),
            connection_id=str(conn.id),
            channel=f"#{channel_name}",
            team=team_name,
        )

        # 8. Send instant automatic test verification card to the newly connected channel
        try:
            if provider:
                test_card = format_slack_test_card(ws.name, conn.name)
                await provider.dispatch(conn.destination_url, test_card)
        except Exception as exc:
            logger.warning("slack_oauth.auto_ping_failed", error=str(exc))

        return conn, ws.slug
