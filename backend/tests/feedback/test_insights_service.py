"""
Unit tests for Feedback Insights & Score Drivers service math.
Verifies aggregation, normalization, sentiment breakdown, and driver detection.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.features.auth.models import Workspace
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.repositories.submissions import CategoryInsightAggregate
from app.features.feedback.services.insights import InsightsService, _normalize_rating


def test_normalize_rating():
    assert _normalize_rating(5, "5_star") == 5.0
    assert _normalize_rating(4, "5_emoji") == 4.0
    assert _normalize_rating(10, "1_10_numeric") == 5.0
    assert _normalize_rating(8, "1_10_numeric") == 4.0
    assert _normalize_rating(5, "1_10_numeric") == 2.5


@pytest.mark.asyncio
async def test_get_insights_zero_submissions():
    workspace_id = uuid4()
    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.get.return_value = mock_ws

    sub_repo = AsyncMock()
    sub_repo.aggregate_for_insights.return_value = []
    sub_repo.list_segment_options.return_value = ([], [], [])

    cat_repo = AsyncMock()
    cat_repo.list_active.return_value = []

    service = InsightsService(session, sub_repo, cat_repo)
    res = await service.get_insights(workspace_id=workspace_id, days=30)

    assert res.summary.total_submissions == 0
    assert res.summary.rated_submissions_count == 0
    assert res.summary.average_rating is None
    assert res.summary.at_risk_count == 0
    assert res.summary.top_negative_driver is None
    assert res.summary.top_positive_driver is None
    assert res.categories == []


@pytest.mark.asyncio
async def test_get_insights_score_drivers_calculation():
    workspace_id = uuid4()
    cat1_id = uuid4()
    cat2_id = uuid4()

    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.get.return_value = mock_ws

    # Category 1: Bug Reports (Poor satisfaction)
    cat1 = MagicMock(spec=FeedbackCategory)
    cat1.id = cat1_id
    cat1.name = "Bugs & Errors"
    cat1.color = "#EF4444"
    cat1.icon = None

    # Category 2: UI & Features (High satisfaction)
    cat2 = MagicMock(spec=FeedbackCategory)
    cat2.id = cat2_id
    cat2.name = "Design & Speed"
    cat2.color = "#10B981"
    cat2.icon = None

    # Aggregated category stats:
    # Cat 1 has two ratings: 1 star and 2 stars -> sum=3.0, count=2, avg = 1.5
    # Cat 2 has two ratings: 5 stars and 5 stars -> sum=10.0, count=2, avg = 5.0
    # Overall average = (3.0 + 10.0) / 4 = 3.25
    # Cat 1 score impact = 1.5 - 3.25 = -1.75 (Top Negative Driver)
    # Cat 2 score impact = 5.0 - 3.25 = +1.75 (Top Positive Driver)
    sub_repo = AsyncMock()
    sub_repo.aggregate_for_insights.return_value = [
        CategoryInsightAggregate(
            category_id=cat1_id,
            total_count=2,
            rated_count=2,
            normalized_rating_sum=3.0,
            positive_count=0,
            neutral_count=0,
            negative_count=2,
            at_risk_count=2,
            sample_count=0,
        ),
        CategoryInsightAggregate(
            category_id=cat2_id,
            total_count=2,
            rated_count=2,
            normalized_rating_sum=10.0,
            positive_count=2,
            neutral_count=0,
            negative_count=0,
            at_risk_count=0,
            sample_count=0,
        ),
    ]
    sub_repo.list_segment_options.return_value = ([], [], [])

    cat_repo = AsyncMock()
    cat_repo.list_active.return_value = [cat1, cat2]

    service = InsightsService(session, sub_repo, cat_repo)
    res = await service.get_insights(workspace_id=workspace_id, days=30)

    assert res.summary.total_submissions == 4
    assert res.summary.rated_submissions_count == 4
    assert res.summary.average_rating == 3.25

    # Sentiment Breakdown
    assert res.summary.sentiment_breakdown.positive == 2
    assert res.summary.sentiment_breakdown.negative == 2
    assert res.summary.sentiment_breakdown.neutral == 0

    # At-risk count (s1 and s2 are unresolved with rating <= 2)
    assert res.summary.at_risk_count == 2

    # Top Negative Driver
    assert res.summary.top_negative_driver is not None
    assert res.summary.top_negative_driver.category_id == cat1_id
    assert res.summary.top_negative_driver.category_name == "Bugs & Errors"
    assert res.summary.top_negative_driver.average_rating == 1.5
    assert res.summary.top_negative_driver.score_impact == -1.75

    # Top Positive Driver
    assert res.summary.top_positive_driver is not None
    assert res.summary.top_positive_driver.category_id == cat2_id
    assert res.summary.top_positive_driver.category_name == "Design & Speed"
    assert res.summary.top_positive_driver.average_rating == 5.0
    assert res.summary.top_positive_driver.score_impact == 1.75


@pytest.mark.asyncio
async def test_get_insights_forwards_segment_filters_and_returns_available_segments():
    workspace_id = uuid4()
    form_id = uuid4()
    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.get.return_value = mock_ws

    sub_repo = AsyncMock()
    sub_repo.aggregate_for_insights.return_value = []
    sub_repo.list_segment_options.return_value = (
        ["csv_import", "widget"],
        ["https://app.example.com/pricing"],
        ["enterprise", "pro"],
    )

    cat_repo = AsyncMock()
    cat_repo.list_active.return_value = []

    service = InsightsService(session, sub_repo, cat_repo)
    res = await service.get_insights(
        workspace_id=workspace_id,
        days=0,
        form_id=form_id,
        source="widget",
        page_url="https://app.example.com/pricing",
        plan_tier="pro",
    )

    sub_repo.aggregate_for_insights.assert_awaited_once_with(
        workspace_id=workspace_id,
        since=None,
        form_id=form_id,
        source="widget",
        page_url="https://app.example.com/pricing",
        plan_tier="pro",
    )
    sub_repo.list_segment_options.assert_awaited_once_with(
        workspace_id=workspace_id,
        since=None,
    )
    assert res.available_segments.sources == ["csv_import", "widget"]
    assert res.available_segments.page_urls == ["https://app.example.com/pricing"]
    assert res.available_segments.plan_tiers == ["enterprise", "pro"]

