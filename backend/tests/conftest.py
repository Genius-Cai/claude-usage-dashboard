"""Pytest configuration and fixtures for backend tests."""

import pytest
from typing import AsyncGenerator
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock

from app.main import app
from app.services.data_service import DataService


@pytest.fixture
def test_app() -> FastAPI:
    """Get the FastAPI app for testing."""
    return app


@pytest.fixture
async def async_client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for API testing."""
    transport = ASGITransport(app=test_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        timeout=10.0,  # Prevent hanging tests
    ) as client:
        yield client


@pytest.fixture
def mock_data_service() -> MagicMock:
    """Create a mock DataService for unit testing."""
    service = MagicMock(spec=DataService)

    # Mock common methods with realistic return values
    service.get_realtime_usage.return_value = {
        "timestamp": "2024-12-03T10:00:00Z",
        "totalTokens": 1500000,
        "inputTokens": 500000,
        "outputTokens": 1000000,
        "cacheCreationTokens": 50000,
        "cacheReadTokens": 100000,
        "costUSD": 15.50,
        "requestCount": 150,
        "sessionInfo": {
            "isActive": True,
            "remainingTime": 14400,
            "startTime": "2024-12-03T06:00:00Z",
            "endTime": "2024-12-03T11:00:00Z",
        },
    }

    service.get_plan_usage.return_value = {
        "plan": "max20",
        "totalTokens": 1500000,
        "tokenLimit": 100000000,
        "tokenPercentage": 1.5,
        "totalCost": 15.50,
        "costLimit": 600,
        "costPercentage": 2.58,
        "sessionInfo": {
            "isActive": True,
            "remainingTime": 14400,
            "startTime": "2024-12-03T06:00:00Z",
            "endTime": "2024-12-03T11:00:00Z",
        },
    }

    service.get_daily_stats.return_value = {
        "date": "2024-12-03",
        "totalTokens": 500000,
        "inputTokens": 150000,
        "outputTokens": 350000,
        "cacheCreationTokens": 10000,
        "cacheReadTokens": 50000,
        "costUSD": 5.20,
        "requestCount": 50,
    }

    service.get_usage_history.return_value = [
        {
            "date": "2024-12-01",
            "totalTokens": 450000,
            "costUSD": 4.50,
            "requestCount": 45,
        },
        {
            "date": "2024-12-02",
            "totalTokens": 500000,
            "costUSD": 5.00,
            "requestCount": 50,
        },
        {
            "date": "2024-12-03",
            "totalTokens": 550000,
            "costUSD": 5.50,
            "requestCount": 55,
        },
    ]

    service.get_model_stats.return_value = [
        {"model": "claude-sonnet-4-20250514", "count": 100, "tokens": 800000, "cost": 8.00},
        {"model": "claude-3-5-haiku-20241022", "count": 50, "tokens": 200000, "cost": 2.00},
    ]

    return service


@pytest.fixture
def sample_usage_data() -> dict:
    """Sample usage data for testing calculations."""
    return {
        "totalTokens": 1500000,
        "inputTokens": 500000,
        "outputTokens": 1000000,
        "cacheCreationTokens": 50000,
        "cacheReadTokens": 100000,
        "costUSD": 15.50,
        "requestCount": 150,
    }


@pytest.fixture
def sample_plan_configs() -> dict:
    """Sample plan configurations for testing."""
    return {
        "free": {"tokenLimit": 500000, "costLimit": 0},
        "pro": {"tokenLimit": 5000000, "costLimit": 50},
        "max_5x": {"tokenLimit": 25000000, "costLimit": 200},
        "max_20x": {"tokenLimit": 100000000, "costLimit": 600},
    }
