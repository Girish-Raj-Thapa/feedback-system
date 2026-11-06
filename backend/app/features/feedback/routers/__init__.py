"""
Routers package for Feedback feature.
Aggregates categories, forms, and submissions sub-routers.
"""

from fastapi import APIRouter

from app.features.feedback.routers.alerts import router as alerts_router
from app.features.feedback.routers.categories import router as categories_router
from app.features.feedback.routers.forms import router as forms_router
from app.features.feedback.routers.insights import router as insights_router
from app.features.feedback.routers.public_forms import (
    router as public_forms_router,
)
from app.features.feedback.routers.submissions import (
    router as submissions_router,
)

feedback_router = APIRouter(
    prefix="/workspaces/{workspace_id}/feedback",
    tags=["feedback"],
)

feedback_router.include_router(alerts_router)
feedback_router.include_router(categories_router)
feedback_router.include_router(forms_router)
feedback_router.include_router(insights_router)
feedback_router.include_router(submissions_router)

__all__ = [
    "alerts_router",
    "categories_router",
    "feedback_router",
    "forms_router",
    "insights_router",
    "public_forms_router",
    "submissions_router",
]
