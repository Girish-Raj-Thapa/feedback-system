"""
FastAPI router for OAuth integrations callbacks (Slack, etc.).
Called by frontend callback bridge pages to complete server-to-server authorization.
"""

from fastapi import APIRouter, status

from app.features.auth.dependencies import CurrentUser
from app.features.notifications.dependencies import SlackOAuthServiceDep
from app.features.notifications.schemas import (
    NotificationConnectionRead,
    SlackOAuthCallbackRequest,
    SlackOAuthCallbackResponse,
)

router = APIRouter(
    prefix="/integrations",
    tags=["integrations-oauth"],
)


@router.post(
    "/slack/callback",
    status_code=status.HTTP_200_OK,
)
async def complete_slack_oauth(
    payload: SlackOAuthCallbackRequest,
    current_user: CurrentUser,
    oauth_service: SlackOAuthServiceDep,
) -> SlackOAuthCallbackResponse:
    """
    Complete Slack OAuth installation:
    Validates single-use signed state, exchanges code with Slack, and upserts connection.
    """
    conn, ws_slug = await oauth_service.complete_oauth(
        code=payload.code,
        state=payload.state,
        user=current_user,
    )
    return SlackOAuthCallbackResponse(
        success=True,
        workspace_slug=ws_slug,
        channel_name=conn.name,
        connection=NotificationConnectionRead.from_model(conn),
    )

