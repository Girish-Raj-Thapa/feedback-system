"""
Service layer for Automated Monday Morning VoC Digest.
Computes deterministic 7-day VoC score drivers vs. prior week, builds weekly digest reports
in each workspace's local timezone, and emails workspace owners cleanly.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import quote
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import render_email_template, send_email
from app.core.logging import get_logger
from app.features.auth.repositories import AuthRepository
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.submissions import SubmissionRepository
from app.features.feedback.schemas.insights import ScoreDriverItem
from app.features.feedback.services.insights import _normalize_rating

logger = get_logger("app.features.feedback.services.weekly_digest")


@dataclass(frozen=True)
class DigestSubmissionRow:
    id: UUID
    rating: int | None
    rating_scale_type: str
    sentiment: str | None
    category_id: UUID | None
    comment: str | None
    customer_name: str | None
    status: str
    created_at: datetime


@dataclass(frozen=True)
class DigestQuoteItem:
    submission_id: UUID
    comment: str
    score_text: str
    category_name: str
    customer_display: str
    triage_url: str


@dataclass(frozen=True)
class WeeklyDigestReport:
    workspace_id: UUID
    workspace_name: str
    workspace_slug: str
    recipient_email: str
    timezone_name: str
    period_label: str
    total_responses: int
    volume_delta: int
    average_rating: float | None
    rating_delta: float | None
    at_risk_count: int
    positive_count: int
    neutral_count: int
    negative_count: int
    top_negative_driver: ScoreDriverItem | None
    top_positive_driver: ScoreDriverItem | None
    highlighted_quotes: list[DigestQuoteItem]


def _resolve_timezone(tz_name: str | None) -> tuple[ZoneInfo, str]:
    cleaned = (tz_name or "UTC").strip() or "UTC"
    try:
        return ZoneInfo(cleaned), cleaned
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC"), "UTC"


def _local_monday_midnight(now_utc: datetime, tz: ZoneInfo) -> datetime:
    current = now_utc if now_utc.tzinfo is not None else now_utc.replace(tzinfo=UTC)
    local_now = current.astimezone(tz)
    return local_now.replace(hour=0, minute=0, second=0, microsecond=0)


def is_local_monday_morning(
    ws_timezone: str | None,
    last_sent_at: datetime | None,
    now_utc: datetime,
) -> bool:
    """
    Return True when it is Monday between 08:00 and 08:59 in the workspace's local timezone
    and no digest has been sent since local Monday midnight.
    """
    tz, _ = _resolve_timezone(ws_timezone)
    current = now_utc if now_utc.tzinfo is not None else now_utc.replace(tzinfo=UTC)
    local_now = current.astimezone(tz)

    if local_now.weekday() != 0 or local_now.hour != 8:
        return False

    local_monday = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    if last_sent_at is not None:
        sent_utc = (
            last_sent_at
            if last_sent_at.tzinfo is not None
            else last_sent_at.replace(tzinfo=UTC)
        )
        if sent_utc.astimezone(tz) >= local_monday:
            return False

    return True


def compute_digest_window(
    ws_timezone: str | None, now_utc: datetime
) -> tuple[datetime, datetime, datetime, str]:
    """
    Compute the completed 7-day local Monday–Sunday window and prior 7-day window in UTC.
    Returns (prior_start_utc, current_start_utc, current_end_utc, period_label).
    """
    tz, _ = _resolve_timezone(ws_timezone)
    local_monday = _local_monday_midnight(now_utc, tz)
    current_start_local = local_monday - timedelta(days=7)
    prior_start_local = local_monday - timedelta(days=14)
    sunday_local = local_monday - timedelta(days=1)

    period_label = (
        f"{current_start_local.strftime('%b %d')} – {sunday_local.strftime('%b %d, %Y')}"
    )
    return (
        prior_start_local.astimezone(UTC),
        current_start_local.astimezone(UTC),
        local_monday.astimezone(UTC),
        period_label,
    )


def _format_score_text(rating: int | None, scale_type: str) -> str:
    if rating is None:
        return "Unrated"
    if scale_type == "1_10_numeric":
        return f"{rating}/10"
    return f"{rating}/5 ★"


def _is_at_risk(row: DigestSubmissionRow) -> bool:
    if row.status not in ("new", "in_progress"):
        return False
    if row.sentiment == "negative":
        return True
    if row.rating is None:
        return False
    if row.rating_scale_type == "1_10_numeric":
        return row.rating <= 4
    return row.rating <= 2


def _compute_avg_rating(rows: list[DigestSubmissionRow]) -> float | None:
    ratings = [
        _normalize_rating(r.rating, r.rating_scale_type)
        for r in rows
        if r.rating is not None
    ]
    if not ratings:
        return None
    return round(sum(ratings) / len(ratings), 2)


def _compute_score_drivers(
    rows: list[DigestSubmissionRow],
    overall_avg: float | None,
    category_names: dict[UUID, str],
) -> tuple[ScoreDriverItem | None, ScoreDriverItem | None]:
    if overall_avg is None:
        return None, None

    grouped: dict[UUID | None, list[float]] = {}
    for row in rows:
        if row.rating is None:
            continue
        grouped.setdefault(row.category_id, []).append(
            _normalize_rating(row.rating, row.rating_scale_type)
        )

    neg_candidates: list[ScoreDriverItem] = []
    pos_candidates: list[ScoreDriverItem] = []

    for cat_id, scores in grouped.items():
        avg = round(sum(scores) / len(scores), 2)
        impact = round(avg - overall_avg, 2)
        item = ScoreDriverItem(
            category_id=cat_id,
            category_name=(
                category_names.get(cat_id, "Uncategorized")
                if cat_id is not None
                else "Uncategorized"
            ),
            average_rating=avg,
            score_impact=impact,
            count=len(scores),
        )
        if impact < 0:
            neg_candidates.append(item)
        elif impact > 0:
            pos_candidates.append(item)

    neg_candidates.sort(key=lambda d: (d.score_impact, -d.count))
    pos_candidates.sort(key=lambda d: (-d.score_impact, -d.count))

    return (
        neg_candidates[0] if neg_candidates else None,
        pos_candidates[0] if pos_candidates else None,
    )


class WeeklyDigestService:
    """
    Aggregates and sends Weekly Monday Morning VoC Digest emails for Pro workspaces.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.auth_repo = AuthRepository(session)
        self.submission_repo = SubmissionRepository(session)
        self.category_repo = FeedbackCategoryRepository(session)

    async def build_workspace_digest(
        self,
        workspace_id: UUID,
        workspace_name: str,
        workspace_slug: str,
        ws_timezone: str,
        recipient_email: str,
        now_utc: datetime,
    ) -> WeeklyDigestReport | None:
        """
        Compute the 7-day Monday digest vs. prior 7 days in one submission SQL query.
        Returns None when the workspace received 0 real submissions during the week.
        """
        prior_start, current_start, current_end, period_label = compute_digest_window(
            ws_timezone, now_utc
        )
        raw_rows = await self.submission_repo.list_for_weekly_digest(
            workspace_id=workspace_id,
            window_start=prior_start,
            window_end=current_end,
        )

        rows = [
            DigestSubmissionRow(
                id=r[0],
                rating=r[1],
                rating_scale_type=r[2],
                sentiment=r[3],
                category_id=r[4],
                comment=r[5],
                customer_name=r[6],
                status=r[7],
                created_at=(
                    r[8] if r[8].tzinfo is not None else r[8].replace(tzinfo=UTC)
                ),
            )
            for r in raw_rows
        ]

        current_rows = [r for r in rows if r.created_at >= current_start]
        if not current_rows:
            return None

        prior_rows = [r for r in rows if r.created_at < current_start]
        category_names = await self.category_repo.list_id_name_map(workspace_id)

        current_avg = _compute_avg_rating(current_rows)
        prior_avg = _compute_avg_rating(prior_rows)
        rating_delta = (
            round(current_avg - prior_avg, 2)
            if current_avg is not None and prior_avg is not None
            else None
        )

        top_neg, top_pos = _compute_score_drivers(
            current_rows, current_avg, category_names
        )

        commented = [
            r for r in current_rows if r.comment is not None and r.comment.strip()
        ]
        # Surface lowest-rated feedback first (or unrated last), breaking ties by newest
        commented.sort(
            key=lambda r: (
                _normalize_rating(r.rating, r.rating_scale_type)
                if r.rating is not None
                else 99.0,
                -r.created_at.timestamp(),
            )
        )

        base_url = settings.FRONTEND_URL.rstrip("/")
        safe_slug = quote(workspace_slug, safe="")
        quotes = [
            DigestQuoteItem(
                submission_id=r.id,
                comment=(r.comment or "").strip()[:240],
                score_text=_format_score_text(r.rating, r.rating_scale_type),
                category_name=(
                    category_names.get(r.category_id, "Uncategorized")
                    if r.category_id is not None
                    else "Uncategorized"
                ),
                customer_display=(r.customer_name or "").strip() or "Anonymous",
                triage_url=f"{base_url}/workspace/{safe_slug}?tab=triage&submissionId={r.id}",
            )
            for r in commented[:3]
        ]

        _, tz_label = _resolve_timezone(ws_timezone)
        return WeeklyDigestReport(
            workspace_id=workspace_id,
            workspace_name=workspace_name,
            workspace_slug=workspace_slug,
            recipient_email=recipient_email,
            timezone_name=tz_label,
            period_label=period_label,
            total_responses=len(current_rows),
            volume_delta=len(current_rows) - len(prior_rows),
            average_rating=current_avg,
            rating_delta=rating_delta,
            at_risk_count=sum(1 for r in current_rows if _is_at_risk(r)),
            positive_count=sum(1 for r in current_rows if r.sentiment == "positive"),
            neutral_count=sum(1 for r in current_rows if r.sentiment == "neutral"),
            negative_count=sum(1 for r in current_rows if r.sentiment == "negative"),
            top_negative_driver=top_neg,
            top_positive_driver=top_pos,
            highlighted_quotes=quotes,
        )

    async def send_digest_email(self, report: WeeklyDigestReport) -> None:
        """Render and send a single workspace Monday Morning VoC Digest email."""
        base_url = settings.FRONTEND_URL.rstrip("/")
        safe_slug = quote(report.workspace_slug, safe="")
        dashboard_url = f"{base_url}/workspace/{safe_slug}?tab=insights"
        settings_url = f"{base_url}/workspace/{safe_slug}/settings?tab=general"

        avg_text = (
            f"{report.average_rating:.2f} ★"
            if report.average_rating is not None
            else "—"
        )
        rating_delta_text = (
            f"{report.rating_delta:+.2f} ★ vs. prior week"
            if report.rating_delta is not None
            else "No prior week rating"
        )
        volume_delta_text = f"{report.volume_delta:+d} vs. prior week"

        html = render_email_template(
            "weekly_voc_digest.html",
            app_name=settings.APP_NAME,
            workspace_name=report.workspace_name,
            period_label=report.period_label,
            timezone_name=report.timezone_name,
            total_responses=report.total_responses,
            volume_delta=report.volume_delta,
            volume_delta_text=volume_delta_text,
            average_rating_text=avg_text,
            rating_delta=report.rating_delta,
            rating_delta_text=rating_delta_text,
            at_risk_count=report.at_risk_count,
            positive_count=report.positive_count,
            neutral_count=report.neutral_count,
            negative_count=report.negative_count,
            top_negative_driver=report.top_negative_driver,
            top_positive_driver=report.top_positive_driver,
            highlighted_quotes=report.highlighted_quotes,
            dashboard_url=dashboard_url,
            settings_url=settings_url,
        )

        subject = (
            f"[{report.workspace_name}] Weekly VoC Digest: "
            f"{report.total_responses} responses ({avg_text})"
        )
        await send_email(
            to_email=report.recipient_email,
            subject=subject,
            html_content=html,
            raise_on_error=True,
        )

    async def process_due_digests(self, now_utc: datetime | None = None) -> int:
        """
        Check all eligible Pro workspaces and send digests for those currently at
        local Monday 08:00–08:59 without a duplicate send this week.
        Returns the number of digest emails dispatched.
        """
        current_utc = now_utc or datetime.now(UTC)
        eligible = await self.auth_repo.list_digest_eligible_workspaces_with_owners()

        sent_count = 0
        for (
            workspace_id,
            workspace_name,
            workspace_slug,
            ws_timezone,
            last_sent_at,
            owner_email,
        ) in eligible:
            if not is_local_monday_morning(ws_timezone, last_sent_at, current_utc):
                continue

            try:
                report = await self.build_workspace_digest(
                    workspace_id=workspace_id,
                    workspace_name=workspace_name,
                    workspace_slug=workspace_slug,
                    ws_timezone=ws_timezone,
                    recipient_email=owner_email,
                    now_utc=current_utc,
                )
                if report is None:
                    logger.info(
                        "feedback.digest.skipped_empty_week",
                        workspace_id=str(workspace_id),
                    )
                    continue

                await self.send_digest_email(report)
                await self.auth_repo.mark_weekly_digest_sent(workspace_id, current_utc)
                await self.session.commit()
                sent_count += 1
                logger.info(
                    "feedback.digest.sent",
                    workspace_id=str(workspace_id),
                    total_responses=report.total_responses,
                )
            except Exception as exc:
                await self.session.rollback()
                logger.error(
                    "feedback.digest.workspace_failed",
                    workspace_id=str(workspace_id),
                    error=str(exc),
                )

        return sent_count
