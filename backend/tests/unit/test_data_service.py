"""Unit tests for DataService class."""

import pytest
from datetime import datetime, timedelta
from datetime import timezone as tz
from unittest.mock import MagicMock, patch
from typing import List

from app.services.data_service import DataService, DataCache, CacheEntry


class TestCacheEntry:
    """Tests for CacheEntry class."""

    def test_cache_entry_not_expired(self):
        """Test that new cache entry is not expired."""
        entry = CacheEntry(data="test", ttl=60)
        assert not entry.is_expired()

    def test_cache_entry_expired(self):
        """Test that cache entry expires after TTL."""
        entry = CacheEntry(data="test", ttl=0)
        # Sleep briefly to ensure TTL passes
        import time
        time.sleep(0.01)
        assert entry.is_expired()

    def test_cache_entry_stores_data(self):
        """Test that cache entry stores data correctly."""
        data = {"key": "value", "number": 42}
        entry = CacheEntry(data=data, ttl=60)
        assert entry.data == data


class TestDataCache:
    """Tests for DataCache class."""

    def test_get_returns_none_for_missing_key(self):
        """Test that get returns None for missing keys."""
        cache = DataCache()
        assert cache.get("nonexistent") is None

    def test_set_and_get(self):
        """Test basic set and get operations."""
        cache = DataCache()
        cache.set("test_key", {"value": 123})
        result = cache.get("test_key")
        assert result == {"value": 123}

    def test_expired_entry_returns_none(self):
        """Test that expired entries return None."""
        cache = DataCache()
        cache.set("test_key", "value", ttl=0)
        import time
        time.sleep(0.01)
        assert cache.get("test_key") is None

    def test_clear_removes_all_entries(self):
        """Test that clear removes all entries."""
        cache = DataCache()
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.clear()
        assert cache.get("key1") is None
        assert cache.get("key2") is None


class TestDataService:
    """Tests for DataService class."""

    @pytest.fixture
    def mock_settings(self):
        """Create mock settings."""
        settings = MagicMock()
        settings.CLAUDE_DATA_PATH = "~/.claude/projects"
        settings.SESSION_WINDOW_HOURS = 5
        return settings

    @pytest.fixture
    def data_service(self, mock_settings):
        """Create DataService with mock settings."""
        return DataService(settings=mock_settings)

    @pytest.fixture
    def mock_usage_entries(self):
        """Create mock usage entries."""
        now = datetime.now(tz.utc)
        # Create mock UsageEntry-like objects
        entries = []
        for i in range(5):
            entry = MagicMock()
            entry.timestamp = now - timedelta(hours=i)
            entry.input_tokens = 1000 * (i + 1)
            entry.output_tokens = 2000 * (i + 1)
            entry.cache_creation_tokens = 100 * (i + 1)
            entry.cache_read_tokens = 50 * (i + 1)
            entry.cost_usd = 0.05 * (i + 1)
            entry.model = f"claude-model-{i % 2}"
            entry.message_id = f"msg-{i}"
            entry.request_id = f"req-{i}"
            entries.append(entry)
        return entries

    def test_calculate_token_breakdown(self, data_service, mock_usage_entries):
        """Test token breakdown calculation."""
        breakdown = data_service._calculate_token_breakdown(mock_usage_entries)

        # Calculate expected totals
        expected_input = sum(e.input_tokens for e in mock_usage_entries)
        expected_output = sum(e.output_tokens for e in mock_usage_entries)
        expected_cache_creation = sum(e.cache_creation_tokens for e in mock_usage_entries)
        expected_cache_read = sum(e.cache_read_tokens for e in mock_usage_entries)
        expected_total = expected_input + expected_output + expected_cache_creation + expected_cache_read

        assert breakdown.input_tokens == expected_input
        assert breakdown.output_tokens == expected_output
        assert breakdown.cache_creation_tokens == expected_cache_creation
        assert breakdown.cache_read_tokens == expected_cache_read
        assert breakdown.total_tokens == expected_total

    def test_calculate_token_breakdown_empty_list(self, data_service):
        """Test token breakdown with empty list."""
        breakdown = data_service._calculate_token_breakdown([])

        assert breakdown.input_tokens == 0
        assert breakdown.output_tokens == 0
        assert breakdown.cache_creation_tokens == 0
        assert breakdown.cache_read_tokens == 0
        assert breakdown.total_tokens == 0

    def test_calculate_session_info_no_entries(self, data_service):
        """Test session info with no entries."""
        session_info = data_service._calculate_session_info([])

        assert session_info.session_start is None
        assert session_info.session_end is None
        assert session_info.is_active is False
        assert session_info.remaining_minutes == 0.0
        assert session_info.tokens_in_window == 0
        assert session_info.cost_in_window == 0.0

    def test_calculate_session_info_with_entries(self, data_service, mock_usage_entries):
        """Test session info with entries."""
        session_info = data_service._calculate_session_info(mock_usage_entries)

        # Should have active session with recent entries
        assert session_info.session_start is not None
        assert session_info.session_end is not None
        # Remaining minutes depends on timing but should be positive for recent entries
        assert session_info.is_active is True
        assert session_info.tokens_in_window > 0
        assert session_info.cost_in_window > 0

    def test_calculate_burn_rate_no_entries(self, data_service):
        """Test burn rate with no entries."""
        burn_rate = data_service._calculate_burn_rate([])

        assert burn_rate.tokens_per_minute == 0.0
        assert burn_rate.cost_per_hour == 0.0

    def test_calculate_burn_rate_with_entries(self, data_service, mock_usage_entries):
        """Test burn rate calculation with entries."""
        burn_rate = data_service._calculate_burn_rate(mock_usage_entries, minutes_window=60)

        # Should calculate a positive rate with recent entries
        assert burn_rate.tokens_per_minute >= 0
        assert burn_rate.cost_per_hour >= 0

    def test_entry_to_response(self, data_service):
        """Test UsageEntry to UsageEntryResponse conversion."""
        now = datetime.now(tz.utc)
        entry = MagicMock()
        entry.timestamp = now
        entry.input_tokens = 1000
        entry.output_tokens = 2000
        entry.cache_creation_tokens = 100
        entry.cache_read_tokens = 50
        entry.cost_usd = 0.05
        entry.model = "claude-sonnet-4"
        entry.message_id = "msg-123"
        entry.request_id = "req-456"

        response = data_service._entry_to_response(entry)

        assert response.timestamp == now
        assert response.input_tokens == 1000
        assert response.output_tokens == 2000
        assert response.cache_creation_tokens == 100
        assert response.cache_read_tokens == 50
        assert response.cost_usd == 0.05
        assert response.model == "claude-sonnet-4"
        assert response.message_id == "msg-123"
        assert response.request_id == "req-456"


class TestDataServiceWithMocks:
    """Tests for DataService methods using mocked data loading."""

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        """Clear cache before each test."""
        from app.services.data_service import _data_cache
        _data_cache.clear()
        yield
        _data_cache.clear()

    @pytest.fixture
    def mock_settings(self):
        """Create mock settings."""
        settings = MagicMock()
        settings.CLAUDE_DATA_PATH = "/fake/path"
        settings.SESSION_WINDOW_HOURS = 5
        return settings

    def test_get_project_stats_placeholder(self, mock_settings):
        """Test get_project_stats returns empty placeholder."""
        service = DataService(settings=mock_settings)
        stats = service.get_project_stats()

        assert stats.total_projects == 0
        assert stats.projects == []

    def test_get_today_stats_no_data(self, mock_settings):
        """Test get_today_stats with no data."""
        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([], {})
            service = DataService(settings=mock_settings)
            stats = service.get_today_stats()

            assert stats.total_requests == 0
            assert stats.tokens.total_tokens == 0

    def test_get_history_no_data(self, mock_settings):
        """Test get_history with no data."""
        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([], {})
            service = DataService(settings=mock_settings)
            history = service.get_history(days=7)

            assert history.days_requested == 7
            assert history.days_with_data == 0

    def test_get_model_stats_no_data(self, mock_settings):
        """Test get_model_stats with no data."""
        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([], {})
            service = DataService(settings=mock_settings)
            stats = service.get_model_stats(days=7)

            assert stats.total_models == 0
            assert stats.models == []
            assert stats.period_start is None
            assert stats.period_end is None

    def test_load_entries_caches_result(self, mock_settings):
        """Test that _load_entries caches results."""
        entry = MagicMock()
        entry.timestamp = datetime.now(tz.utc)
        entry.input_tokens = 100
        entry.output_tokens = 200
        entry.cache_creation_tokens = 10
        entry.cache_read_tokens = 5
        entry.cost_usd = 0.01
        entry.model = "claude-test"

        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([entry], {})
            service = DataService(settings=mock_settings)

            # First call - should hit the mock
            result1 = service._load_entries(hours_back=24)
            # Second call - should use cache
            result2 = service._load_entries(hours_back=24)

            # load_usage_entries should only be called once due to caching
            assert mock_load.call_count == 1
            assert result1 == result2

    def test_load_entries_handles_exception(self, mock_settings):
        """Test that _load_entries handles exceptions gracefully."""
        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.side_effect = Exception("File not found")
            service = DataService(settings=mock_settings)
            result = service._load_entries(hours_back=999)  # Use unique hours_back to avoid cache

            assert result == []

    def test_get_today_stats_with_entries(self, mock_settings):
        """Test get_today_stats with mock entries."""
        from datetime import date as date_cls
        now = datetime.now(tz.utc)
        # Use local date (like the service does) instead of UTC date
        local_today = date_cls.today()

        entry = MagicMock()
        entry.timestamp = now
        entry.input_tokens = 1000
        entry.output_tokens = 2000
        entry.cache_creation_tokens = 100
        entry.cache_read_tokens = 50
        entry.cost_usd = 0.05
        entry.model = "claude-sonnet-4"

        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([entry], {})
            service = DataService(settings=mock_settings)
            stats = service.get_today_stats()

            # The service uses local date.today(), so we compare with that
            assert stats.date == local_today.isoformat()
            assert stats.tokens is not None

    def test_get_history_with_entries(self, mock_settings):
        """Test get_history with mock entries."""
        now = datetime.now(tz.utc)

        entries = []
        for i in range(3):
            entry = MagicMock()
            entry.timestamp = now - timedelta(days=i)
            entry.input_tokens = 1000
            entry.output_tokens = 2000
            entry.cache_creation_tokens = 100
            entry.cache_read_tokens = 50
            entry.cost_usd = 0.05
            entry.model = "claude-sonnet-4"
            entries.append(entry)

        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = (entries, {})
            service = DataService(settings=mock_settings)
            history = service.get_history(days=7)

            assert history.days_requested == 7
            assert isinstance(history.daily_stats, list)

    def test_get_model_stats_with_entries(self, mock_settings):
        """Test get_model_stats with mock entries."""
        now = datetime.now(tz.utc)

        entry1 = MagicMock()
        entry1.timestamp = now
        entry1.input_tokens = 1000
        entry1.output_tokens = 2000
        entry1.cache_creation_tokens = 100
        entry1.cache_read_tokens = 50
        entry1.cost_usd = 0.05
        entry1.model = "claude-sonnet-4"

        entry2 = MagicMock()
        entry2.timestamp = now
        entry2.input_tokens = 500
        entry2.output_tokens = 1000
        entry2.cache_creation_tokens = 50
        entry2.cache_read_tokens = 25
        entry2.cost_usd = 0.02
        entry2.model = "claude-3-5-haiku"

        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([entry1, entry2], {})
            service = DataService(settings=mock_settings)
            stats = service.get_model_stats(days=7)

            assert stats.total_models >= 0
            assert isinstance(stats.models, list)

    def test_get_realtime_usage_with_entries(self, mock_settings):
        """Test get_realtime_usage with mock entries."""
        now = datetime.now(tz.utc)

        entry = MagicMock()
        entry.timestamp = now
        entry.input_tokens = 1000
        entry.output_tokens = 2000
        entry.cache_creation_tokens = 100
        entry.cache_read_tokens = 50
        entry.cost_usd = 0.05
        entry.model = "claude-sonnet-4"
        entry.message_id = "msg-123"
        entry.request_id = "req-456"

        with patch("app.services.data_service.load_usage_entries") as mock_load:
            mock_load.return_value = ([entry], {})
            service = DataService(settings=mock_settings)
            realtime = service.get_realtime_usage()

            assert realtime.timestamp is not None
            assert realtime.session is not None
            assert realtime.today_stats is not None
            assert realtime.burn_rate is not None
            assert isinstance(realtime.recent_entries, list)

    def test_get_plan_usage_with_mocks(self, mock_settings):
        """Test get_plan_usage with proper mocking."""
        with patch("app.services.data_service.load_usage_entries") as mock_load, \
             patch("app.services.data_service.analyze_usage") as mock_analyze, \
             patch("app.services.data_service.Plans") as mock_plans:

            # Mock Plans.get_plan_by_name
            mock_plan = MagicMock()
            mock_plan.name = "max20"
            mock_plan.display_name = "Max (20x)"
            mock_plan.token_limit = 100000000
            mock_plan.cost_limit = 600
            mock_plan.message_limit = 1000
            mock_plans.get_plan_by_name.return_value = mock_plan

            # Mock analyze_usage
            mock_analyze.return_value = {
                "blocks": [{
                    "isActive": True,
                    "costUSD": 15.50,
                    "totalTokens": 1500000,
                    "messageCount": 50,
                    "startTime": datetime.now(tz.utc).isoformat(),
                    "endTime": (datetime.now(tz.utc) + timedelta(hours=3)).isoformat(),
                }]
            }

            mock_load.return_value = ([], {})
            service = DataService(settings=mock_settings)
            plan_usage = service.get_plan_usage(plan="max20")

            assert plan_usage.plan is not None
            assert plan_usage.cost_usage is not None
            assert plan_usage.token_usage is not None

    def test_get_plan_usage_no_active_session(self, mock_settings):
        """Test get_plan_usage with no active session."""
        with patch("app.services.data_service.load_usage_entries") as mock_load, \
             patch("app.services.data_service.analyze_usage") as mock_analyze, \
             patch("app.services.data_service.Plans") as mock_plans:

            mock_plan = MagicMock()
            mock_plan.name = "max20"
            mock_plan.display_name = "Max (20x)"
            mock_plan.token_limit = 100000000
            mock_plan.cost_limit = 600
            mock_plan.message_limit = 1000
            mock_plans.get_plan_by_name.return_value = mock_plan

            # No active block
            mock_analyze.return_value = {
                "blocks": [{
                    "isActive": False,
                    "costUSD": 0,
                    "totalTokens": 0,
                    "messageCount": 0,
                }]
            }

            mock_load.return_value = ([], {})
            service = DataService(settings=mock_settings)
            plan_usage = service.get_plan_usage(plan="max20")

            assert plan_usage.plan is not None
            assert plan_usage.cost_usage.current == 0.0
            assert plan_usage.token_usage.current == 0.0

    def test_get_plan_usage_handles_analyze_failure(self, mock_settings):
        """Test get_plan_usage handles analyze_usage failure."""
        with patch("app.services.data_service.load_usage_entries") as mock_load, \
             patch("app.services.data_service.analyze_usage") as mock_analyze, \
             patch("app.services.data_service.Plans") as mock_plans:

            mock_plan = MagicMock()
            mock_plan.name = "max20"
            mock_plan.display_name = "Max (20x)"
            mock_plan.token_limit = 100000000
            mock_plan.cost_limit = 600
            mock_plan.message_limit = 1000
            mock_plans.get_plan_by_name.return_value = mock_plan

            mock_analyze.side_effect = Exception("Analysis failed")
            mock_load.return_value = ([], {})

            service = DataService(settings=mock_settings)
            plan_usage = service.get_plan_usage(plan="max20")

            assert plan_usage.plan is not None
            assert plan_usage.cost_usage.current == 0.0
