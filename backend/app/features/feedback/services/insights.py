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
from app.features.feedback.repositories.submissions import (
    CategoryInsightAggregate,
    SubmissionRepository,
)
from app.features.feedback.schemas.insights import (
    CategoryInsightItem,
    FeedbackInsightsResponse,
    InsightSegments,
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
        source: str | None = None,
        page_url: str | None = None,
        plan_tier: str | None = None,
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

        aggregates = await self.submission_repo.aggregate_for_insights(
            workspace_id=workspace_id,
            since=since,
            form_id=form_id,
            source=source,
            page_url=page_url,
            plan_tier=plan_tier,
        )
        sources, page_urls, plan_tiers = (
            await self.submission_repo.list_segment_options(
                workspace_id=workspace_id,
                since=since,
            )
        )
        categories = await self.category_repo.list_active(workspace_id)

        total_count = sum(a.total_count for a in aggregates)
        rated_count = sum(a.rated_count for a in aggregates)
        total_rating_sum = sum(a.normalized_rating_sum for a in aggregates)
        overall_avg: float | None = (
            round(total_rating_sum / rated_count, 2) if rated_count > 0 else None
        )

        sentiment_breakdown = SentimentBreakdown(
            positive=sum(a.positive_count for a in aggregates),
            neutral=sum(a.neutral_count for a in aggregates),
            negative=sum(a.negative_count for a in aggregates),
        )
        at_risk_count = sum(a.at_risk_count for a in aggregates)
        has_sample_data = any(a.sample_count > 0 for a in aggregates)

        agg_by_cat: dict[UUID | None, CategoryInsightAggregate] = {
            a.category_id: a for a in aggregates
        }

        cat_items: list[CategoryInsightItem] = []

        for cat in categories:
            agg = agg_by_cat.get(cat.id)
            c_count = agg.total_count if agg else 0
            c_percentage = (
                round((c_count / total_count) * 100, 1) if total_count > 0 else 0.0
            )
            c_avg = (
                round(agg.normalized_rating_sum / agg.rated_count, 2)
                if agg and agg.rated_count > 0
                else None
            )

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
                        positive=agg.positive_count if agg else 0,
                        neutral=agg.neutral_count if agg else 0,
                        negative=agg.negative_count if agg else 0,
                    ),
                )
            )

        # Include Uncategorized bucket if any uncategorized submissions exist
        uncat_agg = agg_by_cat.get(None)
        if uncat_agg and uncat_agg.total_count > 0:
            u_count = uncat_agg.total_count
            u_percentage = (
                round((u_count / total_count) * 100, 1) if total_count > 0 else 0.0
            )
            u_avg = (
                round(uncat_agg.normalized_rating_sum / uncat_agg.rated_count, 2)
                if uncat_agg.rated_count > 0
                else None
            )
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
                        positive=uncat_agg.positive_count,
                        neutral=uncat_agg.neutral_count,
                        negative=uncat_agg.negative_count,
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

        summary = InsightSummary(
            total_submissions=total_count,
            rated_submissions_count=rated_count,
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
            available_segments=InsightSegments(
                sources=sources,
                page_urls=page_urls,
                plan_tiers=plan_tiers,
            ),
        )
