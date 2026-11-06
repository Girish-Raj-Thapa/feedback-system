"""
Notification providers package.
"""

from app.features.notifications.providers.base import (
    BaseNotificationProvider,
    ProviderResult,
)
from app.features.notifications.providers.registry import (
    ProviderRegistry,
    provider_registry,
)
from app.features.notifications.providers.slack import SlackWebhookProvider

__all__ = [
    "BaseNotificationProvider",
    "ProviderRegistry",
    "ProviderResult",
    "SlackWebhookProvider",
    "provider_registry",
]

