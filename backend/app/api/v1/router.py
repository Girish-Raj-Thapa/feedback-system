"""
API v1 root router aggregating feature routers.
"""

from fastapi import APIRouter

from app.features.auth.router import router as auth_router
from app.features.feedback.routers import feedback_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(feedback_router)
