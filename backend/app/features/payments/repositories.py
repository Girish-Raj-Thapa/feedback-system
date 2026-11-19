"""
Repository layer for Payments & Paddle Subscriptions.
Isolates all SQL queries, webhook event deduplication, and atomic workspace plan sync.
"""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.models.forms import Form
from app.features.payments.models import PaymentWebhookEvent, WorkspaceSubscription


class PaymentRepository:
    """Data access operations for workspace billing state and Paddle webhook ledger."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_workspace_billing_snapshot(
        self, workspace_id: UUID
    ) -> tuple[
        str,
        int,
        int,
        datetime,
        int,
        WorkspaceSubscription | None,
    ] | None:
        """
        Fetch Workspace plan/submission counters, active form count, and WorkspaceSubscription
        in a single SQL round-trip.
        """
        forms_count_subq = (
            select(func.count(Form.id))
            .where(
                Form.workspace_id == workspace_id,
                Form.deleted_at.is_(None),
            )
            .scalar_subquery()
        )
        stmt = (
            select(
                Workspace.plan_tier,
                Workspace.monthly_submission_limit,
                Workspace.current_cycle_submissions_count,
                Workspace.cycle_reset_at,
                forms_count_subq,
                WorkspaceSubscription,
            )
            .outerjoin(
                WorkspaceSubscription,
                WorkspaceSubscription.workspace_id == Workspace.id,
            )
            .where(
                Workspace.id == workspace_id,
                Workspace.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if row is None:
            return None
        return (
            row[0],
            int(row[1]),
            int(row[2]),
            row[3],
            int(row[4]),
            row[5],
        )

    async def get_portal_credentials(
        self, workspace_id: UUID
    ) -> tuple[str | None, str | None, str | None] | None:
        """
        Fetch only (paddle_customer_id, paddle_subscription_id, plan_tier) for Portal session creation.
        """
        stmt = (
            select(
                WorkspaceSubscription.paddle_customer_id,
                WorkspaceSubscription.paddle_subscription_id,
                Workspace.plan_tier,
            )
            .join(Workspace, Workspace.id == WorkspaceSubscription.workspace_id)
            .where(
                WorkspaceSubscription.workspace_id == workspace_id,
                Workspace.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if row is None:
            return None
        return row[0], row[1], row[2]

    async def get_subscription_by_workspace(
        self, workspace_id: UUID
    ) -> WorkspaceSubscription | None:
        stmt = select(WorkspaceSubscription).where(
            WorkspaceSubscription.workspace_id == workspace_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_subscription_by_paddle_id(
        self, paddle_subscription_id: str
    ) -> WorkspaceSubscription | None:
        stmt = select(WorkspaceSubscription).where(
            WorkspaceSubscription.paddle_subscription_id == paddle_subscription_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def workspace_exists(self, workspace_id: UUID) -> bool:
        stmt = select(Workspace.id).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def record_webhook_event_if_new(
        self,
        event_id: str,
        event_type: str,
        occurred_at: datetime,
        workspace_id: UUID | None,
        summary: str | None = None,
    ) -> bool:
        """
        Atomically insert a Paddle webhook event ID.
        Returns True if inserted now, False if this event_id was already processed.
        """
        stmt = (
            pg_insert(PaymentWebhookEvent)
            .values(
                event_id=event_id,
                event_type=event_type,
                occurred_at=occurred_at,
                workspace_id=workspace_id,
                summary=summary,
            )
            .on_conflict_do_nothing(index_elements=["event_id"])
            .returning(PaymentWebhookEvent.event_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def upsert_subscription_and_sync_workspace(
        self,
        workspace_id: UUID,
        *,
        plan_tier: str,
        monthly_submission_limit: int,
        cycle_reset_at: datetime | None,
        status: str,
        billing_interval: str | None,
        paddle_customer_id: str | None,
        paddle_subscription_id: str | None,
        paddle_price_id: str | None,
        current_period_starts_at: datetime | None,
        current_period_ends_at: datetime | None,
        cancel_at_period_end: bool,
        occurred_at: datetime,
    ) -> WorkspaceSubscription:
        """
        Upsert WorkspaceSubscription and synchronize Workspace.plan_tier,
        monthly_submission_limit, and cycle_reset_at in a single DB transaction.
        """
        existing = await self.get_subscription_by_workspace(workspace_id)
        if existing is None:
            existing = WorkspaceSubscription(
                workspace_id=workspace_id,
                plan_tier=plan_tier,
                billing_interval=billing_interval,
                status=status,
                paddle_customer_id=paddle_customer_id,
                paddle_subscription_id=paddle_subscription_id,
                paddle_price_id=paddle_price_id,
                current_period_starts_at=current_period_starts_at,
                current_period_ends_at=current_period_ends_at,
                cancel_at_period_end=cancel_at_period_end,
                last_event_occurred_at=occurred_at,
            )
            self.session.add(existing)
        else:
            existing.plan_tier = plan_tier
            existing.billing_interval = billing_interval
            existing.status = status
            if paddle_customer_id is not None:
                existing.paddle_customer_id = paddle_customer_id
            if paddle_subscription_id is not None:
                existing.paddle_subscription_id = paddle_subscription_id
            if paddle_price_id is not None:
                existing.paddle_price_id = paddle_price_id
            existing.current_period_starts_at = current_period_starts_at
            existing.current_period_ends_at = current_period_ends_at
            existing.cancel_at_period_end = cancel_at_period_end
            existing.last_event_occurred_at = occurred_at

        ws_values: dict[str, Any] = {
            "plan_tier": plan_tier,
            "monthly_submission_limit": monthly_submission_limit,
        }
        if cycle_reset_at is not None:
            ws_values["cycle_reset_at"] = cycle_reset_at

        ws_stmt = (
            update(Workspace)
            .where(Workspace.id == workspace_id)
            .values(**ws_values)
        )
        await self.session.execute(ws_stmt)
        await self.session.flush()
        return existing
