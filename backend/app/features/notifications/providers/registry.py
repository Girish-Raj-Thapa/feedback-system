"""
Provider Registry for outbound notification channels.
Maps provider_type strings to singleton provider instances.
"""

from typing import ClassVar

from app.features.notifications.providers.base import BaseNotificationProvider
from app.features.notifications.providers.slack import SlackWebhookProvider


class ProviderRegistry:
    """
    Registry for notification provider implementations.
    """

    _instance: ClassVar["ProviderRegistry | None"] = None

    def __init__(self) -> None:
        self._providers: dict[str, BaseNotificationProvider] = {}
        # Register default providers
        self.register(SlackWebhookProvider())

    @classmethod
    def get_instance(cls) -> "ProviderRegistry":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def register(self, provider: BaseNotificationProvider) -> None:
        self._providers[provider.provider_type] = provider

    def get(self, provider_type: str) -> BaseNotificationProvider:
        provider = self._providers.get(provider_type)
        if not provider:
            raise ValueError(
                f"Unsupported notification provider type: '{provider_type}'"
            )
        return provider

    def is_supported(self, provider_type: str) -> bool:
        return provider_type in self._providers


# Global singleton access
provider_registry = ProviderRegistry.get_instance()

