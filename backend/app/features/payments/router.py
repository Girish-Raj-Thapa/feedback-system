"""
FastAPI routers for Workspace Billing management and Paddle Billing v2 webhooks.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, status

from app.core.dependencies import DBSession
from app.features.auth.dependencies import CurrentUser, require_permission
from app.features.payments.schemas import (
    BillingOverviewRead,
    PortalSessionRead,
    WebhookAckResponse,
)
from app.features.payments.services import PaymentService

workspace_billing_router = APIRouter(
    prefix="/workspaces/{workspace_id}/billing",
    tags=["payments-billing"],
)

paddle_webhook_router = APIRouter(
    prefix="/payments/webhooks",
    tags=["payments-webhooks"],
)


@workspace_billing_router.get(
    "",
    response_model=BillingOverviewRead,
    dependencies=[Depends(require_permission("billing:manage"))],
)
async def get_workspace_billing(
    workspace_id: UUID,
    _current_user: CurrentUser,
    session: DBSession,
) -> BillingOverviewRead:
    """Get workspace subscription status, plan limits, usage, and Paddle checkout config."""
    service = PaymentService(session)
    return await service.get_billing_overview(workspace_id)


@workspace_billing_router.post(
    "/portal",
    response_model=PortalSessionRead,
    dependencies=[Depends(require_permission("billing:manage"))],
)
async def create_billing_portal_session(
    workspace_id: UUID,
    _current_user: CurrentUser,
    session: DBSession,
) -> PortalSessionRead:
    """Generate a temporary Paddle Customer Portal URL for managing billing and cancellation."""
    service = PaymentService(session)
    return await service.create_portal_session(workspace_id)


@paddle_webhook_router.post(
    "/paddle",
    response_model=WebhookAckResponse,
    status_code=status.HTTP_200_OK,
)
async def receive_paddle_webhook(
    request: Request,
    session: DBSession,
    paddle_signature: str = Header(default="", alias="Paddle-Signature"),
) -> WebhookAckResponse:
    """Receive and process signed Paddle Billing v2 subscription lifecycle webhooks."""
    raw_body = await request.body()
    service = PaymentService(session)
    return await service.process_paddle_webhook(
        raw_body=raw_body,
        signature_header=paddle_signature,
    )
