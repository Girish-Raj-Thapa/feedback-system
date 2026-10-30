"""
Application health checks and database liveness probes.
"""

from fastapi import APIRouter, status
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    environment: str


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
)
async def health_check() -> HealthResponse:
    """
    Check application and database health.
    Returns status confirmation for service monitoring.
    """
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))

    return HealthResponse(
        status="healthy",
        environment=settings.ENVIRONMENT,
    )
