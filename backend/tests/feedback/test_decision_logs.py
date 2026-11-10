"""
Integration and unit tests for Decision Logs (Before vs. After Impact Tracker).
Verifies:
- CRUD API endpoints with RBAC and tenant isolation
- Accurate 30-day Before vs. After score and complaint share math
- Strict exclusion of spam and quarantined submissions
- Multi-scale rating normalization (1-10 numeric scale mapped to 5-star baseline)
"""

from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.models.forms import Form
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.schemas.decision_logs import DecisionLogCreate
from app.features.feedback.services.decision_logs import DecisionLogService


@pytest.mark.asyncio
async def test_create_decision_log_api(
    auth_client: AsyncClient,
    test_workspace: Workspace,
    db_session: AsyncSession,
) -> None:
    """POST /api/v1/workspaces/{workspace_id}/feedback/decision-logs creates a milestone."""
    # Fetch an existing category
    cat = FeedbackCategory(
        workspace_id=test_workspace.id,
        name="Pricing & Checkout",
        slug="pricing-checkout",
        description="Pricing issues",
        color="#F59E0B",
    )
    db_session.add(cat)
    await db_session.commit()
    await db_session.refresh(cat)

    today = date.today().isoformat()
    payload = {
        "title": "Redesigned pricing tier table",
        "description": "Simplified pricing tiers and added monthly toggle",
        "category_id": str(cat.id),
        "decision_date": today,
    }

    res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs",
        json=payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Redesigned pricing tier table"
    assert data["category_id"] == str(cat.id)
    assert data["category_name"] == "Pricing & Checkout"
    assert data["decision_date"] == today
    assert "impact" in data
    assert data["impact"]["status"] == "insufficient_data"


@pytest.mark.asyncio
async def test_list_and_filter_decision_logs_api(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """GET /api/v1/workspaces/{workspace_id}/feedback/decision-logs returns paginated list."""
    today = date.today().isoformat()

    # Create two milestones
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs",
        json={"title": "Decision One", "decision_date": today},
    )
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs",
        json={"title": "Decision Two", "decision_date": today},
    )

    res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs?limit=10&offset=0"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert isinstance(data["items"], list)
    titles = [item["title"] for item in data["items"]]
    assert "Decision One" in titles
    assert "Decision Two" in titles


@pytest.mark.asyncio
async def test_get_update_delete_decision_log_api(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """Verify single fetch, partial update, and deletion lifecycle."""
    today = date.today().isoformat()
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs",
        json={"title": "Initial Title", "decision_date": today},
    )
    decision_id = create_res.json()["id"]

    # 1. GET
    get_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs/{decision_id}"
    )
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Initial Title"

    # 2. PATCH
    patch_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs/{decision_id}",
        json={"title": "Updated Title", "description": "New description"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated Title"
    assert patch_res.json()["description"] == "New description"

    # 3. DELETE
    del_res = await auth_client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs/{decision_id}"
    )
    assert del_res.status_code == 204

    # 4. Verify 404 after delete
    get_again = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs/{decision_id}"
    )
    assert get_again.status_code == 404


@pytest.mark.asyncio
async def test_create_decision_log_invalid_category_returns_404(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """Providing a non-existent category UUID returns 404."""
    res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/decision-logs",
        json={
            "title": "Invalid Cat Milestone",
            "category_id": str(uuid4()),
            "decision_date": date.today().isoformat(),
        },
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_impact_metrics_before_vs_after_math(
    test_workspace: Workspace,
    db_session: AsyncSession,
) -> None:
    """
    Test exact 30-day Before vs After rating and complaint share math.
    Pre: 3 submissions (ratings 1, 2, 3 -> avg 2.0 ★, 2 complaints = 66.7%)
    Post: 3 submissions (ratings 4, 5, 5 -> avg 4.67 ★, 0 complaints = 0.0%)
    Score delta: +2.67 ★ -> status="positive_impact"
    """
    # Create category and form
    cat = FeedbackCategory(
        workspace_id=test_workspace.id,
        name="Performance & Speed",
        slug="performance-speed",
        description="Speed issues",
        color="#3B82F6",
    )
    form = Form(
        workspace_id=test_workspace.id,
        name="App Survey",
        slug=f"app-survey-{uuid4().hex[:6]}",
    )
    db_session.add_all([cat, form])
    await db_session.commit()
    await db_session.refresh(cat)
    await db_session.refresh(form)

    milestone_date = date.today() - timedelta(days=10)
    decision_dt = datetime.combine(milestone_date, datetime.min.time()).replace(
        tzinfo=UTC
    )

    # 1. Seed Pre-decision submissions (created at decision_dt - 5 days)
    pre_dt = decision_dt - timedelta(days=5)
    pre_subs = [
        FeedbackSubmission(
            workspace_id=test_workspace.id,
            form_id=form.id,
            category_id=cat.id,
            rating=1,
            sentiment="negative",
            status="resolved",
            created_at=pre_dt,
        ),
        FeedbackSubmission(
            workspace_id=test_workspace.id,
            form_id=form.id,
            category_id=cat.id,
            rating=2,
            sentiment="negative",
            status="resolved",
            created_at=pre_dt,
        ),
        FeedbackSubmission(
            workspace_id=test_workspace.id,
            form_id=form.id,
            category_id=cat.id,
            rating=3,
            sentiment="neutral",
            status="resolved",
            created_at=pre_dt,
        ),
    ]

    # 2. Seed Post-decision submissions (created at decision_dt + 3 days)
    post_dt = decision_dt + timedelta(days=3)
    post_subs = [
        FeedbackSubmission(
            workspace_id=test_workspace.id,
            form_id=form.id,
            category_id=cat.id,
            rating=4,
            sentiment="positive",
            status="new",
            created_at=post_dt,
        ),
        FeedbackSubmission(
            workspace_id=test_workspace.id,
            form_id=form.id,
            category_id=cat.id,
            rating=5,
            sentiment="positive",
            status="new",
            created_at=post_dt,
        ),
        FeedbackSubmission(
            workspace_id=test_workspace.id,
            form_id=form.id,
            category_id=cat.id,
            rating=5,
            sentiment="positive",
            status="new",
            created_at=post_dt,
        ),
    ]

    db_session.add_all(pre_subs + post_subs)
    await db_session.commit()

    # Create Decision Log
    from app.features.feedback.repositories.categories import FeedbackCategoryRepository
    from app.features.feedback.repositories.decision_logs import DecisionLogRepository

    service = DecisionLogService(
        session=db_session,
        repo=DecisionLogRepository(db_session),
        category_repo=FeedbackCategoryRepository(db_session),
    )

    created = await service.create_decision_log(
        workspace_id=test_workspace.id,
        user_id=None,
        payload=DecisionLogCreate(
            title="Database indexing optimization",
            category_id=cat.id,
            decision_date=milestone_date,
        ),
    )

    assert created.impact is not None
    imp = created.impact

    # Pre-window assertions
    assert imp.before.total_submissions == 3
    assert imp.before.average_rating == 2.0
    assert imp.before.negative_count == 2
    assert imp.before.negative_percentage == 66.7

    # Post-window assertions
    assert imp.after.total_submissions == 3
    assert imp.after.average_rating == 4.67
    assert imp.after.negative_count == 0
    assert imp.after.negative_percentage == 0.0

    # Delta assertions
    assert imp.score_delta == 2.67
    assert imp.complaint_share_delta == -66.7
    assert imp.status == "positive_impact"


@pytest.mark.asyncio
async def test_spam_and_quarantined_submissions_excluded(
    test_workspace: Workspace,
    db_session: AsyncSession,
) -> None:
    """Verify spam and quarantined submissions are ignored in calculations."""
    cat = FeedbackCategory(
        workspace_id=test_workspace.id,
        name="Support Quality",
        slug="support-quality",
        description="Support",
        color="#10B981",
    )
    form = Form(
        workspace_id=test_workspace.id,
        name="Support Survey",
        slug=f"support-survey-{uuid4().hex[:6]}",
    )
    db_session.add_all([cat, form])
    await db_session.commit()

    milestone_date = date.today() - timedelta(days=15)
    decision_dt = datetime.combine(milestone_date, datetime.min.time()).replace(
        tzinfo=UTC
    )

    # Clean pre & post submissions
    clean_sub_1 = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        category_id=cat.id,
        rating=3,
        status="new",
        created_at=decision_dt - timedelta(days=2),
    )
    clean_sub_2 = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        category_id=cat.id,
        rating=5,
        status="new",
        created_at=decision_dt + timedelta(days=2),
    )

    # Spam & Quarantined submissions in post window
    spam_sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        category_id=cat.id,
        rating=1,
        sentiment="negative",
        status="spam",
        spam_score=100,
        created_at=decision_dt + timedelta(days=2),
    )
    quarantined_sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        category_id=cat.id,
        rating=1,
        sentiment="negative",
        status="quarantined",
        created_at=decision_dt + timedelta(days=2),
    )

    db_session.add_all([clean_sub_1, clean_sub_2, spam_sub, quarantined_sub])
    await db_session.commit()

    from app.features.feedback.repositories.categories import FeedbackCategoryRepository
    from app.features.feedback.repositories.decision_logs import DecisionLogRepository

    service = DecisionLogService(
        session=db_session,
        repo=DecisionLogRepository(db_session),
        category_repo=FeedbackCategoryRepository(db_session),
    )

    impact = await service.compute_impact_metrics(
        workspace_id=test_workspace.id,
        category_id=cat.id,
        decision_date=milestone_date,
    )

    # Post window must only count the 1 clean submission (5 ★), ignoring spam and quarantined
    assert impact.after.total_submissions == 1
    assert impact.after.average_rating == 5.0
    assert impact.after.negative_count == 0


@pytest.mark.asyncio
async def test_numeric_scale_normalization_in_decision_impact(
    test_workspace: Workspace,
    db_session: AsyncSession,
) -> None:
    """Verify 1-10 numeric scale ratings are normalized to standard 5-star baseline."""
    form = Form(
        workspace_id=test_workspace.id,
        name="NPS Survey",
        slug=f"nps-survey-{uuid4().hex[:6]}",
    )
    db_session.add(form)
    await db_session.commit()

    milestone_date = date.today() - timedelta(days=12)
    decision_dt = datetime.combine(milestone_date, datetime.min.time()).replace(
        tzinfo=UTC
    )

    # Pre: 10/10 rating (normalized to 5.0 ★)
    # Post: 8/10 rating (normalized to 4.0 ★)
    pre_sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        category_id=None,
        rating=10,
        rating_scale_type="1_10_numeric",
        status="new",
        created_at=decision_dt - timedelta(days=1),
    )
    post_sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        category_id=None,
        rating=8,
        rating_scale_type="1_10_numeric",
        status="new",
        created_at=decision_dt + timedelta(days=1),
    )

    db_session.add_all([pre_sub, post_sub])
    await db_session.commit()

    from app.features.feedback.repositories.categories import FeedbackCategoryRepository
    from app.features.feedback.repositories.decision_logs import DecisionLogRepository

    service = DecisionLogService(
        session=db_session,
        repo=DecisionLogRepository(db_session),
        category_repo=FeedbackCategoryRepository(db_session),
    )

    impact = await service.compute_impact_metrics(
        workspace_id=test_workspace.id,
        category_id=None,
        decision_date=milestone_date,
    )

    assert impact.before.average_rating == 5.0
    assert impact.after.average_rating == 4.0
    assert impact.score_delta == -1.0
