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
    assert data["sentiment"] == "positive"
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
    assert data["sentiment"] == "negative"
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


@pytest.mark.asyncio
async def test_list_workspace_submissions(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /api/v1/workspaces/{workspace_id}/feedback/submissions
    Workspace members can view paginated feedback submissions.
    """
    # 1. Create form & submit a feedback item
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Inbox Test Form",
            "slug": "inbox-test",
        },
    )
    await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/inbox-test/submit",
        json={
            "rating": 5,
            "comment": "Outstanding platform!",
            "customer_email": "inbox.user@example.com",
            "customer_name": "Inbox User",
        },
    )

    # 2. Query submissions list with authenticated workspace admin
    list_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions"
    )
    assert list_res.status_code == 200
    page_data = list_res.json()
    assert "items" in page_data
    assert "total" in page_data
    assert page_data["total"] >= 1
    assert page_data["limit"] == 20
    assert page_data["offset"] == 0

    first_item = page_data["items"][0]
    assert first_item["rating"] == 5
    assert first_item["comment"] == "Outstanding platform!"
    assert first_item["customer_email"] == "inbox.user@example.com"
    assert first_item["customer_name"] == "Inbox User"
    assert first_item["status"] == "new"

    # 3. Unauthenticated request should be rejected
    unauth_res = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions"
    )
    assert unauth_res.status_code == 401

    # 4. Get single submission by ID
    submission_id = first_item["id"]
    get_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{submission_id}"
    )
    assert get_res.status_code == 200
    assert get_res.json()["id"] == submission_id
    assert get_res.json()["customer_email"] == "inbox.user@example.com"

    # 5. Non-existent submission ID returns 404
    missing_id_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/00000000-0000-0000-0000-000000000000"
    )
    assert missing_id_res.status_code == 404


@pytest.mark.asyncio
async def test_update_submission_status(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    PATCH /api/v1/workspaces/{workspace_id}/feedback/submissions/{submission_id}
    Tests triaging submission status between new, reviewed, and archived.
    """
    # 1. Setup form and feedback submission
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Triage Form", "slug": "triage-form"},
    )
    submit_res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/triage-form/submit",
        json={"rating": 3, "comment": "Needs quicker response time."},
    )
    submission_id = submit_res.json()["id"]

    # 2. Mark as reviewed
    patch_reviewed = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{submission_id}",
        json={"status": "reviewed"},
    )
    assert patch_reviewed.status_code == 200
    assert patch_reviewed.json()["status"] == "reviewed"

    # Verify via GET
    get_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{submission_id}"
    )
    assert get_res.json()["status"] == "reviewed"

    # 3. Mark as archived
    patch_archived = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{submission_id}",
        json={"status": "archived"},
    )
    assert patch_archived.status_code == 200
    assert patch_archived.json()["status"] == "archived"

    # 4. Reject invalid status
    invalid_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{submission_id}",
        json={"status": "invalid_status"},
    )
    assert invalid_res.status_code == 422

    # 5. Reject unauthenticated update
    unauth_res = await client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{submission_id}",
        json={"status": "reviewed"},
    )
    assert unauth_res.status_code == 401

    # 6. Non-existent submission returns 404
    missing_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/00000000-0000-0000-0000-000000000000",
        json={"status": "reviewed"},
    )
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_auto_keyword_categorization_and_sentiment(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Submitting feedback without a pill automatically matches category keywords
    and assigns sentiment.
    """
    # 1. Create a category with keywords
    cat_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json={
            "name": "Bugs & Issues",
            "description": "Technical bugs and errors",
            "color": "#EF4444",
            "keywords": ["crash", "freezes", "bug"],
        },
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # 2. Create form
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Auto Categorize Form", "slug": "auto-cat-form"},
    )

    # 3. Submit feedback without category pill
    submit_res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/auto-cat-form/submit",
        json={
            "comment": "The app suddenly freezes on checkout, huge bug!",
            "rating": 1,
        },
    )
    assert submit_res.status_code == 201
    data = submit_res.json()
    assert data["category_id"] == cat_id
    assert data["category_pill_label"] == "Bugs & Issues"
    assert data["sentiment"] == "negative"


@pytest.mark.asyncio
async def test_get_customer_history(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /api/v1/workspaces/{workspace_id}/feedback/submissions/{submission_id}/customer-history
    Returns all previous submissions and metrics for the same customer email.
    """
    # 1. Create form
    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "History Form", "slug": "history-form"},
    )

    # 2. Submit 2 feedbacks from sarah@example.com
    await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/history-form/submit",
        json={
            "customer_email": "sarah@example.com",
            "customer_name": "Sarah Connor",
            "rating": 5,
            "comment": "First submission, love it!",
        },
    )
    sub2 = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/history-form/submit",
        json={
            "customer_email": "sarah@example.com",
            "rating": 3,
            "comment": "Second submission, a bit slower today.",
        },
    )
    sub2_id = sub2.json()["id"]

    # 3. Fetch customer history
    history_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{sub2_id}/customer-history"
    )
    assert history_res.status_code == 200
    data = history_res.json()
    assert data["customer_email"] == "sarah@example.com"
    assert data["customer_name"] == "Sarah Connor"
    assert data["total_submissions"] == 2
    assert data["avg_rating"] == 4.0
    assert len(data["submissions"]) == 2
