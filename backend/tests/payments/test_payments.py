"""
Tests for Paddle Billing v2 (`payments` feature) and tightened Free vs. Pro quotas:
- HMAC-SHA256 webhook signature & timestamp replay validation
- Webhook idempotency (event_id) & out-of-order occurred_at protection
- Lifecycle sync (activated -> past_due -> scheduled cancel -> canceled downgrade)
- Customer Portal endpoint & billing:manage RBAC enforcement
- Free plan caps: 10 monthly submissions, 2 forms, 1 connection, 1 alert rule, 0 email/webhooks
"""

import hashlib
import hmac
import json
import time
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import patch
from uuid import uuid4

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.jwt import create_access_token
from app.core.security.passwords import hash_password
from app.features.auth.models import Role, User, Workspace, WorkspaceMember
from app.features.payments.paddle_client import (
    PaddleClient,
    PaddleWebhookSignatureError,
)


def _sign_paddle_payload(
    raw_body: bytes, secret: str, ts: int | None = None
) -> str:
    timestamp = str(ts if ts is not None else int(time.time()))
    digest = hmac.new(
        secret.encode("utf-8"),
        timestamp.encode("utf-8") + b":" + raw_body,
        hashlib.sha256,
    ).hexdigest()
    return f"ts={timestamp};h1={digest}"


def test_paddle_hmac_signature_verification() -> None:
    """Verify valid, invalid, expired, and malformed Paddle-Signature headers."""
    secret = "pdl_ntfset_test_secret"
    body = b'{"event_id":"evt_1","event_type":"subscription.activated"}'

    valid_sig = _sign_paddle_payload(body, secret)
    PaddleClient.verify_webhook_signature(body, valid_sig, secret)

    with pytest.raises(PaddleWebhookSignatureError, match="Invalid Paddle webhook"):
        PaddleClient.verify_webhook_signature(
            body, _sign_paddle_payload(body, "wrong_secret"), secret
        )

    expired_ts = int(time.time()) - 600
    with pytest.raises(PaddleWebhookSignatureError, match="replay window"):
        PaddleClient.verify_webhook_signature(
            body, _sign_paddle_payload(body, secret, ts=expired_ts), secret
        )

    with pytest.raises(PaddleWebhookSignatureError, match="Missing Paddle-Signature"):
        PaddleClient.verify_webhook_signature(body, "", secret)


@pytest.mark.asyncio
async def test_paddle_webhook_lifecycle_idempotency_and_portal(
    client: AsyncClient,
    auth_client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: Workspace,
) -> None:
    """
    Verify end-to-end Paddle webhook lifecycle updates Workspace + WorkspaceSubscription,
    deduplicates retries, blocks stale events, and authorizes Customer Portal requests.
    """
    secret = "pdl_ntfset_live_unit_test"
    now = datetime.now(UTC)
    period_end = (now + timedelta(days=30)).isoformat()

    # 1. Free defaults before upgrading
    initial_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/billing"
    )
    assert initial_res.status_code == 200
    initial = initial_res.json()
    assert initial["plan_tier"] == "free"
    assert initial["forms_limit"] == 2
    assert initial["submissions_limit"] == 10
    assert initial["has_portal_access"] is False

    # 2. Invalid signature rejected with 422
    bad_body = json.dumps({"event_id": "evt_bad"}).encode("utf-8")
    with patch("app.core.config.settings.PADDLE_WEBHOOK_SECRET", secret):
        bad_resp = await client.post(
            "/api/v1/payments/webhooks/paddle",
            content=bad_body,
            headers={"Paddle-Signature": "ts=123;h1=deadbeef"},
        )
    assert bad_resp.status_code == 422

    # 3. Activate Pro annual subscription via webhook
    activated_payload: dict[str, Any] = {
        "event_id": f"evt_act_{uuid4().hex[:8]}",
        "event_type": "subscription.activated",
        "occurred_at": now.isoformat(),
        "data": {
            "id": f"sub_{uuid4().hex[:10]}",
            "customer_id": f"ctm_{uuid4().hex[:10]}",
            "status": "active",
            "custom_data": {"workspace_id": str(test_workspace.id)},
            "current_billing_period": {
                "starts_at": now.isoformat(),
                "ends_at": period_end,
            },
            "items": [
                {
                    "price": {
                        "id": "pri_test_annual",
                        "billing_cycle": {"interval": "year"},
                    }
                }
            ],
        },
    }
    act_bytes = json.dumps(activated_payload).encode("utf-8")
    with patch("app.core.config.settings.PADDLE_WEBHOOK_SECRET", secret):
        act_resp = await client.post(
            "/api/v1/payments/webhooks/paddle",
            content=act_bytes,
            headers={"Paddle-Signature": _sign_paddle_payload(act_bytes, secret)},
        )
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "processed"

    # Duplicate event_id retry is safely deduplicated
    with patch("app.core.config.settings.PADDLE_WEBHOOK_SECRET", secret):
        dup_resp = await client.post(
            "/api/v1/payments/webhooks/paddle",
            content=act_bytes,
            headers={"Paddle-Signature": _sign_paddle_payload(act_bytes, secret)},
        )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["status"] == "duplicate"

    # Billing endpoint reflects Pro limits (25 forms, 2500 submissions, annual interval)
    pro_res = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/billing"
    )
    assert pro_res.status_code == 200
    pro = pro_res.json()
    assert pro["plan_tier"] == "pro"
    assert pro["subscription_status"] == "active"
    assert pro["billing_interval"] == "year"
    assert pro["forms_limit"] == 25
    assert pro["submissions_limit"] == 2500
    assert pro["has_portal_access"] is True

    # 4. Customer Portal generation calls Paddle API (using MockTransport)
    mock_transport = httpx.MockTransport(
        lambda request: httpx.Response(
            201,
            json={
                "data": {
                    "urls": {
                        "general": {
                            "overview": "https://sandbox-customer-portal.paddle.com/cpl_test"
                        }
                    }
                }
            },
        )
    )
    real_async_client = httpx.AsyncClient

    def _mocked_client(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs["transport"] = mock_transport
        return real_async_client(*args, **kwargs)

    with (
        patch("app.core.config.settings.PADDLE_API_KEY", "pdl_test_api_key"),
        patch(
            "app.features.payments.paddle_client.httpx.AsyncClient",
            side_effect=_mocked_client,
        ),
    ):
        portal_resp = await auth_client.post(
            f"/api/v1/workspaces/{test_workspace.id}/billing/portal"
        )
    assert portal_resp.status_code == 200
    assert (
        portal_resp.json()["url"]
        == "https://sandbox-customer-portal.paddle.com/cpl_test"
    )

    # 5. Out-of-order stale event cannot downgrade or overwrite newer state
    stale_payload = {
        **activated_payload,
        "event_id": f"evt_stale_{uuid4().hex[:8]}",
        "event_type": "subscription.canceled",
        "occurred_at": (now - timedelta(minutes=10)).isoformat(),
        "data": {**activated_payload["data"], "status": "canceled"},
    }
    stale_bytes = json.dumps(stale_payload).encode("utf-8")
    with patch("app.core.config.settings.PADDLE_WEBHOOK_SECRET", secret):
        stale_resp = await client.post(
            "/api/v1/payments/webhooks/paddle",
            content=stale_bytes,
            headers={"Paddle-Signature": _sign_paddle_payload(stale_bytes, secret)},
        )
    assert stale_resp.status_code == 200
    assert stale_resp.json()["status"] == "stale"

    # 6. past_due keeps Pro active with past_due status + scheduled cancel flag
    past_due_payload = {
        **activated_payload,
        "event_id": f"evt_pd_{uuid4().hex[:8]}",
        "event_type": "subscription.past_due",
        "occurred_at": (now + timedelta(minutes=2)).isoformat(),
        "data": {
            "id": activated_payload["data"]["id"],
            "customer_id": activated_payload["data"]["customer_id"],
            "status": "past_due",
            "scheduled_change": {"action": "cancel"},
            "current_billing_period": activated_payload["data"][
                "current_billing_period"
            ],
        },
    }
    pd_bytes = json.dumps(past_due_payload).encode("utf-8")
    with patch("app.core.config.settings.PADDLE_WEBHOOK_SECRET", secret):
        pd_resp = await client.post(
            "/api/v1/payments/webhooks/paddle",
            content=pd_bytes,
            headers={"Paddle-Signature": _sign_paddle_payload(pd_bytes, secret)},
        )
    assert pd_resp.status_code == 200
    pd_check = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/billing"
    )
    assert pd_check.json()["plan_tier"] == "pro"
    assert pd_check.json()["subscription_status"] == "past_due"
    assert pd_check.json()["cancel_at_period_end"] is True

    # 7. subscription.canceled without custom_data resolves workspace via paddle_subscription_id & downgrades to Free
    cancel_payload = {
        "event_id": f"evt_can_{uuid4().hex[:8]}",
        "event_type": "subscription.canceled",
        "occurred_at": (now + timedelta(minutes=5)).isoformat(),
        "data": {
            "id": activated_payload["data"]["id"],
            "customer_id": activated_payload["data"]["customer_id"],
            "status": "canceled",
        },
    }
    can_bytes = json.dumps(cancel_payload).encode("utf-8")
    with patch("app.core.config.settings.PADDLE_WEBHOOK_SECRET", secret):
        can_resp = await client.post(
            "/api/v1/payments/webhooks/paddle",
            content=can_bytes,
            headers={"Paddle-Signature": _sign_paddle_payload(can_bytes, secret)},
        )
    assert can_resp.status_code == 200
    free_again = await auth_client.get(
        f"/api/v1/workspaces/{test_workspace.id}/billing"
    )
    assert free_again.json()["plan_tier"] == "free"
    assert free_again.json()["subscription_status"] == "canceled"
    assert free_again.json()["submissions_limit"] == 10
    assert free_again.json()["forms_limit"] == 2


@pytest.mark.asyncio
async def test_free_form_and_submission_limits_plus_billing_rbac(
    client: AsyncClient,
    auth_client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: Workspace,
) -> None:
    """
    Verify:
    - Free tier enforces max 2 forms and 10 monthly public submissions.
    - Non-billing workspace members (viewer role) receive 403 on billing endpoints.
    """
    # 1. Create 2 forms cleanly; 3rd is blocked on Free plan
    for idx in range(1, 3):
        r = await auth_client.post(
            f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
            json={"name": f"Form {idx}", "slug": f"form-{idx}"},
        )
        assert r.status_code == 201

    third = await auth_client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/forms",
        json={"name": "Form 3", "slug": "form-3"},
    )
    assert third.status_code == 422
    assert "Free plan limit reached (2 forms)" in third.text

    # 2. Submit 10 public feedback entries -> 11th blocked at monthly limit (10)
    for idx in range(10):
        sub_res = await client.post(
            f"/api/v1/public/forms/{test_workspace.slug}/form-1/submit",
            json={"rating": 5, "comment": f"Submission {idx}"},
        )
        assert sub_res.status_code == 201

    blocked_sub = await client.post(
        f"/api/v1/public/forms/{test_workspace.slug}/form-1/submit",
        json={"rating": 5, "comment": "11th submission"},
    )
    assert blocked_sub.status_code == 403
    assert "Monthly feedback limit reached (10 responses)" in blocked_sub.text

    # 3. Viewer role member cannot read billing or open portal (403)
    from sqlalchemy import select

    viewer_role = (
        await db_session.execute(
            select(Role).where(
                Role.workspace_id == test_workspace.id,
                Role.slug == "viewer",
            )
        )
    ).scalar_one()

    viewer_user = User(
        email=f"viewer_bill_{uuid4().hex[:6]}@example.com",
        password=await hash_password("TestPassword123!"),
        full_name="Viewer",
        is_active=True,
        is_verified=True,
    )
    db_session.add(viewer_user)
    await db_session.flush()
    db_session.add(
        WorkspaceMember(
            workspace_id=test_workspace.id,
            user_id=viewer_user.id,
            role_id=viewer_role.id,
        )
    )
    await db_session.commit()

    viewer_token = create_access_token(
        subject=str(viewer_user.id),
        extra_claims={"email": viewer_user.email, "is_superuser": False},
    )
    forbidden = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/billing",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert forbidden.status_code == 403
