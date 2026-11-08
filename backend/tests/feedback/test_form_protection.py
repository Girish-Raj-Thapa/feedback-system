"""
Tests for public feedback form protection:
- Stateless HMAC form tokens and atomic nonce single-use claims
- Replay attack rejection & idempotency
- Lane C quarantine routing
- Async triage task (spam heuristics, alert suppression for unclean submissions)
"""

import uuid

import pytest
from httpx import AsyncClient

from app.features.auth.models import Workspace
from app.features.feedback.models.submissions import FeedbackSubmission
from app.features.feedback.services.form_token import FormTokenService
from app.features.feedback.tasks import evaluate_spam_heuristics, triage_submission_task


def test_evaluate_spam_heuristics() -> None:
    # Clean text
    is_spam, score, reasons = evaluate_spam_heuristics("I really love the product, great job!")
    assert is_spam is False
    assert score == 0
    assert reasons == []

    # Excessive URLs
    url_spam = "Check out http://one.com http://two.com http://three.com and http://four.com for deals"
    is_spam, score, reasons = evaluate_spam_heuristics(url_spam)
    assert is_spam is True
    assert score == 100
    assert "excessive_urls" in reasons

    # Known spam pattern
    casino_spam = "Get your free casino bonus right now"
    is_spam, score, reasons = evaluate_spam_heuristics(casino_spam)
    assert is_spam is True
    assert score == 100

    # Null byte attack
    null_spam = "Hacked\u0000Text"
    is_spam, score, reasons = evaluate_spam_heuristics(null_spam)
    assert is_spam is True
    assert "null_byte_detected" in reasons


@pytest.mark.asyncio
async def test_form_token_minting_and_submission_success(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /public/forms/{ws}/{slug} returns initial form_token.
    POST /public/forms/{ws}/{slug}/submit with valid form_token succeeds.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Protected Survey", "slug": "protected-survey"},
    )
    assert create_res.status_code == 201

    # 1. Fetch public form
    get_res = await client.get(
        f"/api/v1/public/forms/{test_workspace.slug}/protected-survey"
    )
    assert get_res.status_code == 200
    data = get_res.json()
    assert "form_token" in data
    assert data["form_token"] is not None
    form_token = data["form_token"]

    # 2. Submit with valid form_token
    sub_res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/protected-survey/submit",
        json={
            "rating": 5,
            "comment": "Legitimate customer feedback",
            "form_token": form_token,
        },
    )
    assert sub_res.status_code == 201
    assert sub_res.json()["rating"] == 5


@pytest.mark.asyncio
async def test_form_token_refresh_endpoint(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /public/forms/{ws}/{slug}/token issues a fresh valid HMAC token.
    """
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Refresh Form", "slug": "refresh-form"},
    )

    token_res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/refresh-form/token"
    )
    assert token_res.status_code == 200
    data = token_res.json()
    assert "form_token" in data
    assert data["expires_in"] == 1800


@pytest.mark.asyncio
async def test_form_token_replay_rejected(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    A single-use jti nonce cannot be re-used to submit a second unique feedback.
    A re-attempt with identical token returns the idempotent original response.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Replay Form", "slug": "replay-form"},
    )
    form_id = uuid.UUID(create_res.json()["id"])

    # Mint token manually
    token = FormTokenService.generate_form_token(form_id, test_workspace.id)

    # First submission
    sub1 = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/replay-form/submit",
        json={"rating": 5, "comment": "First try", "form_token": token},
    )
    assert sub1.status_code == 201
    sub1_id = sub1.json()["id"]

    # Retry with same token (idempotent return)
    sub2 = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/replay-form/submit",
        json={"rating": 5, "comment": "First try", "form_token": token},
    )
    assert sub2.status_code == 201
    assert sub2.json()["id"] == sub1_id  # Returns identical submission!


@pytest.mark.asyncio
async def test_form_token_wrong_form_rejected(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    A form token issued for Form A cannot be used on Form B.
    """
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Form A", "slug": "form-a"},
    )
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Form B", "slug": "form-b"},
    )

    # Token for a random UUID
    random_token = FormTokenService.generate_form_token(uuid.uuid4(), test_workspace.id)

    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/form-a/submit",
        json={"rating": 5, "form_token": random_token},
    )
    assert res.status_code == 400
    assert "does not match" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_triage_task_quarantined_skips_alerts(
    db_session,
    test_workspace: Workspace,
) -> None:
    """
    Lane C quarantined submissions remain quarantined and never trigger Slack alerts.
    """
    # Create form
    from app.features.feedback.models.forms import Form
    form = Form(
        workspace_id=test_workspace.id,
        name="Quarantine Form",
        slug="quarantine-form",
        title="Quarantine Test",
        open_feedback_prompt="Prompt",
    )
    db_session.add(form)
    await db_session.commit()
    await db_session.refresh(form)

    # Create quarantined submission
    sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=form.id,
        rating=1,  # Detractor that would normally alert
        comment="Suspicious bot payload",
        status="quarantined",
        trust_level="unverified",
        lane="lane_c",
        source="embed",
        challenge_result="failed",
        triage_state="pending",
    )
    db_session.add(sub)
    await db_session.commit()
    await db_session.refresh(sub)

    # Run triage
    res = await triage_submission_task(str(sub.id))
    assert res is True

    await db_session.refresh(sub)
    assert sub.status == "quarantined"
    assert sub.triage_state == "done"
    # Alerts never evaluated for quarantined submissions
    assert sub.alert_evaluated_at is None
