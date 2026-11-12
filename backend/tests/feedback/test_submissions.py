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
async def test_submit_feedback_compliant_outcome_support_and_review(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Submitting low score returns support assistance while maintaining FTC-compliant review link.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Compliant Survey",
            "slug": "compliant-survey",
            "outcome_screen": {
                "low_score_title": "We are so sorry",
                "low_score_message": "Our founders are here to help.",
                "low_score_support_text": "Talk to Founder",
                "low_score_support_url": "mailto:founder@example.com",
                "public_review_url": "https://g2.com/products/example",
                "public_review_text": "Leave a G2 Review",
            },
        },
    )
    assert create_res.status_code == 201

    submit_payload = {
        "rating": 1,
        "comment": "System crashed on checkout.",
    }
    res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/compliant-survey/submit",
        json=submit_payload,
    )
    assert res.status_code == 201
    data = res.json()
    outcome = data["outcome"]
    assert outcome["is_high_score"] is False
    assert outcome["support_text"] == "Talk to Founder"
    assert outcome["support_url"] == "mailto:founder@example.com"
    assert outcome["public_review_url"] == "https://g2.com/products/example"
    assert outcome["public_review_text"] == "Leave a G2 Review"


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


@pytest.mark.asyncio
async def test_public_form_allowed_domains_enforcement(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Public forms with allowed_domains reject unauthorized origins/referers with 403,
    while permitting whitelisted domains, wildcards, and platform origins.
    """
    # 1. Create a form restricted to allowed.com and *.partner.org
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Restricted Embed Form",
            "slug": "restricted-embed",
            "allowed_domains": ["allowed.com", "*.partner.org"],
        },
    )
    assert create_res.status_code == 201

    endpoint = f"/api/v1/public/forms/{test_workspace.slug}/restricted-embed"

    # A. Unauthorized domain -> 403
    unauth_get = await client.get(
        endpoint,
        headers={"origin": "https://malicious.com"},
    )
    assert unauth_get.status_code == 403
    assert "not authorized" in unauth_get.json()["detail"].lower()

    unauth_post = await client.post(
        f"{endpoint}/submit",
        json={"rating": 5},
        headers={"origin": "https://malicious.com"},
    )
    assert unauth_post.status_code == 403

    # B. Missing origin/referer when allowed_domains is enforced -> 403
    no_origin_get = await client.get(endpoint)
    assert no_origin_get.status_code == 403

    # C. Whitelisted exact domain -> 200 / 201
    auth_get = await client.get(
        endpoint,
        headers={"origin": "https://allowed.com"},
    )
    assert auth_get.status_code == 200

    auth_post = await client.post(
        f"{endpoint}/submit",
        json={"rating": 5, "comment": "Great widget"},
        headers={"origin": "https://allowed.com"},
    )
    assert auth_post.status_code == 201

    # D. Whitelisted wildcard subdomain -> 200 / 201
    wildcard_get = await client.get(
        endpoint,
        headers={"referer": "https://sub.partner.org/dashboard"},
    )
    assert wildcard_get.status_code == 200

    # E. Platform origin (e.g. localhost:3000 for preview in studio) -> 200
    platform_get = await client.get(
        endpoint,
        headers={"origin": "http://localhost:3000"},
    )
    assert platform_get.status_code == 200


@pytest.mark.asyncio
async def test_public_forms_cors_preflight(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    OPTIONS preflight to /api/v1/public/* returns 204 with permissive CORS headers
    enabling third-party embeds on external websites.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "CORS Test Form", "slug": "cors-test"},
    )
    assert create_res.status_code == 201

    # OPTIONS preflight
    options_res = await client.request(
        "OPTIONS",
        f"/api/v1/public/forms/{test_workspace.slug}/cors-test",
        headers={
            "Origin": "https://external-client.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert options_res.status_code == 204
    assert options_res.headers.get("access-control-allow-origin") == "https://external-client.com"
    assert "GET" in options_res.headers.get("access-control-allow-methods", "")

    # GET response includes access-control-allow-origin
    get_res = await client.get(
        f"/api/v1/public/forms/{test_workspace.slug}/cors-test",
        headers={"Origin": "https://external-client.com"},
    )
    assert get_res.status_code == 200
    assert get_res.headers.get("access-control-allow-origin") == "https://external-client.com"


@pytest.mark.asyncio
async def test_spam_and_quarantined_isolation_and_triage(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
    db_session,
) -> None:
    """
    Spam and quarantined submissions are hidden from the default Inbox ('all') view and Insights,
    surfaced when filtering explicitly by status=spam / status=quarantined, and can be restored via PATCH.
    """
    from app.features.feedback.models.submissions import FeedbackSubmission

    form_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Quarantine Inbox Form", "slug": "quarantine-inbox"},
    )
    assert form_res.status_code == 201
    form_id = form_res.json()["id"]

    # Clean submission via public endpoint
    clean_res = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/quarantine-inbox/submit",
        json={"rating": 5, "comment": "Clean feedback response"},
    )
    assert clean_res.status_code == 201

    # Seed one spam and one quarantined submission directly
    import uuid

    spam_sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=uuid.UUID(form_id),
        rating=1,
        rating_scale_type="5_star",
        comment="Buy backlinks casino bonus",
        status="spam",
        sentiment="negative",
        spam_score=100,
        spam_reasons=["pattern_matched:casino"],
    )
    quarantined_sub = FeedbackSubmission(
        workspace_id=test_workspace.id,
        form_id=uuid.UUID(form_id),
        rating=2,
        rating_scale_type="5_star",
        comment="Needs verification check",
        status="quarantined",
        sentiment="negative",
    )
    db_session.add_all([spam_sub, quarantined_sub])
    await db_session.commit()
    await db_session.refresh(spam_sub)
    await db_session.refresh(quarantined_sub)

    # Default inbox list excludes spam and quarantined
    default_list = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions"
    )
    assert default_list.status_code == 200
    default_ids = {item["id"] for item in default_list.json()["items"]}
    assert clean_res.json()["id"] in default_ids
    assert str(spam_sub.id) not in default_ids
    assert str(quarantined_sub.id) not in default_ids

    # Insights excludes spam & quarantined
    insights_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/insights?days=30"
    )
    assert insights_res.status_code == 200
    assert insights_res.json()["summary"]["average_rating"] == 5.0
    assert insights_res.json()["summary"]["total_submissions"] == 1

    # Explicit status=spam & status=quarantined return held submissions + spam_reasons
    spam_list = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions?status=spam"
    )
    assert spam_list.status_code == 200
    spam_items = spam_list.json()["items"]
    assert any(item["id"] == str(spam_sub.id) for item in spam_items)
    matched_spam = next(i for i in spam_items if i["id"] == str(spam_sub.id))
    assert matched_spam["spam_reasons"] == ["pattern_matched:casino"]

    quarantine_list = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions?status=quarantined"
    )
    assert quarantine_list.status_code == 200
    assert any(
        item["id"] == str(quarantined_sub.id)
        for item in quarantine_list.json()["items"]
    )

    # Restore quarantined submission to 'new' and mark clean submission as 'spam'
    restore_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{quarantined_sub.id}",
        json={"status": "new"},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "new"

    mark_spam_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{clean_res.json()['id']}",
        json={"status": "spam"},
    )
    assert mark_spam_res.status_code == 200
    assert mark_spam_res.json()["status"] == "spam"


@pytest.mark.asyncio
async def test_export_submissions_csv_filtered_and_sanitized(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /api/v1/workspaces/{workspace_id}/feedback/submissions/export
    Exports matching submissions as formula-safe UTF-8 CSV and enforces auth/filters.
    """
    import csv
    import io

    cat_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json={
            "name": "Billing & Pricing",
            "description": "Billing questions",
            "color": "#3B82F6",
            "keywords": ["invoice"],
        },
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Export Form", "slug": "export-form"},
    )

    # 1. Submission matching query & formula injection test
    await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/export-form/submit",
        json={
            "rating": 2,
            "category_pill_label": "Billing & Pricing",
            "comment": "=CMD('calc') invoice issue",
            "customer_name": "+Malicious Name",
            "customer_email": "billing@example.com",
            "customer_metadata": {"source": "qr", "page_url": "https://app.test/billing"},
        },
    )
    # 2. Second submission filtered out by sentiment/category
    res_pos = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/export-form/submit",
        json={
            "rating": 5,
            "comment": "Fast dashboard!",
            "customer_email": "happy@example.com",
        },
    )
    await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/{res_pos.json()['id']}",
        json={"status": "spam"},
    )

    # Unauthenticated request rejected
    unauth_res = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/export"
    )
    assert unauth_res.status_code == 401

    # Filtered CSV export excludes spam and matches category/query
    export_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/export?category_id={cat_id}&query=invoice"
    )
    assert export_res.status_code == 200
    assert export_res.headers["content-type"].startswith("text/csv")
    assert "feedback-submissions.csv" in export_res.headers.get(
        "content-disposition", ""
    )

    rows = list(csv.reader(io.StringIO(export_res.text)))
    assert len(rows) == 2
    header, row = rows[0], rows[1]
    assert header == [
        "id",
        "created_at",
        "status",
        "rating",
        "rating_scale_type",
        "sentiment",
        "category",
        "comment",
        "customer_name",
        "customer_email",
        "source",
        "page_url",
        "referrer",
        "custom_answers",
    ]
    assert row[2] == "new"
    assert row[3] == "2"
    assert row[6] == "Billing & Pricing"
    assert row[7] == "'=CMD('calc') invoice issue"
    assert row[8] == "'+Malicious Name"
    assert row[9] == "billing@example.com"
    assert row[10] == "qr"

    # Explicit status=spam exports spam submissions
    spam_export = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/export?status=spam"
    )
    assert spam_export.status_code == 200
    spam_rows = list(csv.reader(io.StringIO(spam_export.text)))
    assert len(spam_rows) == 2
    assert spam_rows[1][2] == "spam"
    assert spam_rows[1][9] == "happy@example.com"


@pytest.mark.asyncio
async def test_import_submissions_csv_partial_success_and_historical_flags(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
    db_session,
) -> None:
    """
    POST /api/v1/workspaces/{workspace_id}/feedback/submissions/import
    Parses UTF-8 BOM CSV with header aliases, auto-categorizes deterministically,
    reports row-level validation errors with partial success, and marks alert_evaluated_at.
    """
    from sqlalchemy import select

    from app.features.feedback.models.submissions import FeedbackSubmission

    cat_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json={
            "name": "Pricing & Plans",
            "description": "Billing and plan questions",
            "color": "#3B82F6",
            "keywords": ["invoice", "billing"],
        },
    )
    assert cat_res.status_code == 201
    pricing_cat_id = cat_res.json()["id"]

    # Unauthenticated request rejected
    unauth_res = await client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/import",
        json={"paste_lines": ["Great product!"]},
    )
    assert unauth_res.status_code == 401

    csv_payload = "\ufeff" + "\n".join(
        [
            "feedback,stars,email,name,channel,tier,page_url,date",
            "\"Billing invoice failed on renewal\",2,Alice@Example.com,Alice,intercom,Enterprise,https://app.test/billing,2026-08-01T10:00:00Z",
            "\"Invalid rating row\",abc,bob@example.com,Bob,csv_import,Pro,,",
            "\"Bad email row\",4,not-an-email,Carol,csv_import,Pro,,",
            "\"Great communication overall!\",,dave@example.com,Dave,typeform,Starter,https://app.test/dashboard,2026-08-02",
        ]
    )

    import_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/import",
        json={
            "default_source": "csv_import",
            "csv_text": csv_payload,
        },
    )
    assert import_res.status_code == 201
    data = import_res.json()
    assert data["imported_count"] == 2
    assert data["skipped_count"] == 2
    assert data["categorized_count"] == 1
    assert len(data["errors"]) == 2
    assert data["errors"][0]["row_number"] == 3
    assert data["errors"][1]["row_number"] == 4

    stmt = (
        select(FeedbackSubmission)
        .where(FeedbackSubmission.workspace_id == test_workspace.id)
        .order_by(FeedbackSubmission.created_at.asc())
    )
    rows = (await db_session.execute(stmt)).scalars().all()
    assert len(rows) == 2

    first, second = rows
    assert first.comment == "Billing invoice failed on renewal"
    assert first.rating == 2
    assert first.sentiment == "negative"
    assert str(first.category_id) == pricing_cat_id
    assert first.customer_email == "alice@example.com"
    assert first.source == "intercom"
    assert first.customer_metadata["plan_tier"] == "Enterprise"
    assert first.customer_metadata["page_url"] == "https://app.test/billing"
    assert first.triage_state == "done"
    assert first.alert_evaluated_at is not None
    assert first.created_at.year == 2026
    assert first.created_at.month == 8

    assert second.comment == "Great communication overall!"
    assert second.sentiment == "positive"
    assert second.source == "typeform"
    assert second.triage_state == "done"
    assert second.alert_evaluated_at is not None


@pytest.mark.asyncio
async def test_import_submissions_paste_lines_and_empty_error(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /api/v1/workspaces/{workspace_id}/feedback/submissions/import
    Supports pasted lines with default rating and rejects empty payloads with 422.
    """
    empty_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/import",
        json={"csv_text": "   "},
    )
    assert empty_res.status_code == 422

    paste_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/import",
        json={
            "default_source": "manual_paste",
            "default_rating": 4,
            "paste_lines": [
                "Search filters are really fast.",
                "   ",
                "Would love keyboard shortcuts for triage.",
            ],
        },
    )
    assert paste_res.status_code == 201
    body = paste_res.json()
    assert body["imported_count"] == 2
    assert body["skipped_count"] == 0


@pytest.mark.asyncio
async def test_insights_and_submissions_segment_filters(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /feedback/insights, /feedback/submissions, and /feedback/submissions/export
    Support filtering by form_id, source, page_url, and plan_tier, while exposing available_segments.
    """
    form_a_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Web App", "slug": "web-app"},
    )
    assert form_a_res.status_code == 201
    form_a_id = form_a_res.json()["id"]

    form_b_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Billing Portal", "slug": "billing-portal"},
    )
    assert form_b_res.status_code == 201
    form_b_id = form_b_res.json()["id"]

    imp_a = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/import",
        json={
            "form_id": form_a_id,
            "rows": [
                {
                    "comment": "Great onboarding flow",
                    "rating": 5,
                    "source": "widget",
                    "plan_tier": "Pro",
                    "page_url": "https://app.test/onboarding",
                },
                {
                    "comment": "Dark mode works well",
                    "rating": 4,
                    "source": "widget",
                    "plan_tier": "Starter",
                    "page_url": "https://app.test/settings",
                },
            ],
        },
    )
    assert imp_a.status_code == 201

    imp_b = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/import",
        json={
            "form_id": form_b_id,
            "rows": [
                {
                    "comment": "Checkout coupon field broken",
                    "rating": 2,
                    "source": "intercom",
                    "plan_tier": "Enterprise",
                    "page_url": "https://app.test/checkout",
                }
            ],
        },
    )
    assert imp_b.status_code == 201

    # Unfiltered insights expose all distinct segment options
    all_insights = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/insights?days=30"
    )
    assert all_insights.status_code == 200
    all_data = all_insights.json()
    assert all_data["summary"]["total_submissions"] == 3
    assert set(all_data["available_segments"]["sources"]) == {"intercom", "widget"}
    assert set(all_data["available_segments"]["plan_tiers"]) == {
        "Enterprise",
        "Pro",
        "Starter",
    }
    assert set(all_data["available_segments"]["page_urls"]) == {
        "https://app.test/checkout",
        "https://app.test/onboarding",
        "https://app.test/settings",
    }

    # Filter insights by source + plan_tier (case-insensitive)
    filtered_insights = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/insights?days=30&source=widget&plan_tier=pro"
    )
    assert filtered_insights.status_code == 200
    filtered_data = filtered_insights.json()
    assert filtered_data["summary"]["total_submissions"] == 1
    assert filtered_data["summary"]["average_rating"] == 5.0
    # Available segments stay populated across the workspace timeframe
    assert "intercom" in filtered_data["available_segments"]["sources"]

    # Filter insights by form_id + page_url
    checkout_insights = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/insights?days=30&form_id={form_b_id}&page_url=https://app.test/checkout"
    )
    assert checkout_insights.status_code == 200
    assert checkout_insights.json()["summary"]["total_submissions"] == 1
    assert checkout_insights.json()["summary"]["average_rating"] == 2.0

    # List submissions & CSV export respect the same segment query params
    sub_list = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions?plan_tier=enterprise&source=intercom"
    )
    assert sub_list.status_code == 200
    assert sub_list.json()["total"] == 1
    assert sub_list.json()["items"][0]["comment"] == "Checkout coupon field broken"

    csv_export = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/submissions/export?plan_tier=enterprise"
    )
    assert csv_export.status_code == 200
    export_lines = csv_export.text.strip().splitlines()
    assert len(export_lines) == 2
    assert "Checkout coupon field broken" in export_lines[1]

