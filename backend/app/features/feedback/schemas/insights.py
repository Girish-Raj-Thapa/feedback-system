"""
Pydantic schemas for Feedback Insights & Score Drivers.
Quantifies customer sentiment, theme bucket performance, and net score drivers.
"""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SentimentBreakdown(BaseModel):
    """Counts of positive, neutral, and negative sentiment."""

    positive: int = Field(default=0, ge=0)
    neutral: int = Field(default=0, ge=0)
    negative: int = Field(default=0, ge=0)


class ScoreDriverItem(BaseModel):
    """A category that acts as a primary negative or positive driver of satisfaction."""

    category_id: UUID | None = None
    category_name: str
    average_rating: float | None = None
    score_impact: float = 0.0
    count: int = 0


class CategoryInsightItem(BaseModel):
    """Performance metrics for an individual locked theme bucket / category."""

    category_id: UUID | None = None
    category_name: str
    color: str = "#8E8E93"
    icon: str | None = None
    count: int = 0
    percentage: float = 0.0
    average_rating: float | None = None
    score_impact: float = 0.0
    sentiment_counts: SentimentBreakdown = Field(default_factory=SentimentBreakdown)


class InsightSummary(BaseModel):
    """High-level summary metrics and top decision cards."""

    total_submissions: int = 0
    rated_submissions_count: int = 0
    average_rating: float | None = None
    sentiment_breakdown: SentimentBreakdown = Field(default_factory=SentimentBreakdown)
    at_risk_count: int = 0
    has_sample_data: bool = False
    top_negative_driver: ScoreDriverItem | None = None
    top_positive_driver: ScoreDriverItem | None = None


class FeedbackInsightsResponse(BaseModel):
    """Complete insights report for a workspace."""

    model_config = ConfigDict(from_attributes=True)

    summary: InsightSummary
    categories: list[CategoryInsightItem] = Field(default_factory=list)
