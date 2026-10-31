"""
Routers package for Feedback feature.
Aggregates categories, forms, and submissions sub-routers.
"""

from fastapi import APIRouter

from app.features.feedback.routers.categories import router as categories_router

feedback_router = APIRouter(
    prefix="/workspaces/{workspace_id}/feedback",
    tags=["feedback"],
)

feedback_router.include_router(categories_router)

__all__ = ["feedback_router", "categories_router"]

