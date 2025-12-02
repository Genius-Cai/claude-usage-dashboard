"""FastAPI application entry point for Claude Usage Dashboard.

This module configures and creates the FastAPI application instance
with all routes, middleware, and lifecycle handlers.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime
from datetime import timezone as tz

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.models.schemas import HealthResponse
from app.routers import stats, usage, websocket
from app.routers.websocket import start_broadcast_task, stop_broadcast_task
from app.services.data_service import warm_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager.

    Handles startup and shutdown events for the application.

    Args:
        app: The FastAPI application instance.

    Yields:
        None during the application lifecycle.
    """
    # Startup
    settings = get_settings()
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Data path: {settings.CLAUDE_DATA_PATH}")
    logger.info(f"Data path valid: {settings.is_data_path_valid()}")

    # Pre-warm the cache for faster first requests
    if settings.is_data_path_valid():
        warm_cache()

    # Start WebSocket broadcast task
    start_broadcast_task()

    yield

    # Shutdown
    logger.info("Shutting down application...")
    stop_broadcast_task()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        FastAPI: Configured application instance.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="""
        Claude Usage Dashboard API

        This API provides real-time and historical usage data for Claude AI,
        enabling monitoring of token consumption, costs, and session management.

        ## Features

        - **Real-time Monitoring**: Track current usage with WebSocket updates
        - **Historical Data**: Query usage history by day or custom periods
        - **Model Statistics**: Break down usage by Claude model variant
        - **Session Tracking**: Monitor 5-hour rolling session windows

        ## WebSocket

        Connect to `/ws/realtime` for live updates every 10 seconds.
        """,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS with restricted methods and headers
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # Include routers
    app.include_router(usage.router, prefix=settings.API_PREFIX)
    app.include_router(stats.router, prefix=settings.API_PREFIX)
    app.include_router(websocket.router)

    return app


# Create the application instance
app = create_app()


@app.get(
    "/",
    response_class=JSONResponse,
    include_in_schema=False,
)
async def root() -> dict:
    """Root endpoint redirecting to documentation.

    Returns:
        Dictionary with API info and documentation links.
    """
    settings = get_settings()
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": "/docs",
        "openapi": "/openapi.json",
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Health Check",
    description="Check the health status of the API and its dependencies.",
)
async def health_check() -> HealthResponse:
    """Health check endpoint for monitoring.

    Returns:
        HealthResponse with service status and details.
    """
    settings = get_settings()
    data_path_valid = settings.is_data_path_valid()

    return HealthResponse(
        status="healthy" if data_path_valid else "degraded",
        version=settings.APP_VERSION,
        data_path_valid=data_path_valid,
        timestamp=datetime.now(tz.utc),
        details={
            "data_path": settings.CLAUDE_DATA_PATH,
            "session_window_hours": settings.SESSION_WINDOW_HOURS,
            "websocket_interval": settings.WEBSOCKET_BROADCAST_INTERVAL,
        },
    )


@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["health"],
    include_in_schema=False,
)
async def api_health_check() -> HealthResponse:
    """Alternative health check endpoint under /api prefix."""
    return await health_check()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
