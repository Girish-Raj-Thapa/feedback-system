"""
Service layer for Decision Logs (Before vs. After Impact Tracker).
Calculates pre- and post-decision sentiment and rating impact metrics.
"""

from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.features.feedback.models.decision_logs import DecisionLog
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.decision_logs import DecisionLogRepository
from app.features.feedback.schemas.decision_logs import (
    DecisionImpactMetrics,
    DecisionLogCreate,
    DecisionLogRead,
    DecisionLogUpdate,
    DecisionWindowMetrics,
)


def _normalize_rating(rating: int, scale_type: str) -> float:
    """Normalizes rating scores to a standard 5-star baseline."""
    if scale_type == "1_10_numeric":
        return round(rating / 2.0, 2)
    return float(rating)


def _is_detractor(
    rating: int | None,
    scale_type: str,
    sentiment: str | None,
) -> bool:
    """
    Identifies whether a submission represents negative sentiment / complaint.
    Consistent with insights.py scoring rules.
    """
    if sentiment == "negative":
        return True
    if rating is not None:
        if scale_type in ("5_star", "5_emoji") and rating <= 2:
            return True
        if scale_type == "1_10_numeric" and rating <= 4:
            return True
    return False


class DecisionLogService:
    """
    Manages Decision Logs lifecycle and computes comparative Before vs After impact metrics.
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: DecisionLogRepository,
        category_repo: FeedbackCategoryRepository,
    ) -> None:
        self.session = session
        self.repo = repo
        self.category_repo = category_repo

    async def compute_impact_metrics(
        self,
        workspace_id: UUID,
        category_id: UUID | None,
        decision_date: date,
        window_days: int = 30,
    ) -> DecisionImpactMetrics:
        """
        Calculates 30-day pre- and post-decision customer satisfaction metrics.
        Pre-window: [D - 30d, D)
        Post-window: [D, D + 30d]
        """
        # 1. Calculate date bounds
        pre_start_date = decision_date - timedelta(days=window_days)
        pre_end_date = decision_date

        post_start_date = decision_date
        post_end_date = decision_date + timedelta(days=window_days)

        pre_start_dt = datetime.combine(pre_start_date, time.min).replace(
            tzinfo=UTC
        )
        pre_end_dt = datetime.combine(pre_end_date, time.min).replace(
            tzinfo=UTC
        )

        post_start_dt = pre_end_dt
        post_end_dt = datetime.combine(post_end_date, time.max).replace(
            tzinfo=UTC
        )

        # 2. Fetch non-spam submissions in windows
        pre_subs = await self.repo.fetch_submissions_in_window(
            workspace_id=workspace_id,
            category_id=category_id,
            start_dt=pre_start_dt,
            end_dt=pre_end_dt,
        )
        post_subs = await self.repo.fetch_submissions_in_window(
            workspace_id=workspace_id,
            category_id=category_id,
            start_dt=post_start_dt,
            end_dt=post_end_dt,
        )

        # 3. Compute Pre-Decision Window
        pre_total = len(pre_subs)
        pre_rated = [s for s in pre_subs if s.rating is not None]
        pre_avg: float | None = None
        if pre_rated:
            normalized_ratings = [
                _normalize_rating(s.rating, s.rating_scale_type)
                for s in pre_rated
                if s.rating is not None
            ]
            pre_avg = round(sum(normalized_ratings) / len(normalized_ratings), 2)

        pre_neg_count = sum(
            1
            for s in pre_subs
            if _is_detractor(s.rating, s.rating_scale_type, s.sentiment)
        )
        pre_neg_pct: float | None = (
            round((pre_neg_count / pre_total) * 100, 1)
            if pre_total > 0
            else None
        )

        before_metrics = DecisionWindowMetrics(
            start_date=pre_start_date,
            end_date=pre_end_date,
            total_submissions=pre_total,
            average_rating=pre_avg,
            negative_count=pre_neg_count,
            negative_percentage=pre_neg_pct,
        )

        # 4. Compute Post-Decision Window
        post_total = len(post_subs)
        post_rated = [s for s in post_subs if s.rating is not None]
        post_avg: float | None = None
        if post_rated:
            normalized_ratings = [
                _normalize_rating(s.rating, s.rating_scale_type)
                for s in post_rated
                if s.rating is not None
            ]
            post_avg = round(sum(normalized_ratings) / len(normalized_ratings), 2)

        post_neg_count = sum(
            1
            for s in post_subs
            if _is_detractor(s.rating, s.rating_scale_type, s.sentiment)
        )
        post_neg_pct: float | None = (
            round((post_neg_count / post_total) * 100, 1)
            if post_total > 0
            else None
        )

        after_metrics = DecisionWindowMetrics(
            start_date=post_start_date,
            end_date=post_end_date,
            total_submissions=post_total,
            average_rating=post_avg,
            negative_count=post_neg_count,
            negative_percentage=post_neg_pct,
        )

        # 5. Compute Deltas & Classification
        score_delta: float | None = None
        if pre_avg is not None and post_avg is not None:
            score_delta = round(post_avg - pre_avg, 2)

        complaint_delta: float | None = None
        if pre_neg_pct is not None and post_neg_pct is not None:
            complaint_delta = round(post_neg_pct - pre_neg_pct, 1)

        if pre_total == 0 or post_total == 0:
            status = "insufficient_data"
        elif score_delta is not None:
            if score_delta >= 0.2:
                status = "positive_impact"
            elif score_delta <= -0.2:
                status = "negative_impact"
            else:
                status = "neutral_impact"
        else:
            status = "insufficient_data"

        return DecisionImpactMetrics(
            before=before_metrics,
            after=after_metrics,
            score_delta=score_delta,
            complaint_share_delta=complaint_delta,
            status=status,
        )

    def _to_read_dto(
        self,
        decision_log: DecisionLog,
        impact: DecisionImpactMetrics | None = None,
    ) -> DecisionLogRead:
        """Map ORM entity to read DTO with category name and color."""
        cat_name = decision_log.category.name if decision_log.category else None
        cat_color = decision_log.category.color if decision_log.category else None

        return DecisionLogRead(
            id=decision_log.id,
            workspace_id=decision_log.workspace_id,
            category_id=decision_log.category_id,
            category_name=cat_name,
            category_color=cat_color,
            title=decision_log.title,
            description=decision_log.description,
            decision_date=decision_log.decision_date,
            created_by_user_id=decision_log.created_by_user_id,
            impact=impact,
            created_at=decision_log.created_at,
            updated_at=decision_log.updated_at,
        )

    async def create_decision_log(
        self,
        workspace_id: UUID,
        user_id: UUID | None,
        payload: DecisionLogCreate,
    ) -> DecisionLogRead:
        """Create a new decision log milestone and compute its impact."""
        if payload.category_id is not None:
            cat = await self.category_repo.get_by_id(
                workspace_id, payload.category_id
            )
            if not cat:
                raise NotFoundError("Referenced category not found in workspace")

        decision_log = DecisionLog(
            workspace_id=workspace_id,
            category_id=payload.category_id,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            decision_date=payload.decision_date,
            created_by_user_id=user_id,
        )

        await self.repo.create(decision_log)
        await self.session.commit()
        await self.session.refresh(decision_log)

        impact = await self.compute_impact_metrics(
            workspace_id=workspace_id,
            category_id=decision_log.category_id,
            decision_date=decision_log.decision_date,
        )

        # Refetch with relationships loaded
        loaded = await self.repo.get_by_id(workspace_id, decision_log.id)
        return self._to_read_dto(loaded or decision_log, impact=impact)

    async def list_decision_logs(
        self,
        workspace_id: UUID,
        category_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[DecisionLogRead], int]:
        """List decision logs with calculated impact metrics for each."""
        items, total = await self.repo.list_by_workspace(
            workspace_id=workspace_id,
            category_id=category_id,
            limit=limit,
            offset=offset,
        )

        results: list[DecisionLogRead] = []
        for dl in items:
            impact = await self.compute_impact_metrics(
                workspace_id=workspace_id,
                category_id=dl.category_id,
                decision_date=dl.decision_date,
            )
            results.append(self._to_read_dto(dl, impact=impact))

        return results, total

    async def get_decision_log(
        self,
        workspace_id: UUID,
        decision_id: UUID,
    ) -> DecisionLogRead:
        """Retrieve a single decision log with its impact metrics."""
        dl = await self.repo.get_by_id(workspace_id, decision_id)
        if not dl:
            raise NotFoundError("Decision log not found")

        impact = await self.compute_impact_metrics(
            workspace_id=workspace_id,
            category_id=dl.category_id,
            decision_date=dl.decision_date,
        )
        return self._to_read_dto(dl, impact=impact)

    async def update_decision_log(
        self,
        workspace_id: UUID,
        decision_id: UUID,
        payload: DecisionLogUpdate,
    ) -> DecisionLogRead:
        """Update an existing decision log."""
        dl = await self.repo.get_by_id(workspace_id, decision_id)
        if not dl:
            raise NotFoundError("Decision log not found")

        update_data = payload.model_dump(exclude_unset=True)

        if "category_id" in update_data and update_data["category_id"] is not None:
            cat = await self.category_repo.get_by_id(
                workspace_id, update_data["category_id"]
            )
            if not cat:
                raise NotFoundError("Referenced category not found in workspace")

        if "title" in update_data and update_data["title"] is not None:
            dl.title = update_data["title"].strip()
            if not dl.title:
                raise ValidationError("Title cannot be empty")

        if "description" in update_data:
            dl.description = (
                update_data["description"].strip()
                if update_data["description"]
                else None
            )

        if "category_id" in update_data:
            dl.category_id = update_data["category_id"]

        if "decision_date" in update_data and update_data["decision_date"] is not None:
            dl.decision_date = update_data["decision_date"]

        await self.session.commit()
        await self.session.refresh(dl)

        impact = await self.compute_impact_metrics(
            workspace_id=workspace_id,
            category_id=dl.category_id,
            decision_date=dl.decision_date,
        )
        loaded = await self.repo.get_by_id(workspace_id, dl.id)
        return self._to_read_dto(loaded or dl, impact=impact)

    async def delete_decision_log(
        self,
        workspace_id: UUID,
        decision_id: UUID,
    ) -> None:
        """Delete a decision log."""
        dl = await self.repo.get_by_id(workspace_id, decision_id)
        if not dl:
            raise NotFoundError("Decision log not found")

        await self.repo.delete(dl)
        await self.session.commit()
