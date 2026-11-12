"""
Repository layer for Feedback Submissions.
"""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.features.feedback.models.submissions import FeedbackSubmission


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
        Retrieve submissions for a workspace within optional timeframe and segment filters for analytics calculation.
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

    async def list_segment_options(
        self,
        workspace_id: UUID,
        since: datetime | None = None,
    ) -> tuple[list[str], list[str], list[str]]:
        """
        Collect distinct source, page_url, and plan_tier segment values within the active timeframe.
        """
        conditions: list[ColumnElement[bool]] = [
            FeedbackSubmission.workspace_id == workspace_id,
            FeedbackSubmission.status.notin_(["spam", "quarantined"]),
        ]
        if since is not None:
            conditions.append(FeedbackSubmission.created_at >= since)

        stmt = select(
            FeedbackSubmission.source,
            FeedbackSubmission.customer_metadata,
        ).where(*conditions)
        result = await self.session.execute(stmt)

        sources: set[str] = set()
        page_urls: set[str] = set()
        plan_tiers: set[str] = set()

        for sub_source, raw_meta in result.all():
            meta = raw_meta if isinstance(raw_meta, dict) else {}

            primary_source = str(meta.get("source") or sub_source or "").strip()
            if primary_source:
                sources.add(primary_source)

            ref_val = str(meta.get("ref") or "").strip()
            if ref_val:
                sources.add(ref_val)

            page_url_val = str(meta.get("page_url") or "").strip()
            if page_url_val:
                page_urls.add(page_url_val)

            plan_val = str(
                meta.get("plan_tier") or meta.get("plan") or meta.get("tier") or ""
            ).strip()
            if plan_val:
                plan_tiers.add(plan_val)

        return (
            sorted(sources, key=str.lower),
            sorted(page_urls, key=str.lower)[:200],
            sorted(plan_tiers, key=str.lower),
        )

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
        Fetch all sample/demo feedback submissions for a workspace.
        """
        stmt = (
            select(FeedbackSubmission)
            .where(
                FeedbackSubmission.workspace_id == workspace_id,
            )
            .order_by(FeedbackSubmission.created_at.desc())
        )
        result = await self.session.execute(stmt)
        submissions = result.scalars().all()
        return [
            s
            for s in submissions
            if isinstance(s.customer_metadata, dict)
            and s.customer_metadata.get("is_sample") is True
        ]

    async def delete_sample_submissions(
        self,
        workspace_id: UUID,
    ) -> int:
        """
        Delete all sample/demo feedback submissions for a workspace.
        """
        samples = await self.list_sample_submissions(workspace_id)
        count = len(samples)
        for s in samples:
            await self.session.delete(s)
        await self.session.flush()
        return count
