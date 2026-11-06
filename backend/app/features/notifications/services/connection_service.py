"""
Service layer for Notification Connections.
Handles validation, connection lifecycle management, testing webhook endpoints, and delivery history.
"""

from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.models.deliveries import OutboundDelivery
from app.features.notifications.providers.base import ProviderResult
from app.features.notifications.providers.registry import provider_registry
from app.features.notifications.repositories.connections import (
    NotificationConnectionRepository,
)
from app.features.notifications.repositories.deliveries import (
    OutboundDeliveryRepository,
)
from app.features.notifications.schemas import (
    NotificationConnectionCreate,
    NotificationConnectionUpdate,
)

logger = get_logger("app.features.notifications.services.connections")


def format_slack_test_card(
    workspace_slug: str, connection_name: str
) -> dict[str, Any]:
    """
    Standard Slack Block Kit test card sent during connection verification.
    """
    return {
        "text": f"🔔 FeedbackFlow Test: {connection_name} is connected successfully!",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🔔 Slack Webhook Connected",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"Success! Your incoming webhook *{connection_name}* is verified and operational.\n"
                        f"Real-time feedback alerts matching your alert rules will appear here."
                    ),
                },
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Workspace:*\n`{workspace_slug}`",
                    },
                    {"type": "mrkdwn", "text": "*Status:*\nActive & Healthy ✅"},
                ],
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "FeedbackFlow • Voice of Customer Outbound Alerts",
                    }
                ],
            },
        ],
    }


class NotificationConnectionService:
    """
    Service managing integration connections (Slack webhooks, Discord, etc.)
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.connection_repo = NotificationConnectionRepository(session)
        self.delivery_repo = OutboundDeliveryRepository(session)
        self.registry = provider_registry

    async def list_connections(
        self,
        workspace_id: UUID,
        is_active: bool | None = None,
    ) -> Sequence[NotificationConnection]:
        """List connections for a workspace."""
        return await self.connection_repo.list_by_workspace(
            workspace_id, is_active=is_active
        )

    async def get_connection(
        self,
        workspace_id: UUID,
        connection_id: UUID,
    ) -> NotificationConnection:
        """Fetch connection by ID scoped to workspace."""
        conn = await self.connection_repo.get_by_id(workspace_id, connection_id)
        if not conn:
            raise NotFoundError("Notification connection not found")
        return conn

    async def create_connection(
        self,
        workspace_id: UUID,
        payload: NotificationConnectionCreate,
    ) -> NotificationConnection:
        """
        Create a new notification destination connection.
        Performs SSRF and URL format validation before saving.
        """
        provider = self.registry.get(payload.provider_type)
        if not provider:
            raise ValidationError(
                f"Unsupported provider type '{payload.provider_type}'"
            )

        try:
            provider.validate_destination_url(payload.destination_url)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        connection = NotificationConnection(
            workspace_id=workspace_id,
            name=payload.name.strip(),
            provider_type=payload.provider_type,
            destination_url=payload.destination_url.strip(),
            is_active=True,
            health_status="healthy",
            consecutive_failures=0,
        )

        created = await self.connection_repo.create(connection)
        await self.session.commit()
        await self.session.refresh(created)

        logger.info(
            "notification.connection.created",
            workspace_id=str(workspace_id),
            connection_id=str(created.id),
            name=created.name,
            provider_type=created.provider_type,
        )
        return created

    async def update_connection(
        self,
        workspace_id: UUID,
        connection_id: UUID,
        payload: NotificationConnectionUpdate,
    ) -> NotificationConnection:
        """
        Update connection configuration (name, destination URL, or active status).
        If URL is changed, resets health status and circuit-breaker failure counts.
        """
        conn = await self.get_connection(workspace_id, connection_id)

        if payload.destination_url is not None:
            provider = self.registry.get(conn.provider_type)
            if not provider:
                raise ValidationError(
                    f"Unsupported provider type '{conn.provider_type}'"
                )
            try:
                provider.validate_destination_url(payload.destination_url)
            except ValueError as exc:
                raise ValidationError(str(exc)) from exc

            conn.destination_url = payload.destination_url.strip()
            conn.health_status = "healthy"
            conn.failure_reason = None
            conn.consecutive_failures = 0

        if payload.name is not None:
            conn.name = payload.name.strip()

        if payload.is_active is not None:
            conn.is_active = payload.is_active

        await self.session.commit()
        await self.session.refresh(conn)

        logger.info(
            "notification.connection.updated",
            workspace_id=str(workspace_id),
            connection_id=str(conn.id),
            is_active=conn.is_active,
        )
        return conn

    async def delete_connection(
        self,
        workspace_id: UUID,
        connection_id: UUID,
    ) -> None:
        """
        Soft-delete a connection and deactivate it.
        """
        conn = await self.get_connection(workspace_id, connection_id)
        await self.connection_repo.soft_delete(conn)
        await self.session.commit()

        logger.info(
            "notification.connection.deleted",
            workspace_id=str(workspace_id),
            connection_id=str(connection_id),
        )

    async def test_connection(
        self,
        workspace_id: UUID,
        connection_id: UUID,
    ) -> ProviderResult:
        """
        Send an instant test notification to an existing connection.
        Synchronous HTTP dispatch with short timeout; returns result immediately to UI.
        """
        conn = await self.get_connection(workspace_id, connection_id)
        provider = self.registry.get(conn.provider_type)
        if not provider:
            raise ValidationError(
                f"Unsupported provider type '{conn.provider_type}'"
            )

        from app.features.auth.models import Workspace

        ws = await self.session.get(Workspace, workspace_id)
        workspace_display = ws.name if ws else str(workspace_id)

        test_payload = format_slack_test_card(workspace_display, conn.name)
        result = await provider.dispatch(
            conn.destination_url, test_payload, conn.secret_token
        )

        if result.success:
            await self.connection_repo.record_success(conn.id)
            await self.session.commit()
        else:
            await self.connection_repo.record_failure(
                conn.id,
                reason=result.error_message or "Test dispatch failed",
                is_permanent=not result.is_transient,
            )
            await self.session.commit()

        return result

    async def test_raw_destination(
        self,
        workspace_id: UUID,
        provider_type: str,
        destination_url: str,
    ) -> ProviderResult:
        """
        Send a test notification to an arbitrary webhook destination before saving it.
        """
        provider = self.registry.get(provider_type)
        if not provider:
            raise ValidationError(f"Unsupported provider type '{provider_type}'")

        try:
            provider.validate_destination_url(destination_url)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        from app.features.auth.models import Workspace

        ws = await self.session.get(Workspace, workspace_id)
        workspace_display = ws.name if ws else str(workspace_id)

        test_payload = format_slack_test_card(
            workspace_display, "Unsaved Slack Webhook"
        )
        return await provider.dispatch(destination_url, test_payload)

    async def list_recent_deliveries(
        self,
        workspace_id: UUID,
        connection_id: UUID,
        limit: int = 20,
    ) -> Sequence[OutboundDelivery]:
        """
        Fetch recent outbound deliveries and attempts for this connection.
        """
        # Ensure connection belongs to workspace
        await self.get_connection(workspace_id, connection_id)
        return await self.delivery_repo.list_by_connection(
            connection_id, limit=limit
        )
