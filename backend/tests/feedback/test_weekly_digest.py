"""
Unit and PostgreSQL integration tests for Module 5.2 Phase 2:
Automated Monday Morning VoC Digest.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationError
from app.features.auth.models import User, Workspace
from app.features.auth.schemas import WorkspaceUpdateRequest
from app.features.auth.services import AuthService
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.models.forms import Form
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.services.weekly_digest import (
    WeeklyDigestService,
    compute_digest_window,
    is_local_monday_morning,
)


def test_is_local_monday_morning_timezone_and_dedup() -> None:
    """Verify local Monday 08:00-08:59 window matching and same-week duplicate guard."""
    # Monday Nov 16, 2026 at 02:30 UTC == 08:15 Asia/Kathmandu (UTC+05:45)
    now_utc = datetime(2026, 11, 16, 2, 30, tzinfo=UTC)

    assert is_local_monday_morning("Asia/Kathmandu", None, now_utc) is True
    assert is_local_monday_morning("UTC", None, now_utc) is False
    assert is_local_monday_morning("America/New_York", None, now_utc) is False

    # Already sent earlier that Monday morning local time -> skipped
    earlier_same_monday = datetime(2026, 11, 16, 2, 16, tzinfo=UTC)
    assert (
        is_local_monday_morning("Asia/Kathmandu", earlier_same_monday, now_utc) is False
    )

    # Sent 7 days earlier (previous Monday) -> allowed this Monday
    last_monday = now_utc - timedelta(days=7)
    assert is_local_monday_morning("Asia/Kathmandu", last_monday, now_utc) is True

    # Invalid timezone falls back safely to UTC (Monday 08:15 UTC)
    monday_8_utc = datetime(2026, 11, 16, 8, 15, tzinfo=UTC)
    assert is_local_monday_morning("Mars/Olympus", None, monday_8_utc) is True


def test_compute_digest_window_calendar_bounds() -> None:
    """Verify exact completed local Mon-Sun 7-day bounds converted cleanly to UTC."""
    now_utc = datetime(2026, 11, 16, 2, 30, tzinfo=UTC)  # Mon 08:15 Asia/Kathmandu
    prior_start, current_start, current_end, label = compute_digest_window(
        "Asia/Kathmandu", now_utc
    )

    # Local midnight in Asia/Kathmandu (UTC+5:45) for Nov 16 is Nov 15 18:15 UTC
    assert current_end == datetime(2026, 11, 15, 18, 15, tzinfo=UTC)
    assert current_start == current_end - timedelta(days=7)
    assert prior_start == current_end - timedelta(days=14)
    assert label == "Nov 09 – Nov 15, 2026"


@pytest.mark.asyncio
async def test_weekly_digest_plan_gating_and_delivery_in_db(
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace,
) -> None:
    """
    Verify:
    1. Free workspace cannot opt into weekly_digest_enabled and is skipped by cron.
    2. Pro workspace at local Monday 08:15 skips empty/sample-only weeks (0 emails).
    3. Pro workspace with real feedback computes exact deltas, Score Drivers, top quotes,
       renders HTML email to Owner, updates last_weekly_digest_at, and avoids duplicates.
    """
    auth_svc = AuthService(db_session)

    # 1. Free plan cannot turn weekly digest on
    with pytest.raises(ValidationError, match="Pro plan"):
        await auth_svc.update_workspace(
            test_workspace.id,
            WorkspaceUpdateRequest(weekly_digest_enabled=True),
            test_user.id,
        )

    # Monday Nov 16, 2026 at 02:30 UTC == 08:15 Asia/Kathmandu
    now_utc = datetime(2026, 11, 16, 2, 30, tzinfo=UTC)
    digest_svc = WeeklyDigestService(db_session)

    # Free workspace -> 0 emails sent even at local Monday 08:15
    test_workspace.timezone = "Asia/Kathmandu"
    await db_session.flush()
    with patch(
        "app.features.feedback.services.weekly_digest.send_email",
        new_callable=AsyncMock,
    ) as mock_send:
        assert await digest_svc.process_due_digests(now_utc=now_utc) == 0
        mock_send.assert_not_called()

    # Promote workspace to Pro & test toggle works
    test_workspace.plan_tier = "pro"
    test_workspace.weekly_digest_enabled = False
    await db_session.flush()
    updated_ws = await auth_svc.update_workspace(
        test_workspace.id,
        WorkspaceUpdateRequest(weekly_digest_enabled=True),
        test_user.id,
    )
    assert updated_ws.weekly_digest_enabled is True

    # Setup form + 2 locked categories
    form = Form(
        workspace_id=test_workspace.id,
        name="Checkout Feedback",
        slug=f"checkout-{uuid4().hex[:6]}",
        is_active=True,
    )
    suffix = uuid4().hex[:6]
    cat_bugs = FeedbackCategory(
        workspace_id=test_workspace.id,
        name=f"Digest Bugs {suffix}",
        slug=f"digest-bugs-{suffix}",
        description="Crashes, checkout errors, and broken flows.",
        color="#ef4444",
    )
    cat_ux = FeedbackCategory(
        workspace_id=test_workspace.id,
        name=f"Digest Delight {suffix}",
        slug=f"digest-delight-{suffix}",
        description="Navigation clarity and workflow speed.",
        color="#10b981",
    )
    db_session.add_all([form, cat_bugs, cat_ux])
    await db_session.flush()

    # 2. Sample-only + spam rows inside current week -> skipped (0 emails)
    _, current_start, current_end, _ = compute_digest_window("Asia/Kathmandu", now_utc)
    db_session.add_all(
        [
            FeedbackSubmission(
                workspace_id=test_workspace.id,
                form_id=form.id,
                category_id=cat_bugs.id,
                rating=1,
                comment="Demo seeded submission",
                customer_metadata={"is_sample": True},
                created_at=current_start + timedelta(hours=4),
            ),
            FeedbackSubmission(
                workspace_id=test_workspace.id,
                form_id=form.id,
                category_id=cat_bugs.id,
                rating=1,
                comment="Buy backlinks casino!",
                status="spam",
                created_at=current_start + timedelta(hours=5),
            ),
        ]
    )
    await db_session.flush()

    with patch(
        "app.features.feedback.services.weekly_digest.send_email",
        new_callable=AsyncMock,
    ) as mock_send:
        assert await digest_svc.process_due_digests(now_utc=now_utc) == 0
        mock_send.assert_not_called()

    # 3. Add real prior-week (1 row, 4.0★) and current-week (3 rows: 1★, 2★ Bugs; 5★ UX)
    db_session.add_all(
        [
            FeedbackSubmission(
                workspace_id=test_workspace.id,
                form_id=form.id,
                category_id=cat_ux.id,
                rating=4,
                sentiment="positive",
                comment="Solid onboarding last week.",
                created_at=current_start - timedelta(days=2),
            ),
            FeedbackSubmission(
                workspace_id=test_workspace.id,
                form_id=form.id,
                category_id=cat_bugs.id,
                rating=1,
                sentiment="negative",
                status="new",
                comment="Payment screen froze at checkout!",
                customer_name="Sita",
                created_at=current_end - timedelta(hours=10),
            ),
            FeedbackSubmission(
                workspace_id=test_workspace.id,
                form_id=form.id,
                category_id=cat_bugs.id,
                rating=2,
                sentiment="negative",
                status="in_progress",
                comment="Coupon button failed on Safari.",
                customer_name="Ram",
                created_at=current_end - timedelta(hours=8),
            ),
            FeedbackSubmission(
                workspace_id=test_workspace.id,
                form_id=form.id,
                category_id=cat_ux.id,
                rating=5,
                sentiment="positive",
                status="resolved",
                comment="Love the clean dashboard layout.",
                customer_name="Mina",
                created_at=current_end - timedelta(hours=5),
            ),
        ]
    )
    await db_session.flush()

    with patch(
        "app.features.feedback.services.weekly_digest.send_email",
        new_callable=AsyncMock,
    ) as mock_send:
        sent = await digest_svc.process_due_digests(now_utc=now_utc)
        assert sent == 1
        mock_send.assert_awaited_once()
        assert mock_send.await_args is not None
        call_kwargs = mock_send.await_args.kwargs
        assert call_kwargs["to_email"] == test_user.email
        assert "3 responses" in call_kwargs["subject"]
        html = call_kwargs["html_content"]
        assert f"Digest Bugs {suffix}" in html
        assert f"Digest Delight {suffix}" in html
        assert "Payment screen froze at checkout!" in html
        assert "+2 vs. prior week" in html
        assert "-1.33 ★ vs. prior week" in html  # avg 2.67 vs 4.00

    # 4. Duplicate run in the same Monday 08:xx hour -> 0 emails sent
    with patch(
        "app.features.feedback.services.weekly_digest.send_email",
        new_callable=AsyncMock,
    ) as mock_send:
        assert (
            await digest_svc.process_due_digests(
                now_utc=now_utc + timedelta(minutes=20)
            )
            == 0
        )
        mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_scheduler_discovers_weekly_digest_cron_task() -> None:
    """Verify TaskiqScheduler registers send_monday_voc_digests_task with hourly cron."""
    import app.features.feedback.tasks  # noqa: F401
    from app.core.tasks import scheduler

    source = scheduler.sources[0]
    await source.startup()
    schedules = await source.get_schedules()
    by_task = {s.task_name: s.cron for s in schedules}

    assert any(
        "send_monday_voc_digests_task" in name and cron == "0 * * * *"
        for name, cron in by_task.items()
    )
