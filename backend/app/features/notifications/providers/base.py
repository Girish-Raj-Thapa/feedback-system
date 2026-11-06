"""
Abstract base provider interface for outbound notification channels.
Defines normalized dispatch contracts, error classification, and destination validation.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ProviderResult:
    """
    Normalized result of an outbound notification dispatch attempt.
    """

    success: bool
    status_code: int | None
    response_body: str | None
    error_message: str | None
    is_transient: bool
    retry_after_seconds: int | None = None
    is_revocation: bool = False


class BaseNotificationProvider(ABC):
    """
    Abstract interface that all outbound notification providers (Slack, Discord, generic webhooks)
    must implement.
    """

    @property
    @abstractmethod
    def provider_type(self) -> str:
        """
        Unique provider identifier, e.g. 'slack_webhook', 'discord_webhook'.
        """
        pass

    @abstractmethod
    def validate_destination_url(self, url: str) -> None:
        """
        Validate destination URL syntax, scheme, and execute SSRF / host checks.
        Raises ValueError if invalid or prohibited.
        """
        pass

    @abstractmethod
    async def dispatch(
        self,
        url: str,
        payload: dict[str, Any],
        secret_token: str | None = None,
    ) -> ProviderResult:
        """
        Execute the HTTP request to the external destination with strict timeouts and error classification.
        """
        pass

    @abstractmethod
    def build_test_payload(self, workspace_name: str) -> dict[str, Any]:
        """
        Construct a lightweight test verification payload for this channel.
        """
        pass

