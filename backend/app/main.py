"""
FastAPI application entrypoint configuring lifespan, middleware, error handlers, and routers.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestContextMiddleware
from app.core.redis import close_redis
from app.db.session import close_db_engine
import app.db.models  # noqa: F401 - Register all models and compile mappers

# Initialize structured logging immediately before application assembly
setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application startup and graceful shutdown resources.
    """
    logger.info("app.startup", environment=settings.ENVIRONMENT)
    yield
    logger.info("app.shutdown_started")
    await close_db_engine()
    await close_redis()
    logger.info("app.shutdown_completed")


# Module-level FastAPI application instance
app = FastAPI(
    title="Feedback Management System API",
    description="Feedback Management System backend API.",
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["x-correlation-id"],
    )

# Register pure ASGI context and access logging middleware
app.add_middleware(RequestContextMiddleware)

# Register central domain exception and validation handlers from core/errors.py
register_error_handlers(app)

# Register unversioned health router
app.include_router(health.router)

# Register versioned API routers
app.include_router(api_router, prefix="/api/v1")
