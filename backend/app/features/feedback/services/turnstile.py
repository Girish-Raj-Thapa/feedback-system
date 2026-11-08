"""
Cloudflare Turnstile Anti-Bot Verification Service.
Enforces browser cryptographic proof on anonymous submissions and routes failures to Lane C (Degraded Quarantine).
"""

from typing import Literal

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.features.feedback.services.turnstile")

ChallengeResult = Literal["passed", "failed", "skipped", "unavailable"]
TrustLevel = Literal["anonymous", "verified", "unverified"]


class TurnstileService:
    @staticmethod
    async def verify_challenge(
        turnstile_token: str | None,
        client_ip: str | None = None,
    ) -> tuple[ChallengeResult, TrustLevel]:
        """
        Verify incoming turnstile challenge token.
        Returns (challenge_result, trust_level).
        """
        secret_key = settings.TURNSTILE_SECRET_KEY

        # If Turnstile secret is unconfigured (e.g. dev or self-hosted mode without Cloudflare keys)
        if not secret_key:
            return ("skipped", "anonymous")

        # If token was missing entirely
        if not turnstile_token or not turnstile_token.strip():
            logger.warning("turnstile.missing_token", client_ip=client_ip)
            return ("failed", "unverified")

        payload: dict[str, str] = {
            "secret": secret_key,
            "response": turnstile_token.strip(),
        }
        if client_ip:
            payload["remoteip"] = client_ip

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    settings.TURNSTILE_VERIFY_URL,
                    data=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("success") is True:
                        return ("passed", "anonymous")

                    error_codes = data.get("error-codes", [])
                    logger.warning(
                        "turnstile.verification_failed",
                        error_codes=error_codes,
                        client_ip=client_ip,
                    )
                    return ("failed", "unverified")
                else:
                    logger.error(
                        "turnstile.http_error",
                        status_code=res.status_code,
                        client_ip=client_ip,
                    )
                    return ("unavailable", "unverified")
        except httpx.TimeoutException:
            logger.error("turnstile.timeout", client_ip=client_ip)
            return ("unavailable", "unverified")
        except Exception as exc:
            logger.exception("turnstile.unexpected_error", error=str(exc))
            return ("unavailable", "unverified")
