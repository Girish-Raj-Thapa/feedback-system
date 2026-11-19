"""
Plan quota and rate-limit policy service for Outbound Notifications.
Enforces Free vs. Pro limits across connections, alert rules, monthly dispatches,
hourly burst thresholds, and test pings while delegating SQL queries to NotificationQuotaRepository.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationError
from app.core.logging import get_logger
from app.features.notifications.repositories.quotas import NotificationQuotaRepository

logger = get_logger("app.features.notifications.services.quota")

PlanTierLiteral = Literal["free", "pro"]

FREE_MONTHLY_SUBMISSION_LIMIT = 10
PRO_MONTHLY_SUBMISSION_LIMIT = 2500
FREE_MAX_FORMS = 2
PRO_MAX_FORMS = 25


def get_monthly_submission_limit(raw_tier: str | None) -> int:
    return (
        PRO_MONTHLY_SUBMISSION_LIMIT
        if resolve_plan_tier(raw_tier) == "pro"
        else FREE_MONTHLY_SUBMISSION_LIMIT
    )


def get_max_forms_limit(raw_tier: str | None) -> int:
    return PRO_MAX_FORMS if resolve_plan_tier(raw_tier) == "pro" else FREE_MAX_FORMS


@dataclass(frozen=True)
class PlanQuotaLimits:
    plan_tier: PlanTierLiteral
    max_connections: int
    max_alert_rules: int
    monthly_email_alerts: int
    monthly_webhook_alerts: int
    hourly_email_burst: int
    hourly_webhook_burst: int
    test_pings_per_10_min: int


PLAN_QUOTA_MATRIX: dict[PlanTierLiteral, PlanQuotaLimits] = {
    "free": PlanQuotaLimits(
        plan_tier="free",
        max_connections=1,
        max_alert_rules=1,
        monthly_email_alerts=0,
        monthly_webhook_alerts=0,
        hourly_email_burst=0,
        hourly_webhook_burst=0,
        test_pings_per_10_min=0,
    ),
    "pro": PlanQuotaLimits(
        plan_tier="pro",
        max_connections=15,
        max_alert_rules=25,
        monthly_email_alerts=1000,
        monthly_webhook_alerts=10000,
        hourly_email_burst=100,
        hourly_webhook_burst=500,
        test_pings_per_10_min=20,
    ),
}


def resolve_plan_tier(raw_tier: str | None) -> PlanTierLiteral:
    """
    Normalize workspace plan_tier to 'free' or 'pro'.
    Paid tiers ('pro', 'growth', 'starter') map to 'pro'; everything else is 'free'.
    """
    normalized = (raw_tier or "free").strip().lower()
    if normalized in ("pro", "growth", "starter"):
        return "pro"
    return "free"


def get_plan_quota_limits(raw_tier: str | None) -> PlanQuotaLimits:
    tier = resolve_plan_tier(raw_tier)
    return PLAN_QUOTA_MATRIX[tier]


def compute_cycle_start(
    cycle_reset_at: datetime | None,
    now: datetime | None = None,
) -> datetime:
    """
    Derive the active 30-day cycle start from Workspace.cycle_reset_at (next reset timestamp).
    """
    current = now or datetime.now(UTC)
    if cycle_reset_at is None:
        return current - timedelta(days=30)

    next_reset = (
        cycle_reset_at
        if cycle_reset_at.tzinfo is not None
        else cycle_reset_at.replace(tzinfo=UTC)
    )
    while next_reset <= current:
        next_reset += timedelta(days=30)

    return next_reset - timedelta(days=30)


@dataclass(frozen=True)
class WorkspaceNotificationQuotaStatus:
    plan_tier: PlanTierLiteral
    limits: PlanQuotaLimits
    connections_used: int
    alert_rules_used: int
    monthly_email_used: int
    monthly_webhook_used: int
    hourly_email_used: int
    hourly_webhook_used: int
    cycle_starts_at: datetime


class NotificationQuotaService:
    """
    Evaluates and enforces workspace notification quotas via NotificationQuotaRepository.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.quota_repo = NotificationQuotaRepository(session)

    async def get_quota_status(
        self, workspace_id: UUID
    ) -> WorkspaceNotificationQuotaStatus:
        """
        Fetch full quota limits and live cycle/hourly usage in two aggregated SQL queries.
        """
        now = datetime.now(UTC)
        one_hour_ago = now - timedelta(hours=1)

        (
            raw_tier,
            cycle_reset_at,
            connections_used,
            rules_used,
        ) = await self.quota_repo.get_workspace_plan_and_resource_counts(workspace_id)

        limits = get_plan_quota_limits(raw_tier)
        cycle_start = compute_cycle_start(cycle_reset_at, now=now)

        (
            monthly_email,
            monthly_webhook,
            hourly_email,
            hourly_webhook,
        ) = await self.quota_repo.get_delivery_usage_counts(
            workspace_id,
            cycle_start=cycle_start,
            one_hour_ago=one_hour_ago,
        )

        return WorkspaceNotificationQuotaStatus(
            plan_tier=limits.plan_tier,
            limits=limits,
            connections_used=connections_used,
            alert_rules_used=rules_used,
            monthly_email_used=monthly_email,
            monthly_webhook_used=monthly_webhook,
            hourly_email_used=hourly_email,
            hourly_webhook_used=hourly_webhook,
            cycle_starts_at=cycle_start,
        )

    async def enforce_connection_creation_quota(
        self, workspace_id: UUID
    ) -> None:
        raw_tier, connections_used = (
            await self.quota_repo.get_workspace_plan_and_connection_count(workspace_id)
        )
        limits = get_plan_quota_limits(raw_tier)
        if connections_used >= limits.max_connections:
            plan_label = limits.plan_tier.capitalize()
            raise ValidationError(
                f"{plan_label} plan limit reached ({limits.max_connections} notification connections). "
                "Upgrade to Pro to connect more channels."
            )

    async def enforce_alert_rule_creation_quota(
        self, workspace_id: UUID
    ) -> None:
        raw_tier, rules_used = (
            await self.quota_repo.get_workspace_plan_and_alert_rule_count(workspace_id)
        )
        limits = get_plan_quota_limits(raw_tier)
        if rules_used >= limits.max_alert_rules:
            plan_label = limits.plan_tier.capitalize()
            raise ValidationError(
                f"{plan_label} plan limit reached ({limits.max_alert_rules} alert rules). "
                "Upgrade to Pro to create more routing rules."
            )

    async def enforce_test_ping_rate_limit(self, workspace_id: UUID) -> None:
        """
        Rate-limit test pings per workspace over a 10-minute window in Redis.
        """
        from app.core.config import settings
        from app.core.redis import get_redis

        raw_tier = await self.quota_repo.get_workspace_plan_tier(workspace_id)
        limits = get_plan_quota_limits(raw_tier)
        if limits.test_pings_per_10_min <= 0:
            raise ValidationError(
                "Email and webhook notifications are disabled on the Free plan. Upgrade to Pro to send test pings and live alerts."
            )
        try:
            redis = get_redis()
            key = f"notifications:test_rate:{workspace_id}"
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, 600)
            if count > limits.test_pings_per_10_min:
                plan_label = limits.plan_tier.capitalize()
                raise ValidationError(
                    f"Test rate limit reached ({limits.test_pings_per_10_min} tests per 10 minutes on {plan_label} plan). "
                    "Please wait before sending another test."
                )
        except ValidationError:
            raise
        except Exception as exc:
            logger.warning(
                "notifications.test_rate_limit.redis_unavailable",
                workspace_id=str(workspace_id),
                error=str(exc),
            )
            if settings.is_production:
                raise ValidationError(
                    "Rate limiting service is temporarily unavailable. Please retry shortly."
                ) from exc

    @staticmethod
    def check_dispatch_budget(
        status: WorkspaceNotificationQuotaStatus,
        provider_type: str,
    ) -> tuple[bool, str | None]:
        """
        Check dispatch eligibility against an already-fetched WorkspaceNotificationQuotaStatus
        without issuing extra SQL queries.
        """
        limits = status.limits
        plan_label = limits.plan_tier.capitalize()
        if provider_type == "email_alert":
            if status.monthly_email_used >= limits.monthly_email_alerts:
                return (
                    False,
                    f"{plan_label} plan monthly email alert limit ({limits.monthly_email_alerts}) reached. Upgrade to Pro.",
                )
            if status.hourly_email_used >= limits.hourly_email_burst:
                return (
                    False,
                    f"Hourly email alert rate limit ({limits.hourly_email_burst}/hr) reached.",
                )
        else:
            if status.monthly_webhook_used >= limits.monthly_webhook_alerts:
                return (
                    False,
                    f"{plan_label} plan monthly webhook alert limit ({limits.monthly_webhook_alerts}) reached. Upgrade to Pro.",
                )
            if status.hourly_webhook_used >= limits.hourly_webhook_burst:
                return (
                    False,
                    f"Hourly webhook alert rate limit ({limits.hourly_webhook_burst}/hr) reached.",
                )
        return True, None

    async def can_dispatch_alert(
        self,
        workspace_id: UUID,
        provider_type: str,
    ) -> tuple[bool, str | None]:
        """
        Check whether a workspace has remaining monthly and hourly burst quota for a provider.
        """
        status = await self.get_quota_status(workspace_id)
        return self.check_dispatch_budget(status, provider_type)
