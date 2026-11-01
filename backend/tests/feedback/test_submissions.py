"""
Integration tests for Feedback Submissions.
"""

import pytest
from httpx import AsyncClient

from app.features.auth.models import Workspace


@pytest.mark.asyncio
async def test_submit_feedback_success_high_score(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /api/v1/public/forms/{workspace_slug}/{form_slug}/submit
    Submitting high score rating returns high-score outcome and CTA.
    """
    # 1. Create a form with custom CTA
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Live Feedback Widget",
            "slug": "live-feedback",
            "title": "Tell us how we did",
            "template_type": "saas",
            "outcome_screen": {
                "high_score_title": "You rock!",
                "high_score_message": "Thanks for being awesome.",
                "high_score_cta_text": "Review on G2",
                "high_score_cta_url": "https://g2.com/products/example",
            },
        },
    )
    assert create_res.status_code == 201

    # 2. Public submission
    submit_payload = {
        "rating": 5,
        "category_pill_label": "Feature Request",
        "comment": "Love the product! Would love dark mode support.",
        "customer_email": "jane@example.com",
        "customer_name": "Jane Doe",
        "customer_metadata": {"page_url": "https://example.com/pricing"},
    }
    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/live-feedback/submit",
        json=submit_payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["rating"] == 5
    assert data["category_pill_label"] == "Feature Request"
    assert data["status"] == "new"
    assert data["workspace_slug"] == test_workspace.slug
    assert data["form_slug"] == "live-feedback"

    # Outcome screen verification
    outcome = data["outcome"]
    assert outcome["is_high_score"] is True
    assert outcome["title"] == "You rock!"
    assert outcome["message"] == "Thanks for being awesome."
    assert outcome["cta_text"] == "Review on G2"
    assert outcome["cta_url"] == "https://g2.com/products/example"


@pytest.mark.asyncio
async def test_submit_feedback_low_score_outcome(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Submitting a rating <= 3 returns low-score apology outcome without promo CTA.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Checkout Exit Survey",
            "slug": "checkout-survey",
            "template_type": "ecommerce",
            "outcome_screen": {
                "low_score_title": "Sorry about the issue",
                "low_score_message": "Our customer support team is looking into this.",
            },
        },
    )
    assert create_res.status_code == 201

    submit_payload = {
        "rating": 2,
        "comment": "Shipping was delayed by 4 days.",
        "customer_email": "john@example.com",
    }
    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/checkout-survey/submit",
        json=submit_payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["rating"] == 2
    outcome = data["outcome"]
    assert outcome["is_high_score"] is False
    assert outcome["title"] == "Sorry about the issue"
    assert outcome["cta_url"] is None


@pytest.mark.asyncio
async def test_submit_feedback_missing_required_rating(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    When rating is required, omitting it should raise 422 Unprocessable Entity.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Mandatory Rating Form",
            "slug": "mandatory-rating",
            "rating_required": True,
        },
    )
    assert create_res.status_code == 201

    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/mandatory-rating/submit",
        json={"comment": "No rating provided"},
    )
    assert res.status_code == 422
    assert "Rating is required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_submit_feedback_rating_out_of_bounds(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Rating must be within the form's scale bounds (e.g. 1 to 5 for 5_star).
    """
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Scale Check Form",
            "slug": "scale-check",
            "rating_scale_type": "5_star",
        },
    )

    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/scale-check/submit",
        json={"rating": 10},
    )
    assert res.status_code == 422
    assert "between 1 and 5" in res.json()["detail"]


@pytest.mark.asyncio
async def test_submit_feedback_missing_required_email(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    When contact field is required, omitting customer_email should raise 422.
    """
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Lead Capture Form",
            "slug": "lead-capture",
            "contact_field_mode": "required",
        },
    )

    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/lead-capture/submit",
        json={"rating": 5, "comment": "Great app"},
    )
    assert res.status_code == 422
    assert "Customer email is required" in res.json()["detail"]


@pytest.mark.asyncio
async def test_submit_feedback_to_inactive_or_missing_form(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Submissions to paused or non-existent forms return 404.
    """
    # Paused form
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Paused Form",
            "slug": "paused-form",
        },
    )
    form_id = create_res.json()["id"]

    # Pause it
    await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms/{form_id}",
        json={"is_active": False},
    )

    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/paused-form/submit",
        json={"rating": 4},
    )
    assert res.status_code == 404

    # Non-existent form
    res_missing = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/does-not-exist/submit",
        json={"rating": 4},
    )
    assert res_missing.status_code == 404

