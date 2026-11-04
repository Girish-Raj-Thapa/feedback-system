"""
Unit tests for Feedback Insights & Score Drivers service math.
Verifies aggregation, normalization, sentiment breakdown, and driver detection.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.features.auth.models import Workspace
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.models.submissions import FeedbackSubmission
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
    sub_repo.list_for_insights.return_value = []

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

    # Submissions:
    # Cat 1 has two ratings: 1 star and 2 stars -> avg = 1.5
    # Cat 2 has two ratings: 5 stars and 5 stars -> avg = 5.0
    # Overall average = (1 + 2 + 5 + 5) / 4 = 3.25
    # Cat 1 score impact = 1.5 - 3.25 = -1.75 (Top Negative Driver)
    # Cat 2 score impact = 5.0 - 3.25 = +1.75 (Top Positive Driver)
    s1 = MagicMock(spec=FeedbackSubmission)
    s1.id = uuid4()
    s1.category_id = cat1_id
    s1.rating = 1
    s1.rating_scale_type = "5_star"
    s1.sentiment = "negative"
    s1.status = "new"

    s2 = MagicMock(spec=FeedbackSubmission)
    s2.id = uuid4()
    s2.category_id = cat1_id
    s2.rating = 2
    s2.rating_scale_type = "5_star"
    s2.sentiment = "negative"
    s2.status = "in_progress"

    s3 = MagicMock(spec=FeedbackSubmission)
    s3.id = uuid4()
    s3.category_id = cat2_id
    s3.rating = 5
    s3.rating_scale_type = "5_star"
    s3.sentiment = "positive"
    s3.status = "new"

    s4 = MagicMock(spec=FeedbackSubmission)
    s4.id = uuid4()
    s4.category_id = cat2_id
    s4.rating = 5
    s4.rating_scale_type = "5_star"
    s4.sentiment = "positive"
    s4.status = "resolved"

    sub_repo = AsyncMock()
    sub_repo.list_for_insights.return_value = [s1, s2, s3, s4]

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

