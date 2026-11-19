"""
Repository layer for Feedback Submissions.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import Float, and_, case, cast, delete, func, or_, select, union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.features.auth.models import Workspace
from app.features.feedback.models.submissions import FeedbackSubmission


@dataclass(frozen=True)
class CategoryInsightAggregate:
    """SQL-aggregated metrics for a single category bucket (or NULL for uncategorized)."""

    category_id: UUID | None
    total_count: int
    rated_count: int
    normalized_rating_sum: float
    positive_count: int
    neutral_count: int
    negative_count: int
    at_risk_count: int
    sample_count: int


class SubmissionRepository:
    """
    Data access operations for Feedback Submissions.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, submission: FeedbackSubmission) -> FeedbackSubmission:
        """
        Persist a new feedback submission record.
        """
        self.session.add(submission)
        await self.session.flush()
        return submission

    async def consume_submission_quota(self, workspace_id: UUID) -> bool:
        """
        Atomically roll forward expired billing cycles and consume 1 submission slot.
        Returns True if under monthly_submission_limit, False if quota exhausted.
        """
        now = datetime.now(UTC)
        next_reset = now + timedelta(days=30)
        expired = Workspace.cycle_reset_at <= now

        stmt = (
            update(Workspace)
            .where(
                Workspace.id == workspace_id,
                Workspace.deleted_at.is_(None),
                expired
                | (
                    Workspace.current_cycle_submissions_count
                    < Workspace.monthly_submission_limit
                ),
            )
            .values(
                current_cycle_submissions_count=case(
                    (expired, 1),
                    else_=Workspace.current_cycle_submissions_count + 1,
                ),
                cycle_reset_at=case(
                    (expired, next_reset),
                    else_=Workspace.cycle_reset_at,
                ),
            )
            .returning(Workspace.id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_by_id(self, submission_id: UUID) -> FeedbackSubmission | None:
        """
        Fetch submission by ID.
        """
        return await self.session.get(FeedbackSubmission, submission_id)

    @staticmethod
    def _build_segment_conditions(
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> list[ColumnElement[bool]]:
        """
        Build shared segment filter predicates across submission lists, CSV exports, and insights.
        """
        conditions: list[ColumnElement[bool]] = []
        if form_id is not None:
            conditions.append(FeedbackSubmission.form_id == form_id)

        source_clean = source.strip() if source else ""
        if source_clean:
            source_lower = source_clean.lower()
            effective_source = func.coalesce(
                func.nullif(FeedbackSubmission.customer_metadata["source"].astext, ""),
                FeedbackSubmission.source,
            )
            conditions.append(
                (func.lower(effective_source) == source_lower)
                | (
                    func.lower(
                        func.coalesce(
                            FeedbackSubmission.customer_metadata["ref"].astext,
                            "",
                        )
                    )
                    == source_lower
                )
            )

        page_url_clean = page_url.strip() if page_url else ""
        if page_url_clean:
            conditions.append(
                FeedbackSubmission.customer_metadata["page_url"].astext == page_url_clean
            )

        plan_tier_clean = plan_tier.strip() if plan_tier else ""
        if plan_tier_clean:
            effective_plan_tier = func.coalesce(
                func.nullif(
                    FeedbackSubmission.customer_metadata["plan_tier"].astext, ""
                ),
                func.nullif(FeedbackSubmission.customer_metadata["plan"].astext, ""),
                func.nullif(FeedbackSubmission.customer_metadata["tier"].astext, ""),
            )
            conditions.append(func.lower(effective_plan_tier) == plan_tier_clean.lower())

        return conditions

    def _build_workspace_conditions(
        self,
        workspace_id: UUID,
        status: str | None = None,
        category_id: UUID | None = None,
        sentiment: str | None = None,
        query: str | None = None,
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> list[ColumnElement[bool]]:
        """
        Build shared filter predicates for workspace submission queries and CSV exports.
        Excludes spam/quarantined rows unless explicitly filtered by status.
        """
        conditions: list[ColumnElement[bool]] = [
            FeedbackSubmission.workspace_id == workspace_id
        ]
        if status:
            conditions.append(FeedbackSubmission.status == status)
        else:
            conditions.append(FeedbackSubmission.status.notin_(["spam", "quarantined"]))
        if category_id:
            conditions.append(FeedbackSubmission.category_id == category_id)
        if sentiment:
            conditions.append(FeedbackSubmission.sentiment == sentiment)
        if query:
            q_lower = f"%{query.lower()}%"
            conditions.append(
                (func.lower(FeedbackSubmission.comment).like(q_lower))
                | (func.lower(FeedbackSubmission.customer_email).like(q_lower))
                | (func.lower(FeedbackSubmission.customer_name).like(q_lower))
            )
        conditions.extend(
            self._build_segment_conditions(
                form_id=form_id,
                source=source,
                page_url=page_url,
                plan_tier=plan_tier,
            )
        )
        return conditions

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        limit: int = 50,
        offset: int = 0,
        status: str | None = None,
        category_id: UUID | None = None,
        sentiment: str | None = None,
        query: str | None = None,
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> tuple[Sequence[FeedbackSubmission], int]:
        """
        List submissions for a workspace with pagination and optional filters.
        """
        conditions = self._build_workspace_conditions(
            workspace_id=workspace_id,
            status=status,
            category_id=category_id,
            sentiment=sentiment,
            query=query,
            form_id=form_id,
            source=source,
            page_url=page_url,
            plan_tier=plan_tier,
        )

        stmt = (
            select(FeedbackSubmission)
            .where(*conditions)
            .order_by(FeedbackSubmission.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        count_stmt = (
            select(func.count()).select_from(FeedbackSubmission).where(*conditions)
        )

        result = await self.session.execute(stmt)
        count_result = await self.session.execute(count_stmt)

        return result.scalars().all(), count_result.scalar_one()

    async def list_for_export(
        self,
        workspace_id: UUID,
        status: str | None = None,
        category_id: UUID | None = None,
        sentiment: str | None = None,
        query: str | None = None,
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
        limit: int = 10000,
    ) -> Sequence[FeedbackSubmission]:
        """
        Retrieve filtered submissions ordered newest-first for CSV export.
        """
        conditions = self._build_workspace_conditions(
            workspace_id=workspace_id,
            status=status,
            category_id=category_id,
            sentiment=sentiment,
            query=query,
            form_id=form_id,
            source=source,
            page_url=page_url,
            plan_tier=plan_tier,
        )
        stmt = (
            select(FeedbackSubmission)
            .where(*conditions)
            .order_by(FeedbackSubmission.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update(
        self,
        submission: FeedbackSubmission,
        status: str | None = None,
        category_id: UUID | None = None,
    ) -> FeedbackSubmission:
        """
        Update an existing submission record.
        """
        if status is not None:
            submission.status = status
        if category_id is not None:
            submission.category_id = category_id
        await self.session.flush()
        return submission

    async def aggregate_for_insights(
        self,
        workspace_id: UUID,
        since: datetime | None = None,
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> list[CategoryInsightAggregate]:
        """
        Compute per-category satisfaction, sentiment, at-risk, and sample metrics directly in SQL.
        Returns one row per category_id (including None for uncategorized submissions),
        avoiding loading full ORM submission rows into Python memory.
        """
        conditions: list[ColumnElement[bool]] = [
            FeedbackSubmission.workspace_id == workspace_id,
            FeedbackSubmission.status.notin_(["spam", "quarantined"]),
        ]
        if since is not None:
            conditions.append(FeedbackSubmission.created_at >= since)
        conditions.extend(
            self._build_segment_conditions(
                form_id=form_id,
                source=source,
                page_url=page_url,
                plan_tier=plan_tier,
            )
        )

        normalized_rating = case(
            (FeedbackSubmission.rating.is_(None), None),
            (
                FeedbackSubmission.rating_scale_type == "1_10_numeric",
                cast(FeedbackSubmission.rating, Float) / 2.0,
            ),
            else_=cast(FeedbackSubmission.rating, Float),
        )
        at_risk_expr = and_(
            FeedbackSubmission.status.in_(("new", "in_progress")),
            or_(
                FeedbackSubmission.sentiment == "negative",
                and_(
                    FeedbackSubmission.rating.is_not(None),
                    FeedbackSubmission.rating_scale_type.in_(("5_star", "5_emoji")),
                    FeedbackSubmission.rating <= 2,
                ),
                and_(
                    FeedbackSubmission.rating.is_not(None),
                    FeedbackSubmission.rating_scale_type == "1_10_numeric",
                    FeedbackSubmission.rating <= 4,
                ),
            ),
        )
        sample_expr = FeedbackSubmission.customer_metadata.contains({"is_sample": True})

        stmt = (
            select(
                FeedbackSubmission.category_id,
                func.count().label("total_count"),
                func.count(FeedbackSubmission.rating).label("rated_count"),
                func.coalesce(func.sum(normalized_rating), 0.0).label(
                    "normalized_rating_sum"
                ),
                func.count()
                .filter(FeedbackSubmission.sentiment == "positive")
                .label("positive_count"),
                func.count()
                .filter(FeedbackSubmission.sentiment == "neutral")
                .label("neutral_count"),
                func.count()
                .filter(FeedbackSubmission.sentiment == "negative")
                .label("negative_count"),
                func.count().filter(at_risk_expr).label("at_risk_count"),
                func.count().filter(sample_expr).label("sample_count"),
            )
            .where(*conditions)
            .group_by(FeedbackSubmission.category_id)
        )
        result = await self.session.execute(stmt)
        return [
            CategoryInsightAggregate(
                category_id=row.category_id,
                total_count=int(row.total_count),
                rated_count=int(row.rated_count),
                normalized_rating_sum=float(row.normalized_rating_sum),
                positive_count=int(row.positive_count),
                neutral_count=int(row.neutral_count),
                negative_count=int(row.negative_count),
                at_risk_count=int(row.at_risk_count),
                sample_count=int(row.sample_count),
            )
            for row in result.all()
        ]

    async def list_for_insights(
        self,
        workspace_id: UUID,
        since: datetime | None = None,
        form_id: UUID | None = None,
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
    ) -> Sequence[FeedbackSubmission]:
        """
        Retrieve submissions for a workspace within optional timeframe and segment filters.
        Prefer `aggregate_for_insights` for dashboard metrics to avoid loading all rows in RAM.
        """
        conditions: list[ColumnElement[bool]] = [
            FeedbackSubmission.workspace_id == workspace_id,
            FeedbackSubmission.status.notin_(["spam", "quarantined"]),
        ]
        if since is not None:
            conditions.append(FeedbackSubmission.created_at >= since)
        conditions.extend(
            self._build_segment_conditions(
                form_id=form_id,
                source=source,
                page_url=page_url,
                plan_tier=plan_tier,
            )
        )

        stmt = (
            select(FeedbackSubmission)
            .where(*conditions)
            .order_by(FeedbackSubmission.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_for_weekly_digest(
        self,
        workspace_id: UUID,
        window_start: datetime,
        window_end: datetime,
    ) -> list[
        tuple[
            UUID,
            int | None,
            str,
            str | None,
            UUID | None,
            str | None,
            str | None,
            str,
            datetime,
        ]
    ]:
        """
        Fetch minimal columns for non-spam, non-quarantined, non-sample submissions
        within [window_start, window_end) for weekly Monday digest aggregation.
        """
        stmt = (
            select(
                FeedbackSubmission.id,
                FeedbackSubmission.rating,
                FeedbackSubmission.rating_scale_type,
                FeedbackSubmission.sentiment,
                FeedbackSubmission.category_id,
                FeedbackSubmission.comment,
                FeedbackSubmission.customer_name,
                FeedbackSubmission.status,
                FeedbackSubmission.created_at,
            )
            .where(
                FeedbackSubmission.workspace_id == workspace_id,
                FeedbackSubmission.status.notin_(("spam", "quarantined")),
                FeedbackSubmission.created_at >= window_start,
                FeedbackSubmission.created_at < window_end,
                func.coalesce(
                    FeedbackSubmission.customer_metadata["is_sample"].astext, ""
                )
                != "true",
            )
            .order_by(FeedbackSubmission.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return [
            (
                row[0],
                row[1],
                row[2],
                row[3],
                row[4],
                row[5],
                row[6],
                row[7],
                row[8],
            )
            for row in result.all()
        ]

    async def list_segment_options(
        self,
        workspace_id: UUID,
        since: datetime | None = None,
    ) -> tuple[list[str], list[str], list[str]]:
        """
        Collect distinct source, page_url, and plan_tier segment values directly in SQL
        within the active timeframe, avoiding streaming full JSONB metadata rows into Python.
        """
        conditions: list[ColumnElement[bool]] = [
            FeedbackSubmission.workspace_id == workspace_id,
            FeedbackSubmission.status.notin_(["spam", "quarantined"]),
        ]
        if since is not None:
            conditions.append(FeedbackSubmission.created_at >= since)

        primary_source_expr = func.btrim(
            func.coalesce(
                func.nullif(FeedbackSubmission.customer_metadata["source"].astext, ""),
                FeedbackSubmission.source,
                "",
            )
        )
        ref_expr = func.btrim(
            func.coalesce(FeedbackSubmission.customer_metadata["ref"].astext, "")
        )
        sources_stmt = union(
            select(primary_source_expr.label("val")).where(
                *conditions, primary_source_expr != ""
            ),
            select(ref_expr.label("val")).where(*conditions, ref_expr != ""),
        )
        sources_result = await self.session.execute(sources_stmt)
        sources = sorted(
            {str(val) for val in sources_result.scalars().all() if val},
            key=str.lower,
        )

        page_url_expr = func.btrim(
            func.coalesce(FeedbackSubmission.customer_metadata["page_url"].astext, "")
        )
        distinct_page_urls = (
            select(page_url_expr.label("val"))
            .where(*conditions, page_url_expr != "")
            .distinct()
            .subquery()
        )
        page_urls_stmt = (
            select(distinct_page_urls.c.val)
            .order_by(func.lower(distinct_page_urls.c.val), distinct_page_urls.c.val)
            .limit(200)
        )
        page_urls_result = await self.session.execute(page_urls_stmt)
        page_urls = [str(val) for val in page_urls_result.scalars().all() if val]

        plan_expr = func.btrim(
            func.coalesce(
                func.nullif(
                    FeedbackSubmission.customer_metadata["plan_tier"].astext, ""
                ),
                func.nullif(FeedbackSubmission.customer_metadata["plan"].astext, ""),
                func.nullif(FeedbackSubmission.customer_metadata["tier"].astext, ""),
                "",
            )
        )
        plan_tiers_stmt = (
            select(plan_expr).where(*conditions, plan_expr != "").distinct()
        )
        plan_tiers_result = await self.session.execute(plan_tiers_stmt)
        plan_tiers = sorted(
            {str(val) for val in plan_tiers_result.scalars().all() if val},
            key=str.lower,
        )

        return sources, page_urls, plan_tiers

    async def list_by_customer_email(
        self,
        workspace_id: UUID,
        customer_email: str,
        limit: int = 50,
    ) -> Sequence[FeedbackSubmission]:
        """
        Fetch submissions from a specific customer email within a workspace.
        """
        stmt = (
            select(FeedbackSubmission)
            .where(
                FeedbackSubmission.workspace_id == workspace_id,
                FeedbackSubmission.customer_email.ilike(customer_email.strip()),
            )
            .order_by(FeedbackSubmission.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_sample_submissions(
        self,
        workspace_id: UUID,
    ) -> Sequence[FeedbackSubmission]:
        """
        Fetch all sample/demo feedback submissions for a workspace (filtered in SQL).
        """
        stmt = (
            select(FeedbackSubmission)
            .where(
                FeedbackSubmission.workspace_id == workspace_id,
                FeedbackSubmission.customer_metadata.contains({"is_sample": True}),
            )
            .order_by(FeedbackSubmission.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_sample_submissions(
        self,
        workspace_id: UUID,
    ) -> int:
        """
        Bulk-delete all sample/demo feedback submissions for a workspace in a single SQL statement.
        """
        stmt = delete(FeedbackSubmission).where(
            FeedbackSubmission.workspace_id == workspace_id,
            FeedbackSubmission.customer_metadata.contains({"is_sample": True}),
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return int(getattr(result, "rowcount", 0) or 0)
