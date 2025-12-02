"""Data service for reading and processing Claude usage data.

This service acts as the bridge between the claude_monitor package
and the API endpoints, providing processed data in API-friendly formats.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from datetime import timezone as tz
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from claude_monitor.core.models import CostMode, UsageEntry
from claude_monitor.data.reader import load_usage_entries

from app.core.config import Settings, get_settings
from app.models.schemas import (
    BurnRateInfo,
    DailyStatsResponse,
    HistoryResponse,
    ModelStatsListResponse,
    ModelStatsResponse,
    ProjectStatsListResponse,
    ProjectStatsResponse,
    RealtimeUsageResponse,
    SessionInfoResponse,
    TokenBreakdown,
    UsageEntryResponse,
)

logger = logging.getLogger(__name__)


class DataService:
    """Service for reading and processing Claude usage data.

    This service wraps the claude_monitor data reader and provides
    higher-level methods for the API endpoints.

    Attributes:
        settings: Application settings instance.
        session_window_hours: Duration of the rolling session window.
    """

    def __init__(self, settings: Optional[Settings] = None) -> None:
        """Initialize the data service.

        Args:
            settings: Optional settings instance. Defaults to global settings.
        """
        self.settings = settings or get_settings()
        self.session_window_hours = self.settings.SESSION_WINDOW_HOURS

    def _load_entries(
        self,
        hours_back: Optional[int] = None,
    ) -> List[UsageEntry]:
        """Load usage entries from the claude_monitor data reader.

        Args:
            hours_back: Optional limit to entries from last N hours.

        Returns:
            List of UsageEntry objects sorted by timestamp.
        """
        try:
            entries, _ = load_usage_entries(
                data_path=self.settings.CLAUDE_DATA_PATH,
                hours_back=hours_back,
                mode=CostMode.AUTO,
                include_raw=False,
            )
            return entries
        except Exception as e:
            logger.error(f"Failed to load usage entries: {e}")
            return []

    def _entry_to_response(self, entry: UsageEntry) -> UsageEntryResponse:
        """Convert a UsageEntry to a UsageEntryResponse.

        Args:
            entry: The UsageEntry from claude_monitor.

        Returns:
            UsageEntryResponse suitable for API responses.
        """
        return UsageEntryResponse(
            timestamp=entry.timestamp,
            input_tokens=entry.input_tokens,
            output_tokens=entry.output_tokens,
            cache_creation_tokens=entry.cache_creation_tokens,
            cache_read_tokens=entry.cache_read_tokens,
            cost_usd=entry.cost_usd,
            model=entry.model,
            message_id=entry.message_id,
            request_id=entry.request_id,
        )

    def _calculate_token_breakdown(
        self,
        entries: List[UsageEntry],
    ) -> TokenBreakdown:
        """Calculate aggregated token breakdown from entries.

        Args:
            entries: List of usage entries to aggregate.

        Returns:
            TokenBreakdown with summed token counts.
        """
        input_tokens = sum(e.input_tokens for e in entries)
        output_tokens = sum(e.output_tokens for e in entries)
        cache_creation = sum(e.cache_creation_tokens for e in entries)
        cache_read = sum(e.cache_read_tokens for e in entries)
        total = input_tokens + output_tokens + cache_creation + cache_read

        return TokenBreakdown(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_creation_tokens=cache_creation,
            cache_read_tokens=cache_read,
            total_tokens=total,
        )

    def _calculate_session_info(
        self,
        entries: List[UsageEntry],
    ) -> SessionInfoResponse:
        """Calculate current session information based on rolling window.

        The session window is a 5-hour rolling period from the most recent
        activity. If there's been no activity in the last 5 hours, the
        session is considered inactive.

        Args:
            entries: All available usage entries.

        Returns:
            SessionInfoResponse with current session state.
        """
        now = datetime.now(tz.utc)
        window_start = now - timedelta(hours=self.session_window_hours)

        # Filter entries within the session window
        window_entries = [e for e in entries if e.timestamp >= window_start]

        if not window_entries:
            return SessionInfoResponse(
                session_start=None,
                session_end=None,
                remaining_minutes=0.0,
                remaining_formatted="No active session",
                is_active=False,
                tokens_in_window=0,
                cost_in_window=0.0,
            )

        # Session starts from the first entry in the window
        first_entry = min(window_entries, key=lambda e: e.timestamp)
        session_start = first_entry.timestamp

        # Session ends 5 hours after the first entry
        session_end = session_start + timedelta(hours=self.session_window_hours)

        # Calculate remaining time
        remaining = session_end - now
        remaining_minutes = max(0.0, remaining.total_seconds() / 60)

        # Format remaining time
        if remaining_minutes <= 0:
            remaining_formatted = "Session expired"
        else:
            hours = int(remaining_minutes // 60)
            minutes = int(remaining_minutes % 60)
            if hours > 0:
                remaining_formatted = f"{hours}h {minutes}m"
            else:
                remaining_formatted = f"{minutes}m"

        # Calculate totals in window
        tokens = sum(
            e.input_tokens
            + e.output_tokens
            + e.cache_creation_tokens
            + e.cache_read_tokens
            for e in window_entries
        )
        cost = sum(e.cost_usd for e in window_entries)

        return SessionInfoResponse(
            session_start=session_start,
            session_end=session_end,
            remaining_minutes=remaining_minutes,
            remaining_formatted=remaining_formatted,
            is_active=remaining_minutes > 0,
            tokens_in_window=tokens,
            cost_in_window=cost,
        )

    def _calculate_burn_rate(
        self,
        entries: List[UsageEntry],
        minutes_window: int = 30,
    ) -> BurnRateInfo:
        """Calculate current token consumption rate.

        Args:
            entries: Recent usage entries.
            minutes_window: Time window for rate calculation.

        Returns:
            BurnRateInfo with consumption metrics.
        """
        now = datetime.now(tz.utc)
        window_start = now - timedelta(minutes=minutes_window)

        recent_entries = [e for e in entries if e.timestamp >= window_start]

        if not recent_entries:
            return BurnRateInfo(tokens_per_minute=0.0, cost_per_hour=0.0)

        total_tokens = sum(
            e.input_tokens
            + e.output_tokens
            + e.cache_creation_tokens
            + e.cache_read_tokens
            for e in recent_entries
        )
        total_cost = sum(e.cost_usd for e in recent_entries)

        # Calculate actual time span
        first_entry = min(recent_entries, key=lambda e: e.timestamp)
        time_span = (now - first_entry.timestamp).total_seconds() / 60
        time_span = max(time_span, 1.0)  # Avoid division by zero

        tokens_per_minute = total_tokens / time_span
        cost_per_hour = (total_cost / time_span) * 60

        return BurnRateInfo(
            tokens_per_minute=round(tokens_per_minute, 2),
            cost_per_hour=round(cost_per_hour, 4),
        )

    def get_today_stats(self) -> DailyStatsResponse:
        """Get aggregated statistics for today.

        Returns:
            DailyStatsResponse with today's usage statistics.
        """
        entries = self._load_entries(hours_back=24)
        today = date.today()

        # Filter to only today's entries (in local time)
        today_entries = [
            e
            for e in entries
            if e.timestamp.date() == today
            or (
                e.timestamp.astimezone().date() == today
                if e.timestamp.tzinfo
                else e.timestamp.date() == today
            )
        ]

        tokens = self._calculate_token_breakdown(today_entries)
        models = list(set(e.model for e in today_entries if e.model))

        # Calculate hourly distribution
        hourly: Dict[int, int] = defaultdict(int)
        for entry in today_entries:
            hour = entry.timestamp.hour
            hourly[hour] += 1

        return DailyStatsResponse(
            date=today.isoformat(),
            total_requests=len(today_entries),
            tokens=tokens,
            total_cost_usd=sum(e.cost_usd for e in today_entries),
            models_used=models,
            hourly_distribution=dict(hourly),
        )

    def get_daily_stats(self, target_date: date) -> DailyStatsResponse:
        """Get aggregated statistics for a specific date.

        Args:
            target_date: The date to get statistics for.

        Returns:
            DailyStatsResponse with the day's usage statistics.
        """
        # Calculate days back from today
        days_back = (date.today() - target_date).days
        hours_back = (days_back + 1) * 24 if days_back >= 0 else None

        entries = self._load_entries(hours_back=hours_back)

        # Filter to target date
        date_entries = [e for e in entries if e.timestamp.date() == target_date]

        tokens = self._calculate_token_breakdown(date_entries)
        models = list(set(e.model for e in date_entries if e.model))

        hourly: Dict[int, int] = defaultdict(int)
        for entry in date_entries:
            hourly[entry.timestamp.hour] += 1

        return DailyStatsResponse(
            date=target_date.isoformat(),
            total_requests=len(date_entries),
            tokens=tokens,
            total_cost_usd=sum(e.cost_usd for e in date_entries),
            models_used=models,
            hourly_distribution=dict(hourly),
        )

    def get_history(self, days: int = 30) -> HistoryResponse:
        """Get historical usage data for the specified number of days.

        Args:
            days: Number of days of history to retrieve.

        Returns:
            HistoryResponse with daily statistics for the period.
        """
        entries = self._load_entries(hours_back=days * 24)

        # Group entries by date
        by_date: Dict[date, List[UsageEntry]] = defaultdict(list)
        for entry in entries:
            by_date[entry.timestamp.date()].append(entry)

        # Build daily stats
        daily_stats: List[DailyStatsResponse] = []
        for day in sorted(by_date.keys()):
            day_entries = by_date[day]
            tokens = self._calculate_token_breakdown(day_entries)
            models = list(set(e.model for e in day_entries if e.model))

            hourly: Dict[int, int] = defaultdict(int)
            for entry in day_entries:
                hourly[entry.timestamp.hour] += 1

            daily_stats.append(
                DailyStatsResponse(
                    date=day.isoformat(),
                    total_requests=len(day_entries),
                    tokens=tokens,
                    total_cost_usd=sum(e.cost_usd for e in day_entries),
                    models_used=models,
                    hourly_distribution=dict(hourly),
                )
            )

        total_tokens = sum(ds.tokens.total_tokens for ds in daily_stats)
        total_cost = sum(ds.total_cost_usd for ds in daily_stats)

        date_range: Dict[str, Optional[str]] = {
            "start": daily_stats[0].date if daily_stats else None,
            "end": daily_stats[-1].date if daily_stats else None,
        }

        return HistoryResponse(
            days_requested=days,
            days_with_data=len(daily_stats),
            daily_stats=daily_stats,
            total_tokens=total_tokens,
            total_cost_usd=total_cost,
            date_range=date_range,
        )

    def get_model_stats(self, days: int = 30) -> ModelStatsListResponse:
        """Get usage statistics broken down by model.

        Args:
            days: Number of days to analyze.

        Returns:
            ModelStatsListResponse with per-model statistics.
        """
        entries = self._load_entries(hours_back=days * 24)

        if not entries:
            return ModelStatsListResponse(
                models=[],
                total_models=0,
                period_start=None,
                period_end=None,
            )

        # Group by model
        by_model: Dict[str, List[UsageEntry]] = defaultdict(list)
        for entry in entries:
            model_key = entry.model or "unknown"
            by_model[model_key].append(entry)

        # Calculate total tokens for percentage calculation
        total_all_tokens = sum(
            e.input_tokens
            + e.output_tokens
            + e.cache_creation_tokens
            + e.cache_read_tokens
            for e in entries
        )

        model_stats: List[ModelStatsResponse] = []
        for model, model_entries in by_model.items():
            tokens = self._calculate_token_breakdown(model_entries)
            percentage = (
                (tokens.total_tokens / total_all_tokens * 100)
                if total_all_tokens > 0
                else 0.0
            )

            sorted_entries = sorted(model_entries, key=lambda e: e.timestamp)

            model_stats.append(
                ModelStatsResponse(
                    model=model,
                    total_requests=len(model_entries),
                    tokens=tokens,
                    total_cost_usd=sum(e.cost_usd for e in model_entries),
                    percentage_of_total=round(percentage, 2),
                    first_used=sorted_entries[0].timestamp if sorted_entries else None,
                    last_used=sorted_entries[-1].timestamp if sorted_entries else None,
                )
            )

        # Sort by total tokens descending
        model_stats.sort(key=lambda m: m.tokens.total_tokens, reverse=True)

        sorted_entries = sorted(entries, key=lambda e: e.timestamp)

        return ModelStatsListResponse(
            models=model_stats,
            total_models=len(model_stats),
            period_start=sorted_entries[0].timestamp if sorted_entries else None,
            period_end=sorted_entries[-1].timestamp if sorted_entries else None,
        )

    def get_project_stats(self) -> ProjectStatsListResponse:
        """Get usage statistics broken down by project.

        Note: This is a placeholder implementation. Project extraction
        would require additional parsing of the raw data paths.

        Returns:
            ProjectStatsListResponse with per-project statistics.
        """
        # Project stats would require access to file paths which
        # are not exposed by the current load_usage_entries API.
        # This returns empty for now but the structure is in place.
        return ProjectStatsListResponse(
            projects=[],
            total_projects=0,
        )

    def get_realtime_usage(self) -> RealtimeUsageResponse:
        """Get comprehensive real-time usage data.

        Returns:
            RealtimeUsageResponse with all current usage metrics.
        """
        # Load entries for session window plus some buffer
        entries = self._load_entries(hours_back=self.session_window_hours + 1)

        session_info = self._calculate_session_info(entries)
        today_stats = self.get_today_stats()
        burn_rate = self._calculate_burn_rate(entries)

        # Get recent entries (last 50)
        sorted_entries = sorted(entries, key=lambda e: e.timestamp, reverse=True)
        recent_entries = [
            self._entry_to_response(e) for e in sorted_entries[:50]
        ]

        return RealtimeUsageResponse(
            timestamp=datetime.now(tz.utc),
            session=session_info,
            today_stats=today_stats,
            burn_rate=burn_rate,
            recent_entries=recent_entries,
        )


@lru_cache
def get_data_service() -> DataService:
    """Get cached DataService instance.

    Returns:
        DataService: Singleton data service instance.
    """
    return DataService()
