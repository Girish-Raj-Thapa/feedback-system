"""
Routers package for Notifications feature.
"""

from app.features.notifications.routers.connections import (
    router as connections_router,
)
from app.features.notifications.routers.oauth import (
    router as oauth_router,
)

__all__ = [
    "connections_router",
    "oauth_router",
]

