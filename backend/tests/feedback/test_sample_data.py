"""
Unit tests for Sample Feedback Data loading and clearing.
Verifies sample feedback generation, default form creation, and clean removal.
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.features.auth.models import Workspace
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.models.forms import Form
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.services.insights import InsightsService
from app.features.feedback.services.submissions import SubmissionService


@pytest.mark.asyncio
async def test_load_sample_data_creates_default_form_and_six_submissions():
    workspace_id = uuid4()
    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.add = MagicMock()
    session.get.return_value = mock_ws

    cat1 = FeedbackCategory(
        id=uuid4(),
        workspace_id=workspace_id,
        name="Ease of Use & UX",
        slug="ease-of-use-ux",
        color="#3B82F6",
        is_active=True,
    )
    cat2 = FeedbackCategory(
        id=uuid4(),
        workspace_id=workspace_id,
        name="Pricing & Billing",
        slug="pricing-billing",
        color="#F59E0B",
        is_active=True,
    )

    service = SubmissionService(session)
    service.form_repo = AsyncMock()
    service.category_repo = AsyncMock()
    service.submission_repo = AsyncMock()

    # Initially no forms and no sample submissions
    service.form_repo.list_active.return_value = []
    service.submission_repo.list_sample_submissions.return_value = []
    service.category_repo.list_active.return_value = [cat1, cat2]

    count = await service.load_sample_data(workspace_id)

    assert count == 6
    assert session.add.call_count >= 7  # 1 default form + 6 submissions
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_load_sample_data_idempotent_when_already_loaded():
    workspace_id = uuid4()
    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.add = MagicMock()
    session.get.return_value = mock_ws

    mock_form = MagicMock(spec=Form)
    mock_form.id = uuid4()

    existing_samples = [MagicMock(spec=FeedbackSubmission) for _ in range(6)]

    service = SubmissionService(session)
    service.form_repo = AsyncMock()
    service.category_repo = AsyncMock()
    service.submission_repo = AsyncMock()

    service.form_repo.list_active.return_value = [mock_form]
    service.submission_repo.list_sample_submissions.return_value = existing_samples

    count = await service.load_sample_data(workspace_id)

    assert count == 6
    # No new additions since 6 already exist
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_clear_sample_data():
    workspace_id = uuid4()
    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.add = MagicMock()
    session.get.return_value = mock_ws

    service = SubmissionService(session)
    service.submission_repo = AsyncMock()
    service.submission_repo.delete_sample_submissions.return_value = 6

    deleted = await service.clear_sample_data(workspace_id)

    assert deleted == 6
    service.submission_repo.delete_sample_submissions.assert_awaited_once_with(
        workspace_id
    )
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_insights_detects_has_sample_data():
    workspace_id = uuid4()
    mock_ws = MagicMock(spec=Workspace)
    mock_ws.deleted_at = None

    session = AsyncMock()
    session.add = MagicMock()
    session.get.return_value = mock_ws

    sub_repo = AsyncMock()
    cat_repo = AsyncMock()
    cat_repo.list_active.return_value = []

    sub = MagicMock(spec=FeedbackSubmission)
    sub.workspace_id = workspace_id
    sub.rating = 5
    sub.rating_scale_type = "5_star"
    sub.status = "new"
    sub.sentiment = "positive"
    sub.category_id = None
    sub.customer_metadata = {"is_sample": True}

    sub_repo.list_for_insights.return_value = [sub]

    insights_service = InsightsService(session, sub_repo, cat_repo)
    res = await insights_service.get_insights(workspace_id=workspace_id, days=30)

    assert res.summary.has_sample_data is True
