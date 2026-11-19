"""
Service layer for Paddle Billing v2 subscriptions, portal links, and webhook synchronization.
"""

import json
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.features.notifications.services.quota_service import (
    get_max_forms_limit,
    get_monthly_submission_limit,
    resolve_plan_tier,
)
from app.features.payments.paddle_client import (
    PaddleClient,
    PaddleClientError,
    PaddleWebhookSignatureError,
)
from app.features.payments.repositories import PaymentRepository
from app.features.payments.schemas import (
    BillingOverviewRead,
    CheckoutConfigRead,
    PortalSessionRead,
    WebhookAckResponse,
)

logger = get_logger("app.features.payments.services")

SUBSCRIPTION_LIFECYCLE_EVENTS = {
    "subscription.created",
    "subscription.activated",
    "subscription.updated",
    "subscription.past_due",
    "subscription.paused",
    "subscription.canceled",
}

PORTAL_RATE_LIMIT_MAX = 5
PORTAL_RATE_LIMIT_WINDOW_SECONDS = 60


def _parse_iso_datetime(raw: Any) -> datetime | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    normalized = raw.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _extract_billing_interval_and_price(
    data: dict[str, Any],
) -> tuple[Literal["month", "year"] | None, str | None]:
    items = data.get("items")
    if not isinstance(items, list) or not items:
        return None, None
    raw_first = items[0]
    first_item: dict[str, Any] = raw_first if isinstance(raw_first, dict) else {}
    raw_price = first_item.get("price")
    price: dict[str, Any] = raw_price if isinstance(raw_price, dict) else {}
    raw_price_id = price.get("id")
    price_id = raw_price_id if isinstance(raw_price_id, str) else None

    cycle = price.get("billing_cycle")
    raw_interval = cycle.get("interval") if isinstance(cycle, dict) else None
    if raw_interval == "month":
        return "month", price_id
    if raw_interval == "year":
        return "year", price_id

    if price_id and price_id == settings.PADDLE_PRO_ANNUAL_PRICE_ID:
        return "year", price_id
    if price_id and price_id == settings.PADDLE_PRO_MONTHLY_PRICE_ID:
        return "month", price_id
    return None, price_id


def _map_status_to_plan_tier(
    event_type: str, subscription_status: str
) -> tuple[Literal["free", "pro"], str]:
    normalized = (subscription_status or "").strip().lower()
    if event_type == "subscription.canceled" or normalized in ("canceled", "paused"):
        final_status = "paused" if normalized == "paused" else "canceled"
        return "free", final_status

    if event_type == "subscription.past_due" or normalized == "past_due":
        return "pro", "past_due"

    if normalized == "trialing":
        return "pro", "trialing"

    return "pro", "active"


class PaymentService:
    """Orchestrates workspace billing queries, Customer Portal generation, and Paddle webhooks."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = PaymentRepository(session)
        self.paddle_client = PaddleClient(
            api_key=settings.PADDLE_API_KEY,
            environment=settings.PADDLE_ENVIRONMENT,
        )

    @staticmethod
    def _build_checkout_config() -> CheckoutConfigRead:
        token = settings.PADDLE_CLIENT_TOKEN.strip()
        monthly = settings.PADDLE_PRO_MONTHLY_PRICE_ID.strip()
        annual = settings.PADDLE_PRO_ANNUAL_PRICE_ID.strip()
        return CheckoutConfigRead(
            environment=settings.PADDLE_ENVIRONMENT,
            client_token=token,
            monthly_price_id=monthly,
            annual_price_id=annual,
            is_configured=bool(token and (monthly or annual)),
        )

    async def get_billing_overview(self, workspace_id: UUID) -> BillingOverviewRead:
        """Return active workspace plan, subscription telemetry, usage vs. limits, and checkout config."""
        snapshot = await self.repo.get_workspace_billing_snapshot(workspace_id)
        if snapshot is None:
            raise NotFoundError("Workspace not found")

        (
            raw_tier,
            submission_limit,
            submissions_used,
            cycle_reset_at,
            forms_used,
            sub,
        ) = snapshot

        plan_tier = resolve_plan_tier(raw_tier)
        sub_status = sub.status if sub is not None else "active"
        raw_interval = sub.billing_interval if sub is not None else None
        billing_interval: Literal["month", "year"] | None = (
            raw_interval if raw_interval in ("month", "year") else None
        )

        return BillingOverviewRead(
            workspace_id=workspace_id,
            plan_tier=plan_tier,
            subscription_status=sub_status,
            billing_interval=billing_interval,
            current_period_starts_at=(
                sub.current_period_starts_at if sub is not None else None
            ),
            current_period_ends_at=(
                sub.current_period_ends_at if sub is not None else None
            ),
            cancel_at_period_end=(
                sub.cancel_at_period_end if sub is not None else False
            ),
            has_portal_access=bool(sub is not None and sub.paddle_customer_id),
            forms_used=forms_used,
            forms_limit=get_max_forms_limit(plan_tier),
            submissions_used=submissions_used,
            submissions_limit=submission_limit,
            cycle_reset_at=cycle_reset_at,
            checkout=self._build_checkout_config(),
        )

    async def _enforce_portal_rate_limit(self, workspace_id: UUID) -> None:
        try:
            redis = get_redis()
            key = f"payments:portal_rate:{workspace_id}"
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, PORTAL_RATE_LIMIT_WINDOW_SECONDS)
            if count > PORTAL_RATE_LIMIT_MAX:
                raise ValidationError(
                    "Too many Customer Portal requests. Please wait a minute and try again."
                )
        except ValidationError:
            raise
        except Exception as exc:
            logger.warning(
                "payments.portal_rate_limit.redis_unavailable",
                workspace_id=str(workspace_id),
                error=str(exc),
            )
            if settings.is_production:
                raise ValidationError(
                    "Rate limiting service is temporarily unavailable. Please retry shortly."
                ) from exc

    async def create_portal_session(self, workspace_id: UUID) -> PortalSessionRead:
        """Create a Paddle Customer Portal session for a workspace with an existing Paddle customer."""
        await self._enforce_portal_rate_limit(workspace_id)

        creds = await self.repo.get_portal_credentials(workspace_id)
        if creds is None:
            raise ValidationError(
                "No Paddle subscription found for this workspace yet."
            )

        customer_id, subscription_id, raw_tier = creds
        if not customer_id:
            raise ValidationError(
                "Workspace does not have an active Paddle customer record."
            )
        if resolve_plan_tier(raw_tier) != "pro":
            raise ValidationError(
                "Billing management portal is available once subscribed to Pro."
            )

        try:
            portal_url = await self.paddle_client.create_customer_portal_url(
                customer_id=customer_id,
                subscription_id=subscription_id,
            )
        except PaddleClientError as exc:
            logger.error(
                "payments.portal_session_failed",
                workspace_id=str(workspace_id),
                error=str(exc),
            )
            raise ValidationError(
                "Unable to open Paddle Customer Portal right now. Please try again shortly."
            ) from exc

        return PortalSessionRead(url=portal_url)

    async def process_paddle_webhook(
        self,
        raw_body: bytes,
        signature_header: str,
    ) -> WebhookAckResponse:
        """
        Verify Paddle HMAC signature, deduplicate by event_id, enforce event ordering,
        and atomically sync WorkspaceSubscription + Workspace quotas.
        """
        try:
            PaddleClient.verify_webhook_signature(
                raw_body=raw_body,
                signature_header=signature_header,
                webhook_secret=settings.PADDLE_WEBHOOK_SECRET,
            )
        except PaddleWebhookSignatureError as exc:
            logger.warning("payments.webhook.invalid_signature", error=str(exc))
            raise ValidationError(str(exc)) from exc

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValidationError("Invalid JSON webhook payload.") from exc

        if not isinstance(payload, dict):
            raise ValidationError("Malformed webhook payload.")

        event_id = str(payload.get("event_id") or "").strip()
        event_type = str(payload.get("event_type") or "").strip()
        occurred_at = _parse_iso_datetime(payload.get("occurred_at")) or datetime.now(
            UTC
        )
        data = payload.get("data")

        if not event_id or not event_type or not isinstance(data, dict):
            raise ValidationError("Webhook payload missing required event metadata.")

        if event_type not in SUBSCRIPTION_LIFECYCLE_EVENTS:
            logger.info(
                "payments.webhook.ignored_event_type",
                event_id=event_id,
                event_type=event_type,
            )
            return WebhookAckResponse(
                received=True, event_id=event_id, status="ignored"
            )

        paddle_subscription_id = (
            data.get("id") if isinstance(data.get("id"), str) else None
        )
        raw_custom_data = data.get("custom_data")
        custom_data: dict[str, Any] = (
            raw_custom_data if isinstance(raw_custom_data, dict) else {}
        )
        raw_ws_id = custom_data.get("workspace_id")

        workspace_id: UUID | None = None
        existing_sub = None
        if isinstance(raw_ws_id, str) and raw_ws_id.strip():
            try:
                workspace_id = UUID(raw_ws_id.strip())
            except ValueError as exc:
                raise ValidationError(
                    "Invalid workspace_id in Paddle custom_data."
                ) from exc
        elif paddle_subscription_id:
            existing_sub = await self.repo.get_subscription_by_paddle_id(
                paddle_subscription_id
            )
            if existing_sub is not None:
                workspace_id = existing_sub.workspace_id

        if workspace_id is None:
            raise ValidationError(
                "Missing workspace_id in Paddle subscription custom_data."
            )

        if not await self.repo.workspace_exists(workspace_id):
            logger.warning(
                "payments.webhook.workspace_not_found",
                event_id=event_id,
                workspace_id=str(workspace_id),
            )
            return WebhookAckResponse(
                received=True, event_id=event_id, status="workspace_missing"
            )

        is_new = await self.repo.record_webhook_event_if_new(
            event_id=event_id,
            event_type=event_type,
            occurred_at=occurred_at,
            workspace_id=workspace_id,
            summary=f"{event_type}:{data.get('status')}",
        )
        if not is_new:
            logger.info("payments.webhook.duplicate_ignored", event_id=event_id)
            return WebhookAckResponse(
                received=True, event_id=event_id, status="duplicate"
            )

        if existing_sub is None:
            existing_sub = await self.repo.get_subscription_by_workspace(workspace_id)

        if (
            existing_sub is not None
            and existing_sub.last_event_occurred_at is not None
            and occurred_at < existing_sub.last_event_occurred_at
        ):
            await self.session.commit()
            logger.info(
                "payments.webhook.stale_event_skipped",
                event_id=event_id,
                workspace_id=str(workspace_id),
            )
            return WebhookAckResponse(received=True, event_id=event_id, status="stale")

        plan_tier, mapped_status = _map_status_to_plan_tier(
            event_type, str(data.get("status") or "")
        )
        billing_interval, price_id = _extract_billing_interval_and_price(data)
        raw_period = data.get("current_billing_period")
        billing_period: dict[str, Any] = (
            raw_period if isinstance(raw_period, dict) else {}
        )
        period_start = _parse_iso_datetime(billing_period.get("starts_at"))
        period_end = _parse_iso_datetime(billing_period.get("ends_at"))
        scheduled_change = (
            data.get("scheduled_change")
            if isinstance(data.get("scheduled_change"), dict)
            else None
        )
        cancel_at_period_end = bool(
            scheduled_change and scheduled_change.get("action") == "cancel"
        )
        paddle_customer_id = (
            data.get("customer_id")
            if isinstance(data.get("customer_id"), str)
            else None
        )

        await self.repo.upsert_subscription_and_sync_workspace(
            workspace_id=workspace_id,
            plan_tier=plan_tier,
            monthly_submission_limit=get_monthly_submission_limit(plan_tier),
            cycle_reset_at=period_end if plan_tier == "pro" else None,
            status=mapped_status,
            billing_interval=(
                billing_interval
                or (existing_sub.billing_interval if existing_sub else None)
            ),
            paddle_customer_id=paddle_customer_id,
            paddle_subscription_id=paddle_subscription_id,
            paddle_price_id=price_id,
            current_period_starts_at=period_start,
            current_period_ends_at=period_end,
            cancel_at_period_end=(
                False if mapped_status == "canceled" else cancel_at_period_end
            ),
            occurred_at=occurred_at,
        )
        await self.session.commit()

        logger.info(
            "payments.webhook.synced",
            event_id=event_id,
            event_type=event_type,
            workspace_id=str(workspace_id),
            plan_tier=plan_tier,
            status=mapped_status,
        )
        return WebhookAckResponse(received=True, event_id=event_id, status="processed")
