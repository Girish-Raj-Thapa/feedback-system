"""
FastAPI dependency providers for Notifications feature.
"""

from typing import Annotated

from fastapi import Depends

from app.core.dependencies import DBSession
from app.features.notifications.services.connection_service import (
    NotificationConnectionService,
)
from app.features.notifications.services.delivery_service import (
    NotificationDeliveryService,
)
from app.features.notifications.services.slack_oauth_service import (
    SlackOAuthService,
)


def get_connection_service(session: DBSession) -> NotificationConnectionService:
    return NotificationConnectionService(session)


def get_delivery_service(session: DBSession) -> NotificationDeliveryService:
    return NotificationDeliveryService(session)


def get_slack_oauth_service(session: DBSession) -> SlackOAuthService:
    return SlackOAuthService(session)


ConnectionServiceDep = Annotated[
    NotificationConnectionService, Depends(get_connection_service)
]
DeliveryServiceDep = Annotated[
    NotificationDeliveryService, Depends(get_delivery_service)
]
SlackOAuthServiceDep = Annotated[
    SlackOAuthService, Depends(get_slack_oauth_service)
]

