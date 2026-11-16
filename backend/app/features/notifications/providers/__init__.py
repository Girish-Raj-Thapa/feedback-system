"""
Notification providers package.
"""

from app.features.notifications.providers.base import (
    BaseNotificationProvider,
    ProviderResult,
)
from app.features.notifications.providers.discord import DiscordWebhookProvider
from app.features.notifications.providers.email import EmailAlertProvider
from app.features.notifications.providers.generic import GenericWebhookProvider
from app.features.notifications.providers.registry import (
    ProviderRegistry,
    provider_registry,
)
from app.features.notifications.providers.slack import SlackWebhookProvider

__all__ = [
    "BaseNotificationProvider",
    "DiscordWebhookProvider",
    "EmailAlertProvider",
    "GenericWebhookProvider",
    "ProviderRegistry",
    "ProviderResult",
    "SlackWebhookProvider",
    "provider_registry",
]

