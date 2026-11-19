"""
Lean HTTP & cryptographic client for Paddle Billing v2.
Verifies HMAC-SHA256 webhook signatures with stdlib hmac/hashlib and creates
authenticated Customer Portal sessions via httpx.AsyncClient.
"""

import hashlib
import hmac
import time
from typing import Literal

import httpx


class PaddleWebhookSignatureError(ValueError):
    """Raised when a Paddle-Signature header is missing, malformed, expired, or invalid."""


class PaddleClientError(RuntimeError):
    """Raised when the Paddle Billing v2 API returns an error or network failure."""


class PaddleClient:
    """Client for Paddle Billing v2 webhook verification and Customer Portal API."""

    def __init__(
        self,
        api_key: str,
        environment: Literal["sandbox", "production"] = "sandbox",
    ) -> None:
        self.api_key = api_key.strip()
        self.base_url = (
            "https://sandbox-api.paddle.com"
            if environment == "sandbox"
            else "https://api.paddle.com"
        )

    @staticmethod
    def verify_webhook_signature(
        raw_body: bytes,
        signature_header: str,
        webhook_secret: str,
        max_age_seconds: int = 300,
    ) -> None:
        """
        Verify Paddle Billing v2 `Paddle-Signature: ts=<unix>;h1=<hex_hmac>` header.
        Computes HMAC-SHA256 over `f"{ts}:{raw_body}"` and enforces timestamp replay bounds.
        """
        if not webhook_secret:
            raise PaddleWebhookSignatureError(
                "Paddle webhook secret is not configured."
            )
        if not signature_header:
            raise PaddleWebhookSignatureError("Missing Paddle-Signature header.")

        ts_part: str | None = None
        h1_signatures: list[str] = []
        for segment in signature_header.split(";"):
            key, sep, val = segment.strip().partition("=")
            if not sep:
                continue
            if key == "ts":
                ts_part = val.strip()
            elif key == "h1":
                h1_signatures.append(val.strip().lower())

        if not ts_part or not h1_signatures:
            raise PaddleWebhookSignatureError("Malformed Paddle-Signature header.")

        try:
            ts_int = int(ts_part)
        except ValueError as exc:
            raise PaddleWebhookSignatureError(
                "Invalid timestamp in Paddle-Signature header."
            ) from exc

        now_ts = int(time.time())
        if abs(now_ts - ts_int) > max_age_seconds:
            raise PaddleWebhookSignatureError(
                "Paddle webhook signature timestamp outside replay window."
            )

        signed_payload = ts_part.encode("utf-8") + b":" + raw_body
        expected_hmac = hmac.new(
            webhook_secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        if not any(hmac.compare_digest(expected_hmac, sig) for sig in h1_signatures):
            raise PaddleWebhookSignatureError("Invalid Paddle webhook HMAC signature.")

    async def create_customer_portal_url(
        self,
        customer_id: str,
        subscription_id: str | None = None,
    ) -> str:
        """
        Create an authenticated Paddle Billing v2 Customer Portal session and return its overview URL.
        """
        if not self.api_key:
            raise PaddleClientError("Paddle API key is not configured.")

        url = f"{self.base_url}/customers/{customer_id}/portal-sessions"
        payload = {"subscription_ids": [subscription_id]} if subscription_id else {}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            raise PaddleClientError(
                f"Failed to contact Paddle API: {exc}"
            ) from exc

        if resp.status_code >= 400:
            raise PaddleClientError(
                f"Paddle portal creation failed ({resp.status_code}): {resp.text[:300]}"
            )

        body = resp.json()
        overview_url = (
            body.get("data", {})
            .get("urls", {})
            .get("general", {})
            .get("overview")
        )
        if not isinstance(overview_url, str) or not overview_url:
            raise PaddleClientError("Paddle API returned no Customer Portal URL.")
        return overview_url
