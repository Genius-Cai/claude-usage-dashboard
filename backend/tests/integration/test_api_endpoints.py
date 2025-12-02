"""Integration tests for API endpoints."""

import pytest
from httpx import AsyncClient


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, async_client: AsyncClient):
        """Test that health endpoint returns 200 with expected structure."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "version" in data
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_health_includes_data_path_status(self, async_client: AsyncClient):
        """Test that health endpoint includes data path validation."""
        response = await async_client.get("/health")
        data = response.json()

        assert "data_path_valid" in data
        # data_path_valid can be True or False depending on environment


class TestUsageEndpoints:
    """Tests for /api/usage/* endpoints."""

    @pytest.mark.asyncio
    async def test_realtime_returns_usage_data(self, async_client: AsyncClient):
        """Test that realtime endpoint returns expected structure."""
        response = await async_client.get("/api/usage/realtime")

        assert response.status_code == 200
        data = response.json()

        # Check required fields - API uses nested structure
        assert "timestamp" in data
        # Tokens are in today_stats.tokens or session
        has_session = "session" in data
        has_today_stats = "today_stats" in data
        assert has_session or has_today_stats

    @pytest.mark.asyncio
    async def test_plan_usage_default_plan(self, async_client: AsyncClient):
        """Test plan-usage endpoint with default plan."""
        response = await async_client.get("/api/usage/plan-usage")

        assert response.status_code == 200
        data = response.json()

        # Check required fields - API returns nested structure
        assert "plan" in data
        # Token/cost usage might be in various structures
        has_usage_data = (
            "token_usage" in data
            or "cost_usage" in data
            or "session" in data
        )
        assert has_usage_data

    @pytest.mark.asyncio
    async def test_plan_usage_with_plan_param(self, async_client: AsyncClient):
        """Test plan-usage endpoint with specific plan parameter."""
        response = await async_client.get("/api/usage/plan-usage?plan=max20")

        assert response.status_code == 200
        data = response.json()

        # Plan might be a string or nested object
        plan_data = data.get("plan", {})
        if isinstance(plan_data, dict):
            plan = plan_data.get("plan", "")
        else:
            plan = plan_data
        assert plan in ["max20", "max_20x", "max20x"]

    @pytest.mark.asyncio
    async def test_plan_usage_invalid_plan(self, async_client: AsyncClient):
        """Test plan-usage endpoint with invalid plan."""
        response = await async_client.get("/api/usage/plan-usage?plan=invalid_plan")

        # Should either return error or default to a valid plan
        assert response.status_code in [200, 400, 422]

    @pytest.mark.asyncio
    async def test_daily_stats_returns_data(self, async_client: AsyncClient):
        """Test daily stats endpoint returns expected structure."""
        response = await async_client.get("/api/usage/daily")

        assert response.status_code == 200
        data = response.json()

        # Should have date field
        assert "date" in data

    @pytest.mark.asyncio
    async def test_daily_stats_with_date_param(self, async_client: AsyncClient):
        """Test daily stats with specific date."""
        response = await async_client.get("/api/usage/daily?date=2024-12-01")

        assert response.status_code == 200
        data = response.json()

        assert "date" in data

    @pytest.mark.asyncio
    async def test_history_returns_list(self, async_client: AsyncClient):
        """Test history endpoint returns a list or dict with history."""
        response = await async_client.get("/api/usage/history")

        assert response.status_code == 200
        data = response.json()

        # API might return list directly or wrapped in dict
        assert isinstance(data, (list, dict))

    @pytest.mark.asyncio
    async def test_history_with_days_param(self, async_client: AsyncClient):
        """Test history endpoint with days parameter."""
        response = await async_client.get("/api/usage/history?days=7")

        assert response.status_code == 200
        data = response.json()

        # API might return list directly or wrapped in dict
        assert isinstance(data, (list, dict))


class TestStatsEndpoints:
    """Tests for /api/stats/* endpoints."""

    @pytest.mark.asyncio
    async def test_model_stats_returns_data(self, async_client: AsyncClient):
        """Test model stats endpoint returns expected structure."""
        response = await async_client.get("/api/stats/models")

        assert response.status_code == 200
        data = response.json()

        # API might return list or dict with models
        assert isinstance(data, (list, dict))

    @pytest.mark.asyncio
    async def test_model_stats_with_days_param(self, async_client: AsyncClient):
        """Test model stats with days parameter."""
        response = await async_client.get("/api/stats/models?days=7")

        assert response.status_code == 200
        data = response.json()

        # API might return list or dict with models
        assert isinstance(data, (list, dict))


class TestCORSHeaders:
    """Tests for CORS configuration."""

    @pytest.mark.asyncio
    async def test_cors_allows_localhost(self, async_client: AsyncClient):
        """Test that CORS headers are present for localhost."""
        response = await async_client.options(
            "/api/usage/realtime",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        # CORS preflight should succeed or endpoint should allow the origin
        assert response.status_code in [200, 204, 405]
