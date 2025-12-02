"""Pydantic schemas for API request and response models.

This module defines all data transfer objects (DTOs) used by the API endpoints
to ensure type safety and automatic validation/serialization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class UsageEntryResponse(BaseModel):
    """Response model for a single usage entry.

    Represents an individual API call or usage event from Claude.
    """

    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime = Field(
        description="UTC timestamp when the usage event occurred"
    )
    input_tokens: int = Field(
        ge=0,
        description="Number of input tokens consumed"
    )
    output_tokens: int = Field(
        ge=0,
        description="Number of output tokens generated"
    )
    cache_creation_tokens: int = Field(
        default=0,
        ge=0,
        description="Tokens used for cache creation"
    )
    cache_read_tokens: int = Field(
        default=0,
        ge=0,
        description="Tokens read from cache"
    )
    cost_usd: float = Field(
        default=0.0,
        ge=0.0,
        description="Estimated cost in USD"
    )
    model: str = Field(
        default="",
        description="Model identifier used for this request"
    )
    message_id: str = Field(
        default="",
        description="Unique message identifier"
    )
    request_id: str = Field(
        default="",
        description="Unique request identifier"
    )

    @property
    def total_tokens(self) -> int:
        """Calculate total tokens across all categories."""
        return (
            self.input_tokens
            + self.output_tokens
            + self.cache_creation_tokens
            + self.cache_read_tokens
        )


class TokenBreakdown(BaseModel):
    """Breakdown of token usage by category."""

    input_tokens: int = Field(ge=0, default=0)
    output_tokens: int = Field(ge=0, default=0)
    cache_creation_tokens: int = Field(ge=0, default=0)
    cache_read_tokens: int = Field(ge=0, default=0)
    total_tokens: int = Field(ge=0, default=0)


class DailyStatsResponse(BaseModel):
    """Response model for daily usage statistics.

    Provides aggregated statistics for a specific date.
    """

    date: str = Field(
        description="Date in YYYY-MM-DD format"
    )
    total_requests: int = Field(
        ge=0,
        description="Total number of requests made"
    )
    tokens: TokenBreakdown = Field(
        description="Token usage breakdown by category"
    )
    total_cost_usd: float = Field(
        ge=0.0,
        description="Total estimated cost in USD"
    )
    models_used: List[str] = Field(
        default_factory=list,
        description="List of unique models used"
    )
    hourly_distribution: Dict[int, int] = Field(
        default_factory=dict,
        description="Request count per hour (0-23)"
    )


class SessionInfoResponse(BaseModel):
    """Response model for current session information.

    Tracks the 5-hour rolling window session state.
    """

    session_start: Optional[datetime] = Field(
        default=None,
        description="Start time of the current session window"
    )
    session_end: Optional[datetime] = Field(
        default=None,
        description="Projected end time of the session window"
    )
    remaining_minutes: float = Field(
        ge=0.0,
        description="Minutes remaining in the session window"
    )
    remaining_formatted: str = Field(
        default="",
        description="Human-readable remaining time (e.g., '2h 30m')"
    )
    is_active: bool = Field(
        default=False,
        description="Whether a session is currently active"
    )
    tokens_in_window: int = Field(
        ge=0,
        default=0,
        description="Total tokens consumed in the current window"
    )
    cost_in_window: float = Field(
        ge=0.0,
        default=0.0,
        description="Total cost in the current window"
    )


class BurnRateInfo(BaseModel):
    """Information about current token consumption rate."""

    tokens_per_minute: float = Field(
        ge=0.0,
        default=0.0,
        description="Current token consumption rate per minute"
    )
    cost_per_hour: float = Field(
        ge=0.0,
        default=0.0,
        description="Estimated cost per hour at current rate"
    )


class RealtimeUsageResponse(BaseModel):
    """Response model for real-time usage data.

    Provides a comprehensive snapshot of current usage state.
    """

    timestamp: datetime = Field(
        description="Timestamp of this snapshot"
    )
    session: SessionInfoResponse = Field(
        description="Current session information"
    )
    today_stats: DailyStatsResponse = Field(
        description="Today's aggregated statistics"
    )
    burn_rate: BurnRateInfo = Field(
        default_factory=BurnRateInfo,
        description="Current consumption rate"
    )
    recent_entries: List[UsageEntryResponse] = Field(
        default_factory=list,
        max_length=50,
        description="Most recent usage entries (up to 50)"
    )


class ModelStatsResponse(BaseModel):
    """Response model for per-model statistics."""

    model: str = Field(description="Model identifier")
    total_requests: int = Field(ge=0, description="Total requests for this model")
    tokens: TokenBreakdown = Field(description="Token breakdown for this model")
    total_cost_usd: float = Field(ge=0.0, description="Total cost for this model")
    percentage_of_total: float = Field(
        ge=0.0,
        le=100.0,
        description="Percentage of total usage"
    )
    first_used: Optional[datetime] = Field(
        default=None,
        description="First recorded usage of this model"
    )
    last_used: Optional[datetime] = Field(
        default=None,
        description="Most recent usage of this model"
    )


class ProjectStatsResponse(BaseModel):
    """Response model for per-project statistics."""

    project_path: str = Field(description="Project directory path")
    project_name: str = Field(description="Derived project name")
    total_requests: int = Field(ge=0, description="Total requests for this project")
    tokens: TokenBreakdown = Field(description="Token breakdown for this project")
    total_cost_usd: float = Field(ge=0.0, description="Total cost for this project")
    last_active: Optional[datetime] = Field(
        default=None,
        description="Most recent activity in this project"
    )


class HistoryResponse(BaseModel):
    """Response model for historical usage data."""

    days_requested: int = Field(ge=1, description="Number of days requested")
    days_with_data: int = Field(ge=0, description="Number of days with actual data")
    daily_stats: List[DailyStatsResponse] = Field(
        description="Daily statistics for each day"
    )
    total_tokens: int = Field(ge=0, description="Total tokens across all days")
    total_cost_usd: float = Field(ge=0.0, description="Total cost across all days")
    date_range: Dict[str, Optional[str]] = Field(
        description="Start and end dates of the data"
    )


class ModelStatsListResponse(BaseModel):
    """Response containing statistics for all models."""

    models: List[ModelStatsResponse] = Field(
        description="Statistics for each model"
    )
    total_models: int = Field(ge=0, description="Number of unique models")
    period_start: Optional[datetime] = Field(
        default=None,
        description="Start of the analysis period"
    )
    period_end: Optional[datetime] = Field(
        default=None,
        description="End of the analysis period"
    )


class ProjectStatsListResponse(BaseModel):
    """Response containing statistics for all projects."""

    projects: List[ProjectStatsResponse] = Field(
        description="Statistics for each project"
    )
    total_projects: int = Field(ge=0, description="Number of unique projects")


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str = Field(description="Service health status")
    version: str = Field(description="API version")
    data_path_valid: bool = Field(description="Whether data path is accessible")
    timestamp: datetime = Field(description="Current server time")
    details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional health check details"
    )


class ErrorResponse(BaseModel):
    """Standard error response model."""

    error: str = Field(description="Error type or code")
    message: str = Field(description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )


class PlanLimits(BaseModel):
    """Plan limit configuration."""

    plan: str = Field(description="Plan name (pro, max5, max20, custom)")
    display_name: str = Field(description="Display name for the plan")
    token_limit: int = Field(ge=0, description="Token limit for the plan")
    cost_limit: float = Field(ge=0.0, description="Cost limit in USD")
    message_limit: int = Field(ge=0, description="Message limit for the plan")


class UsageVsLimit(BaseModel):
    """Current usage compared to plan limits."""

    current: float = Field(description="Current usage value")
    limit: float = Field(description="Plan limit value")
    percentage: float = Field(ge=0.0, description="Usage percentage (can exceed 100% for overage)")
    formatted_current: str = Field(description="Formatted current value")
    formatted_limit: str = Field(description="Formatted limit value")


class ResetTimeInfo(BaseModel):
    """Information about when limits reset."""

    reset_time: datetime = Field(description="When limits will reset")
    remaining_minutes: float = Field(ge=0.0, description="Minutes until reset")
    remaining_formatted: str = Field(description="Human-readable remaining time")


class PlanUsageResponse(BaseModel):
    """Complete plan usage status matching claude-monitor CLI output."""

    timestamp: datetime = Field(description="Timestamp of this snapshot")
    plan: PlanLimits = Field(description="Current plan configuration")
    cost_usage: UsageVsLimit = Field(description="Cost usage vs limit")
    token_usage: UsageVsLimit = Field(description="Token usage vs limit")
    message_usage: UsageVsLimit = Field(description="Message usage vs limit")
    reset_info: ResetTimeInfo = Field(description="Reset time information")
    burn_rate: BurnRateInfo = Field(description="Current consumption rate")
    model_distribution: Dict[str, float] = Field(
        default_factory=dict,
        description="Model usage distribution percentages"
    )
    predictions: Dict[str, Optional[str]] = Field(
        default_factory=dict,
        description="Usage predictions (when tokens run out, etc.)"
    )
