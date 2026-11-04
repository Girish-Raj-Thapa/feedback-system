"""
Service layer for Feedback Insights & Score Drivers calculation.
Computes deterministic, low-cost macro VoC signals and theme bucket impacts.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.repositories.categories import FeedbackCategoryRepository
from app.features.feedback.repositories.submissions import SubmissionRepository
from app.features.feedback.schemas.insights import (
    CategoryInsightItem,
    FeedbackInsightsResponse,
    InsightSummary,
    ScoreDriverItem,
    SentimentBreakdown,
)


def _normalize_rating(rating: int, scale_type: str) -> float:
    """
    Normalizes rating scores to a standard 5-star baseline.
    1-10 numeric scale is mapped to 1-5 scale (divided by 2.0).
    """
    if scale_type == "1_10_numeric":
        return round(rating / 2.0, 2)
    return float(rating)


class InsightsService:
    """
    Calculates VoC decision metrics, Net Score Drivers, and theme bucket aggregations.
    """

    def __init__(
        self,
        session: AsyncSession,
        submission_repo: SubmissionRepository,
        category_repo: FeedbackCategoryRepository,
    ) -> None:
        self.session = session
        self.submission_repo = submission_repo
        self.category_repo = category_repo

    async def get_insights(
        self,
        workspace_id: UUID,
        days: int | None = 30,
        form_id: UUID | None = None,
    ) -> FeedbackInsightsResponse:
        """
        Aggregate satisfaction metrics, sentiment distribution, and score drivers for a workspace.
        """
        ws = await self.session.get(Workspace, workspace_id)
        if not ws or ws.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )

        since: datetime | None = None
        if days is not None and days > 0:
            since = datetime.now(UTC) - timedelta(days=days)

        submissions = await self.submission_repo.list_for_insights(
            workspace_id=workspace_id,
            since=since,
            form_id=form_id,
        )
        categories = await self.category_repo.list_active(workspace_id)

        total_count = len(submissions)
        rated_submissions = [s for s in submissions if s.rating is not None]

        overall_avg: float | None = None
        if rated_submissions:
            norm_ratings = [
                _normalize_rating(s.rating, s.rating_scale_type)
                for s in rated_submissions
                if s.rating is not None
            ]
            overall_avg = round(sum(norm_ratings) / len(norm_ratings), 2)

        sentiment_breakdown = SentimentBreakdown(
            positive=sum(1 for s in submissions if s.sentiment == "positive"),
            neutral=sum(1 for s in submissions if s.sentiment == "neutral"),
            negative=sum(1 for s in submissions if s.sentiment == "negative"),
        )

        # At-risk count: unresolved (new or in_progress) submissions with negative sentiment or low score
        at_risk_count = 0
        for s in submissions:
            if s.status in ("new", "in_progress"):
                is_low_rating = False
                if s.rating is not None:
                    if s.rating_scale_type in ("5_star", "5_emoji") and s.rating <= 2:
                        is_low_rating = True
                    elif s.rating_scale_type == "1_10_numeric" and s.rating <= 4:
                        is_low_rating = True
                if is_low_rating or s.sentiment == "negative":
                    at_risk_count += 1

        cat_items: list[CategoryInsightItem] = []

        for cat in categories:
            cat_subs = [s for s in submissions if s.category_id == cat.id]
            c_count = len(cat_subs)
            c_percentage = (
                round((c_count / total_count) * 100, 1) if total_count > 0 else 0.0
            )
            c_rated = [
                _normalize_rating(s.rating, s.rating_scale_type)
                for s in cat_subs
                if s.rating is not None
            ]
            c_avg = round(sum(c_rated) / len(c_rated), 2) if c_rated else None

            c_impact = 0.0
            if c_avg is not None and overall_avg is not None:
                c_impact = round(c_avg - overall_avg, 2)

            cat_items.append(
                CategoryInsightItem(
                    category_id=cat.id,
                    category_name=cat.name,
                    color=cat.color or "#8E8E93",
                    icon=cat.icon,
                    count=c_count,
                    percentage=c_percentage,
                    average_rating=c_avg,
                    score_impact=c_impact,
                    sentiment_counts=SentimentBreakdown(
                        positive=sum(1 for s in cat_subs if s.sentiment == "positive"),
                        neutral=sum(1 for s in cat_subs if s.sentiment == "neutral"),
                        negative=sum(1 for s in cat_subs if s.sentiment == "negative"),
                    ),
                )
            )

        # Include Uncategorized bucket if any uncategorized submissions exist
        uncat_subs = [s for s in submissions if s.category_id is None]
        if uncat_subs:
            u_count = len(uncat_subs)
            u_percentage = (
                round((u_count / total_count) * 100, 1) if total_count > 0 else 0.0
            )
            u_rated = [
                _normalize_rating(s.rating, s.rating_scale_type)
                for s in uncat_subs
                if s.rating is not None
            ]
            u_avg = round(sum(u_rated) / len(u_rated), 2) if u_rated else None
            u_impact = 0.0
            if u_avg is not None and overall_avg is not None:
                u_impact = round(u_avg - overall_avg, 2)

            cat_items.append(
                CategoryInsightItem(
                    category_id=None,
                    category_name="Uncategorized",
                    color="#8E8E93",
                    icon=None,
                    count=u_count,
                    percentage=u_percentage,
                    average_rating=u_avg,
                    score_impact=u_impact,
                    sentiment_counts=SentimentBreakdown(
                        positive=sum(1 for s in uncat_subs if s.sentiment == "positive"),
                        neutral=sum(1 for s in uncat_subs if s.sentiment == "neutral"),
                        negative=sum(1 for s in uncat_subs if s.sentiment == "negative"),
                    ),
                )
            )

        # Sort categories by volume descending
        cat_items.sort(key=lambda c: c.count, reverse=True)

        # Calculate #1 Negative and #1 Positive Score Drivers
        candidates = [c for c in cat_items if c.average_rating is not None]

        negative_drivers = [c for c in candidates if c.score_impact < 0]
        top_negative: ScoreDriverItem | None = None
        if negative_drivers:
            negative_drivers.sort(key=lambda c: (c.score_impact, -c.count))
            best_neg = negative_drivers[0]
            top_negative = ScoreDriverItem(
                category_id=best_neg.category_id,
                category_name=best_neg.category_name,
                average_rating=best_neg.average_rating,
                score_impact=best_neg.score_impact,
                count=best_neg.count,
            )

        positive_drivers = [c for c in candidates if c.score_impact > 0]
        top_positive: ScoreDriverItem | None = None
        if positive_drivers:
            positive_drivers.sort(key=lambda c: (-c.score_impact, -c.count))
            best_pos = positive_drivers[0]
            top_positive = ScoreDriverItem(
                category_id=best_pos.category_id,
                category_name=best_pos.category_name,
                average_rating=best_pos.average_rating,
                score_impact=best_pos.score_impact,
                count=best_pos.count,
            )

        has_sample_data = any(
            isinstance(s.customer_metadata, dict)
            and s.customer_metadata.get("is_sample") is True
            for s in submissions
        )

        summary = InsightSummary(
            total_submissions=total_count,
            rated_submissions_count=len(rated_submissions),
            average_rating=overall_avg,
            sentiment_breakdown=sentiment_breakdown,
            at_risk_count=at_risk_count,
            has_sample_data=has_sample_data,
            top_negative_driver=top_negative,
            top_positive_driver=top_positive,
        )

        return FeedbackInsightsResponse(
            summary=summary,
            categories=cat_items,
        )
