"""Usage API routes for real-time and historical data.

This module provides endpoints for retrieving usage data including
real-time statistics, daily summaries, and historical trends.
"""

from datetime import date, datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.schemas import (
    DailyStatsResponse,
    ErrorResponse,
    HistoryResponse,
    RealtimeUsageResponse,
)
from app.services.data_service import DataService, get_data_service

router = APIRouter(
    prefix="/usage",
    tags=["usage"],
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Internal server error",
        },
    },
)


@router.get(
    "/realtime",
    response_model=RealtimeUsageResponse,
    summary="Get Real-time Usage Data",
    description="""
    Retrieve comprehensive real-time usage data including:
    - Current session information (5-hour rolling window)
    - Today's aggregated statistics
    - Current burn rate (token consumption per minute)
    - Recent usage entries (last 50)

    This endpoint is optimized for dashboard displays and provides
    all necessary data in a single request.
    """,
    responses={
        status.HTTP_200_OK: {
            "description": "Real-time usage data retrieved successfully",
        },
    },
)
async def get_realtime_usage(
    data_service: Annotated[DataService, Depends(get_data_service)],
) -> RealtimeUsageResponse:
    """Get real-time usage data for dashboard display.

    Args:
        data_service: Injected data service instance.

    Returns:
        RealtimeUsageResponse with current usage metrics.

    Raises:
        HTTPException: If data retrieval fails.
    """
    try:
        return data_service.get_realtime_usage()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve realtime usage: {str(e)}",
        ) from e


@router.get(
    "/daily",
    response_model=DailyStatsResponse,
    summary="Get Daily Usage Statistics",
    description="""
    Retrieve aggregated usage statistics for a specific date.

    If no date is provided, returns today's statistics.
    The date should be in YYYY-MM-DD format.
    """,
    responses={
        status.HTTP_200_OK: {
            "description": "Daily statistics retrieved successfully",
        },
        status.HTTP_400_BAD_REQUEST: {
            "model": ErrorResponse,
            "description": "Invalid date format",
        },
    },
)
async def get_daily_stats(
    data_service: Annotated[DataService, Depends(get_data_service)],
    target_date: Annotated[
        Optional[str],
        Query(
            alias="date",
            description="Date in YYYY-MM-DD format. Defaults to today.",
            examples=["2024-01-15"],
        ),
    ] = None,
) -> DailyStatsResponse:
    """Get usage statistics for a specific date.

    Args:
        data_service: Injected data service instance.
        target_date: Optional date string in YYYY-MM-DD format.

    Returns:
        DailyStatsResponse with aggregated statistics.

    Raises:
        HTTPException: If date format is invalid or data retrieval fails.
    """
    if target_date is None:
        query_date = date.today()
    else:
        try:
            query_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format. Expected YYYY-MM-DD, got: {target_date}",
            ) from e

    try:
        return data_service.get_daily_stats(query_date)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve daily stats: {str(e)}",
        ) from e


@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="Get Historical Usage Data",
    description="""
    Retrieve historical usage data aggregated by day.

    Returns daily statistics for the specified number of days,
    including token breakdowns, costs, and model usage.

    Maximum allowed is 365 days.
    """,
    responses={
        status.HTTP_200_OK: {
            "description": "Historical data retrieved successfully",
        },
        status.HTTP_400_BAD_REQUEST: {
            "model": ErrorResponse,
            "description": "Invalid days parameter",
        },
    },
)
async def get_history(
    data_service: Annotated[DataService, Depends(get_data_service)],
    days: Annotated[
        int,
        Query(
            ge=1,
            le=365,
            description="Number of days of history to retrieve (1-365)",
        ),
    ] = 30,
) -> HistoryResponse:
    """Get historical usage data for the specified period.

    Args:
        data_service: Injected data service instance.
        days: Number of days of history to retrieve (1-365).

    Returns:
        HistoryResponse with daily statistics for the period.

    Raises:
        HTTPException: If data retrieval fails.
    """
    try:
        return data_service.get_history(days)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve history: {str(e)}",
        ) from e
