"""
Centralized database models registry.
Explicitly imports all SQLAlchemy models across features to ensure all DeclarativeBase
entities and string-referenced relationships ('AlertRule', 'NotificationConnection', 'Workspace')
are registered and fully compiled into the mapper registry across all processes
(FastAPI, Taskiq workers, Alembic migrations, and testing).
"""

from sqlalchemy.orm import configure_mappers

# 1. Auth Feature Models
from app.features.auth.models import (
    AuditLog,
    MemberPermissionOverride,
    Permission,
    Role,
    RolePermission,
    User,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
)

# 2. Feedback Feature Models
from app.features.feedback.models.alert_rules import AlertRule
from app.features.feedback.models.categories import FeedbackCategory
from app.features.feedback.models.forms import Form
from app.features.feedback.models.submissions import FeedbackSubmission

# 3. Notification Feature Models
from app.features.notifications.models.connections import NotificationConnection
from app.features.notifications.models.deliveries import OutboundDelivery
from app.features.notifications.models.attempts import DeliveryAttempt

# Pre-compile and validate all relationship definitions across all registered models
configure_mappers()

__all__ = [
    "AlertRule",
    "AuditLog",
    "DeliveryAttempt",
    "FeedbackCategory",
    "FeedbackSubmission",
    "Form",
    "MemberPermissionOverride",
    "NotificationConnection",
    "OutboundDelivery",
    "Permission",
    "Role",
    "RolePermission",
    "User",
    "Workspace",
    "WorkspaceInvite",
    "WorkspaceMember",
]

