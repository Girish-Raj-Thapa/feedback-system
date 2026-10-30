import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt

from app.core.config import settings
from app.core.errors import AuthenticationError

TokenType = Literal["access", "refresh", "verify_email", "reset_password"]


def create_access_token(
    subject: str, extra_claims: dict[str, Any] | None = None
) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES)

    claims: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    if extra_claims:
        claims.update(extra_claims)

    return jwt.encode(
        payload=claims,
        key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(subject: str, jti: str | None = None) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)

    claims: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": jti or str(uuid.uuid4()),
    }

    return jwt.encode(
        payload=claims,
        key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_email_verification_token(subject: str, email: str) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(hours=settings.EMAIL_VERIFY_TOKEN_TTL_HOURS)

    claims: dict[str, Any] = {
        "sub": subject,
        "email": email,
        "type": "verify_email",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(
        payload=claims,
        key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_password_reset_token(subject: str) -> str:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES)

    claims: dict[str, Any] = {
        "sub": subject,
        "type": "reset_password",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(uuid.uuid4()),
    }

    return jwt.encode(
        payload=claims,
        key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            jwt=token,
            key=settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.PyJWTError as exc:
        raise AuthenticationError("Invalid or expired token") from exc

    if expected_type and payload.get("type") != expected_type:
        raise AuthenticationError(f"Expected {expected_type} token")

    return payload
