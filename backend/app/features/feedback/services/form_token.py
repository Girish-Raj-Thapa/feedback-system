"""
Cryptographic HMAC form token and single-use nonce service.
Provides replay resistance, CSRF protection, and DDoS mitigation for public forms.
"""

import time
import uuid
from typing import Any
from uuid import UUID

import jwt
from fastapi import HTTPException, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.features.feedback.services.form_token")

FORM_TOKEN_TTL_SECONDS = 1800  # 30 minutes
NONCE_PENDING_TTL_SECONDS = 1800  # 30 minutes
IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours


class FormTokenService:
    @staticmethod
    def generate_form_token(
        form_id: UUID,
        workspace_id: UUID,
        ttl_seconds: int = FORM_TOKEN_TTL_SECONDS,
    ) -> str:
        """
        Mint a stateless HMAC-signed form token containing a unique jti nonce.
        Writing to DB/Redis is deferred until submission time, making token issuance O(1).
        """
        now = int(time.time())
        jti = uuid.uuid4().hex
        claims: dict[str, Any] = {
            "sub": "form_token",
            "form_id": str(form_id),
            "workspace_id": str(workspace_id),
            "jti": jti,
            "iat": now,
            "exp": now + ttl_seconds,
        }
        return jwt.encode(
            claims,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def verify_form_token(
        token: str,
        expected_form_id: UUID,
    ) -> dict[str, Any]:
        """
        Verify the HMAC signature, expiration (with ±30s leeway), and form association.
        """
        try:
            claims = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                leeway=30,
            )
        except jwt.ExpiredSignatureError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Form token has expired. Please refresh the form and try again.",
            ) from exc
        except jwt.InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid form submission token.",
            ) from exc

        if claims.get("form_id") != str(expected_form_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Form token does not match the target feedback form.",
            )

        jti = claims.get("jti")
        if not jti or not isinstance(jti, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed form token nonce.",
            )

        return claims

    @staticmethod
    async def claim_nonce_atomic(
        redis: Redis,
        jti: str,
    ) -> bool:
        """
        Atomically claim a single-use jti nonce in Redis.
        Returns True if claim succeeded (fresh nonce).
        Returns False if nonce already exists (replay attempt or concurrent submission).
        """
        key = f"form_nonce:{jti}"
        # SET key 'pending' EX 1800 NX
        claimed = await redis.set(key, "pending", ex=NONCE_PENDING_TTL_SECONDS, nx=True)
        return bool(claimed)

    @staticmethod
    async def get_idempotent_submission_id(
        redis: Redis,
        jti: str,
    ) -> str | None:
        """
        Check if this jti was already successfully submitted and recorded.
        Used to handle client double-clicks and flaky mobile retries idempotently.
        """
        sub_id_bytes = await redis.get(f"form_nonce_sub:{jti}")
        if sub_id_bytes:
            return sub_id_bytes.decode("utf-8") if isinstance(sub_id_bytes, bytes) else str(sub_id_bytes)
        return None

    @staticmethod
    async def record_submission_idempotency(
        redis: Redis,
        jti: str,
        submission_id: UUID,
    ) -> None:
        """
        Mark nonce as used and store jti -> submission_id mapping for 24 hours.
        """
        await redis.set(f"form_nonce:{jti}", "used", ex=NONCE_PENDING_TTL_SECONDS)
        await redis.set(
            f"form_nonce_sub:{jti}",
            str(submission_id),
            ex=IDEMPOTENCY_TTL_SECONDS,
        )
