"""
Integration and unit tests for Feedback Forms & Widget Studio.
"""

import pytest
from httpx import AsyncClient

from app.features.auth.models import Workspace


@pytest.mark.asyncio
async def test_list_forms_initially_empty(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /api/v1/workspaces/{workspace_id}/feedback/forms
    """
    response = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_create_form_with_template(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /api/v1/workspaces/{workspace_id}/feedback/forms with template_type="saas"
    """
    payload = {
        "name": "Web App Feedback",
        "template_type": "saas",
    }
    response = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json=payload,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Web App Feedback"
    assert data["slug"] == "web-app-feedback"
    assert data["rating_scale_type"] == "5_star"
    assert data["is_active"] is True
    assert len(data["category_pills"]) >= 4
    assert data["theme_config"]["primary_color"] == "#4249C9"


@pytest.mark.asyncio
async def test_create_form_duplicate_slug_conflict(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Explicitly providing an already-taken slug should raise 409 Conflict.
    """
    payload = {
        "name": "Custom Survey",
        "slug": "custom-survey",
    }
    res1 = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json=payload,
    )
    assert res1.status_code == 201

    res2 = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json=payload,
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_get_and_update_form(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Test GET /forms/{id} and PATCH /forms/{id}
    """
    # 1. Create
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Checkout Prompt",
            "title": "How was checkout?",
            "rating_scale_type": "5_emoji",
        },
    )
    form_id = create_res.json()["id"]

    # 2. Get
    get_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms/{form_id}"
    )
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "How was checkout?"
    assert get_res.json()["rating_scale_type"] == "5_emoji"

    # 3. Patch
    patch_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms/{form_id}",
        json={
            "title": "Rate your checkout experience",
            "theme_config": {"primary_color": "#10B981"},
        },
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Rate your checkout experience"
    assert patch_res.json()["theme_config"]["primary_color"] == "#10B981"


@pytest.mark.asyncio
async def test_duplicate_form(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /forms/{id}/duplicate should clone the form config with a new slug.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Original Form", "template_type": "ecommerce"},
    )
    form_id = create_res.json()["id"]

    dup_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms/{form_id}/duplicate",
        json={"name": "Cloned Form"},
    )
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] != form_id
    assert dup_data["name"] == "Cloned Form"
    assert dup_data["slug"] == "cloned-form"
    assert dup_data["template_type"] == "ecommerce"


@pytest.mark.asyncio
async def test_soft_delete_form(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    DELETE /forms/{id} should soft-delete the form.
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Temporary Form"},
    )
    form_id = create_res.json()["id"]

    del_res = await auth_client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms/{form_id}"
    )
    assert del_res.status_code == 204

    # Getting deleted form returns 404
    get_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms/{form_id}"
    )
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_public_form_endpoint(
    client: AsyncClient,
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /api/v1/public/forms/{workspace_slug}/{form_slug} (Unauthenticated)
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={
            "name": "Public Landing Widget",
            "slug": "landing-feedback",
            "title": "We love your feedback",
            "template_type": "general",
        },
    )
    assert create_res.status_code == 201

    # Call with unauthenticated client
    pub_res = await client.get(
        f"/api/v1/public/forms/{test_workspace.slug}/landing-feedback"
    )
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["slug"] == "landing-feedback"
    assert pub_data["workspace_slug"] == test_workspace.slug
    assert pub_data["workspace_name"] == test_workspace.name
    assert pub_data["title"] == "We love your feedback"
    assert "theme_config" in pub_data

    # Non-existent slug returns 404
    missing_res = await client.get(
        f"/api/v1/public/forms/{test_workspace.slug}/non-existent-form"
    )
    assert missing_res.status_code == 404
