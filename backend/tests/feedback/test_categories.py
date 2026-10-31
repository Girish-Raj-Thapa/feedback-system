"""
Integration and unit tests for Feedback Categories.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.models import Workspace
from app.features.feedback.services import FeedbackService


@pytest.mark.asyncio
async def test_workspace_creation_auto_seeds_categories(
    test_workspace: Workspace,
    db_session: AsyncSession,
) -> None:
    """
    Verify that creating a workspace automatically initializes default pre-defined categories.
    """
    service = FeedbackService(db_session)
    categories = await service.list_categories(test_workspace.id)

    assert len(categories) >= 7
    uncategorized = [c for c in categories if c.is_uncategorized]
    assert len(uncategorized) == 1
    assert uncategorized[0].name == "Other / Uncategorized"


@pytest.mark.asyncio
async def test_list_categories_endpoint(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    GET /api/v1/workspaces/{workspace_id}/feedback/categories
    """
    response = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories"
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 7

    names = [c["name"] for c in data]
    assert "Other / Uncategorized" in names


@pytest.mark.asyncio
async def test_create_custom_feedback_category(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /api/v1/workspaces/{workspace_id}/feedback/categories
    """
    payload = {
        "name": "Hardware Devices",
        "description": "Feedback related to IoT sensors and physical hardware.",
        "color": "#10B981",
        "icon": "Cpu",
        "keywords": ["hardware", "iot", "sensor", "firmware", "device"],
    }
    response = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json=payload,
    )
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Hardware Devices"
    assert created["slug"] == "hardware-devices"
    assert created["color"] == "#10B981"
    assert created["icon"] == "Cpu"
    assert "hardware" in created["keywords"]
    assert created["is_uncategorized"] is False

    # Duplicate name check -> 409 Conflict
    dup_response = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json=payload,
    )
    assert dup_response.status_code == 409


@pytest.mark.asyncio
async def test_update_feedback_category(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    PATCH /api/v1/workspaces/{workspace_id}/feedback/categories/{category_id}
    """
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json={
            "name": "Security & Auth",
            "description": "Logins, 2FA, and SSO.",
            "color": "#6366F1",
            "icon": "Shield",
            "keywords": ["sso", "saml", "2fa"],
        },
    )
    category_id = create_res.json()["id"]

    patch_res = await auth_client.patch(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories/{category_id}",
        json={
            "color": "#4F46E5",
            "description": "Authentication, SSO, and user security.",
            "keywords": ["sso", "saml", "2fa", "oauth"],
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["color"] == "#4F46E5"
    assert updated["description"] == "Authentication, SSO, and user security."
    assert "oauth" in updated["keywords"]


@pytest.mark.asyncio
async def test_delete_category_and_protection(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    DELETE /api/v1/workspaces/{workspace_id}/feedback/categories/{category_id}
    Custom category can be deleted; uncategorized is protected.
    """
    # 1. Create a custom category and delete it
    create_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories",
        json={
            "name": "Temporary Category",
            "description": "To be deleted.",
            "color": "#EF4444",
        },
    )
    category_id = create_res.json()["id"]

    del_res = await auth_client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories/{category_id}"
    )
    assert del_res.status_code == 204

    # Verify not in list
    list_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories"
    )
    ids = [c["id"] for c in list_res.json()]
    assert category_id not in ids

    # 2. Try deleting the Uncategorized category -> should fail
    uncat = next(c for c in list_res.json() if c["is_uncategorized"])
    del_uncat_res = await auth_client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories/{uncat['id']}"
    )
    assert del_uncat_res.status_code == 422


@pytest.mark.asyncio
async def test_reorder_categories(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /api/v1/workspaces/{workspace_id}/feedback/categories/reorder
    """
    list_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories"
    )
    categories = list_res.json()
    first_two = categories[:2]

    reorder_payload = {
        "items": [
            {"id": first_two[0]["id"], "display_order": 100},
            {"id": first_two[1]["id"], "display_order": 1},
        ]
    }
    reorder_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories/reorder",
        json=reorder_payload,
    )
    assert reorder_res.status_code == 200

    new_list = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories"
    )
    new_categories = new_list.json()
    c1 = next(c for c in new_categories if c["id"] == first_two[0]["id"])
    c2 = next(c for c in new_categories if c["id"] == first_two[1]["id"])
    assert c1["display_order"] == 100
    assert c2["display_order"] == 1


@pytest.mark.asyncio
async def test_reseed_categories_from_industry(
    auth_client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    POST /api/v1/workspaces/{workspace_id}/feedback/categories/seed
    """
    seed_res = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories/seed",
        json={
            "industry": "E-commerce",
            "force_reset": True,
        },
    )
    assert seed_res.status_code == 200
    data = seed_res.json()
    names = [c["name"] for c in data]

    assert "Shipping & Delivery" in names
    assert "Website & Checkout" in names
    assert "Other / Uncategorized" in names


@pytest.mark.asyncio
async def test_unauthorized_user_cannot_access_categories(
    client: AsyncClient,
    test_workspace: Workspace,
) -> None:
    """
    Unauthenticated request is rejected.
    """
    res = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/categories"
    )
    assert res.status_code in [401, 403]
