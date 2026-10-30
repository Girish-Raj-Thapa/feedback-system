import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security.jwt import create_password_reset_token
from app.main import app


@pytest.mark.asyncio
async def test_auth_registration_and_login_flow() -> None:
    transport = ASGITransport(app=app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"

    with patch(
        "app.features.auth.tasks.send_verification_email_task.kiq",
        new_callable=AsyncMock,
    ) as mock_send_verify:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            register_response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": unique_email,
                    "password": "securepassword123",
                    "full_name": "Test User",
                },
            )
            assert register_response.status_code == 201
            reg_data = register_response.json()
            assert reg_data["email"] == unique_email
            assert reg_data["full_name"] == "Test User"
            assert reg_data["is_verified"] is False
            assert "id" in reg_data

            mock_send_verify.assert_awaited_once()
            _, kwargs = mock_send_verify.call_args
            verify_token = kwargs.get("token")
            assert verify_token is not None

            # Prevent duplicate email registration
            duplicate_response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": unique_email,
                    "password": "securepassword123",
                },
            )
            assert duplicate_response.status_code == 409
            assert "already exists" in duplicate_response.json()["error"]

            # Login with valid credentials
            login_response = await client.post(
                "/api/v1/auth/login",
                json={"email": unique_email, "password": "securepassword123"},
            )
            assert login_response.status_code == 200
            tokens = login_response.json()
            access_token = tokens["access_token"]
            refresh_token = tokens["refresh_token"]
            assert access_token and refresh_token

            # Access current user profile
            me_response = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            assert me_response.status_code == 200
            me_data = me_response.json()
            assert me_data["email"] == unique_email
            assert me_data["full_name"] == "Test User"

            # Verify email using the token received from the task
            verify_response = await client.post(
                "/api/v1/auth/verify-email",
                json={"token": verify_token},
            )
            assert verify_response.status_code == 200
            assert "verified successfully" in verify_response.json()["message"]

            # Token reuse prevention
            reused_verify_response = await client.post(
                "/api/v1/auth/verify-email",
                json={"token": verify_token},
            )
            assert reused_verify_response.status_code == 401

            # Refresh token rotation
            refresh_response = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
            )
            assert refresh_response.status_code == 200
            new_tokens = refresh_response.json()
            assert new_tokens["access_token"] != access_token

            # Old refresh token is revoked
            revoked_refresh_response = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
            )
            assert revoked_refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_auth_logout_denylist() -> None:
    transport = ASGITransport(app=app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": "securepassword123"},
        )
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "securepassword123"},
        )
        tokens = login_response.json()
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]

        # Call logout endpoint with access token and refresh token
        logout_response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"refresh_token": refresh_token},
        )
        assert logout_response.status_code == 200

        # Access token must now be rejected
        rejected_me_response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert rejected_me_response.status_code == 401
        assert "revoked" in rejected_me_response.json()["error"]

        # Refresh token must also be rejected
        rejected_refresh_response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert rejected_refresh_response.status_code == 401


@pytest.mark.asyncio
async def test_auth_password_lifecycle_and_profile_update() -> None:
    transport = ASGITransport(app=app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        register_response = await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": "initialpassword123"},
        )
        user_id = register_response.json()["id"]

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "initialpassword123"},
        )
        access_token = login_response.json()["access_token"]

        # Update profile
        update_response = await client.patch(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"full_name": "Updated Name"},
        )
        assert update_response.status_code == 200
        assert update_response.json()["full_name"] == "Updated Name"

        # Change password with wrong old password
        wrong_old_resp = await client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "old_password": "wrongpassword999",
                "new_password": "newpassword12345",
            },
        )
        assert wrong_old_resp.status_code == 401

        # Change password successfully
        change_resp = await client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "old_password": "initialpassword123",
                "new_password": "newpassword12345",
            },
        )
        assert change_resp.status_code == 200

        # Login with new password
        login_new = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "newpassword12345"},
        )
        assert login_new.status_code == 200

        # Password reset flow
        reset_token = create_password_reset_token(subject=user_id)
        reset_response = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "new_password": "resetpassword999"},
        )
        assert reset_response.status_code == 200

        # Reusing reset token must fail
        reused_reset = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "new_password": "anotherpassword"},
        )
        assert reused_reset.status_code == 401

        # Login with reset password
        login_reset = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "resetpassword999"},
        )
        assert login_reset.status_code == 200


@pytest.mark.asyncio
async def test_auth_forgot_password_and_resend_verification() -> None:
    transport = ASGITransport(app=app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"

    with (
        patch(
            "app.features.auth.tasks.send_verification_email_task.kiq",
            new_callable=AsyncMock,
        ) as mock_send_verify,
        patch(
            "app.features.auth.tasks.send_password_reset_email_task.kiq",
            new_callable=AsyncMock,
        ) as mock_send_reset,
    ):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/api/v1/auth/register",
                json={"email": unique_email, "password": "password12345"},
            )
            assert mock_send_verify.await_count == 1

            # Resend verification
            resend_resp = await client.post(
                "/api/v1/auth/resend-verification",
                json={"email": unique_email},
            )
            assert resend_resp.status_code == 200
            assert mock_send_verify.await_count == 2

            # Forgot password
            forgot_resp = await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": unique_email},
            )
            assert forgot_resp.status_code == 200
            assert mock_send_reset.await_count == 1


@pytest.mark.asyncio
async def test_auth_cookie_session_and_account_deletion() -> None:
    transport = ASGITransport(app=app)
    unique_email = f"user_{uuid.uuid4().hex[:8]}@test.com"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register and login
        await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": "securepassword123"},
        )
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "securepassword123"},
        )
        assert login_res.status_code == 200
        assert "ff_session" in login_res.cookies
        assert "access_token" in login_res.cookies

        # Authenticate via cookie without Authorization header
        cookie_client = AsyncClient(
            transport=transport,
            base_url="http://test",
            cookies=login_res.cookies,
        )
        me_res = await cookie_client.get("/api/v1/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["email"] == unique_email

        # Delete account with incorrect password
        bad_del = await cookie_client.request(
            "DELETE",
            "/api/v1/auth/me",
            json={"password": "wrongpassword"},
        )
        assert bad_del.status_code == 401

        # Delete account with correct password
        good_del = await cookie_client.request(
            "DELETE",
            "/api/v1/auth/me",
            json={"password": "securepassword123"},
        )
        assert good_del.status_code == 200

        # Deleted user cannot login or fetch profile
        subsequent_login = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "securepassword123"},
        )
        assert subsequent_login.status_code == 401
