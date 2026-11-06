"""
FastAPI router for Workspace Notification Connections.
Manages Slack incoming webhooks and other outbound destinations.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.features.auth.dependencies import CurrentUser, require_permission
from app.features.notifications.dependencies import (
    ConnectionServiceDep,
    SlackOAuthServiceDep,
)
from app.features.notifications.schemas import (
    NotificationConnectionCreate,
    NotificationConnectionRead,
    NotificationConnectionTestRequest,
    NotificationConnectionTestResponse,
    NotificationConnectionUpdate,
    OutboundDeliveryRead,
    SlackOAuthAuthorizeResponse,
)

router = APIRouter(
    prefix="/workspaces/{workspace_id}/connections",
    tags=["notifications-connections"],
)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def list_connections(
    workspace_id: UUID,
    service: ConnectionServiceDep,
) -> list[NotificationConnectionRead]:
    """
    List all configured notification connections for this workspace.
    Webhook URLs are masked to protect secrets.
    """
    connections = await service.list_connections(workspace_id)
    return [NotificationConnectionRead.from_model(c) for c in connections]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def create_connection(
    workspace_id: UUID,
    payload: NotificationConnectionCreate,
    service: ConnectionServiceDep,
) -> NotificationConnectionRead:
    """
    Create a new notification destination (e.g. Slack Incoming Webhook).
    Validates URL format and enforces strict SSRF protections.
    """
    connection = await service.create_connection(workspace_id, payload)
    return NotificationConnectionRead.from_model(connection)


@router.get(
    "/slack/authorize",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def get_slack_authorize_url(
    workspace_id: UUID,
    current_user: CurrentUser,
    oauth_service: SlackOAuthServiceDep,
) -> SlackOAuthAuthorizeResponse:
    """
    Generate signed Slack OAuth authorization URL for 1-click channel install.
    """
    url = await oauth_service.generate_authorize_url(
        workspace_id=workspace_id,
        user_id=current_user.id,
    )
    return SlackOAuthAuthorizeResponse(authorize_url=url)


@router.get(
    "/{connection_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def get_connection(
    workspace_id: UUID,
    connection_id: UUID,
    service: ConnectionServiceDep,
) -> NotificationConnectionRead:
    """
    Get connection details with masked webhook URL and circuit-breaker status.
    """
    connection = await service.get_connection(workspace_id, connection_id)
    return NotificationConnectionRead.from_model(connection)


@router.patch(
    "/{connection_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def update_connection(
    workspace_id: UUID,
    connection_id: UUID,
    payload: NotificationConnectionUpdate,
    service: ConnectionServiceDep,
) -> NotificationConnectionRead:
    """
    Update a connection's name, active state, or webhook destination URL.
    Updating the URL automatically resets consecutive failure counters.
    """
    updated = await service.update_connection(workspace_id, connection_id, payload)
    return NotificationConnectionRead.from_model(updated)


@router.delete(
    "/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def delete_connection(
    workspace_id: UUID,
    connection_id: UUID,
    service: ConnectionServiceDep,
) -> None:
    """
    Soft-delete a notification connection and deactivate it.
    """
    await service.delete_connection(workspace_id, connection_id)


@router.post(
    "/{connection_id}/test",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def test_connection(
    workspace_id: UUID,
    connection_id: UUID,
    service: ConnectionServiceDep,
) -> NotificationConnectionTestResponse:
    """
    Send an instant verification test message to the configured Slack webhook.
    Returns immediate status to give operators visual confirmation.
    """
    result = await service.test_connection(workspace_id, connection_id)
    msg = (
        "Test notification sent successfully"
        if result.success
        else (result.error_message or "Failed to deliver test notification")
    )
    return NotificationConnectionTestResponse(
        success=result.success,
        status_code=result.status_code,
        message=msg,
    )


@router.post(
    "/test-raw",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def test_raw_destination(
    workspace_id: UUID,
    payload: NotificationConnectionTestRequest,
    service: ConnectionServiceDep,
) -> NotificationConnectionTestResponse:
    """
    Send a test notification to an arbitrary webhook URL before saving it to the database.
    """
    if not payload.destination_url:
        return NotificationConnectionTestResponse(
            success=False,
            status_code=400,
            message="destination_url is required for pre-save testing",
        )

    result = await service.test_raw_destination(
        workspace_id=workspace_id,
        provider_type=payload.provider_type,
        destination_url=payload.destination_url,
    )
    msg = (
        "Test notification sent successfully"
        if result.success
        else (result.error_message or "Failed to deliver test notification")
    )
    return NotificationConnectionTestResponse(
        success=result.success,
        status_code=result.status_code,
        message=msg,
    )


@router.get(
    "/{connection_id}/deliveries",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_permission("webhooks:manage"))],
)
async def list_connection_deliveries(
    workspace_id: UUID,
    connection_id: UUID,
    service: ConnectionServiceDep,
) -> list[OutboundDeliveryRead]:
    """
    List recent outbound webhook deliveries and execution attempts for debugging.
    """
    deliveries = await service.list_recent_deliveries(
        workspace_id, connection_id
    )
    return [OutboundDeliveryRead.model_validate(d) for d in deliveries]

