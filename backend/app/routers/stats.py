"""Statistics API routes for model and project analytics.

This module provides endpoints for retrieving aggregated statistics
broken down by model and project.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.schemas import (
    ErrorResponse,
    ModelStatsListResponse,
    ProjectStatsListResponse,
)
from app.services.data_service import DataService, get_data_service

router = APIRouter(
    prefix="/stats",
    tags=["statistics"],
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Internal server error",
        },
    },
)


@router.get(
    "/models",
    response_model=ModelStatsListResponse,
    summary="Get Model Usage Statistics",
    description="""
    Retrieve usage statistics broken down by model.

    Returns statistics for each Claude model used, including:
    - Total requests per model
    - Token breakdown (input, output, cache)
    - Total cost per model
    - Percentage of total usage
    - First and last usage timestamps

    Models are sorted by total token usage (descending).
    """,
    responses={
        status.HTTP_200_OK: {
            "description": "Model statistics retrieved successfully",
        },
    },
)
async def get_model_stats(
    data_service: Annotated[DataService, Depends(get_data_service)],
    days: Annotated[
        int,
        Query(
            ge=1,
            le=365,
            description="Number of days to analyze (1-365)",
        ),
    ] = 30,
) -> ModelStatsListResponse:
    """Get usage statistics grouped by model.

    Args:
        data_service: Injected data service instance.
        days: Number of days to analyze (1-365).

    Returns:
        ModelStatsListResponse with per-model statistics.

    Raises:
        HTTPException: If data retrieval fails.
    """
    try:
        return data_service.get_model_stats(days)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve model stats: {str(e)}",
        ) from e


@router.get(
    "/projects",
    response_model=ProjectStatsListResponse,
    summary="Get Project Usage Statistics",
    description="""
    Retrieve usage statistics broken down by project.

    Returns statistics for each project, including:
    - Total requests per project
    - Token breakdown (input, output, cache)
    - Total cost per project
    - Last activity timestamp

    Note: Project identification is based on the directory structure
    of Claude usage data files.
    """,
    responses={
        status.HTTP_200_OK: {
            "description": "Project statistics retrieved successfully",
        },
    },
)
async def get_project_stats(
    data_service: Annotated[DataService, Depends(get_data_service)],
) -> ProjectStatsListResponse:
    """Get usage statistics grouped by project.

    Args:
        data_service: Injected data service instance.

    Returns:
        ProjectStatsListResponse with per-project statistics.

    Raises:
        HTTPException: If data retrieval fails.
    """
    try:
        return data_service.get_project_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve project stats: {str(e)}",
        ) from e
