"""Application configuration using Pydantic Settings.

This module provides centralized configuration management for the Claude Usage
Dashboard backend, supporting environment variables and .env file loading.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Attributes:
        CLAUDE_DATA_PATH: Path to Claude's usage data directory.
            Defaults to ~/.claude/projects
        CORS_ORIGINS: List of allowed CORS origins for cross-origin requests.
        DEBUG: Enable debug mode for development.
        API_PREFIX: URL prefix for all API routes.
        SESSION_WINDOW_HOURS: Rolling window duration for session calculations.
        WEBSOCKET_BROADCAST_INTERVAL: Seconds between WebSocket broadcasts.
        LOG_LEVEL: Logging level for the application.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Data source configuration
    CLAUDE_DATA_PATH: str = str(Path.home() / ".claude" / "projects")

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Application settings
    DEBUG: bool = False
    API_PREFIX: str = "/api"
    APP_NAME: str = "Claude Usage Dashboard API"
    APP_VERSION: str = "0.1.0"

    # Session configuration
    SESSION_WINDOW_HOURS: int = 5

    # WebSocket configuration
    WEBSOCKET_BROADCAST_INTERVAL: int = 10  # seconds

    # Logging configuration
    LOG_LEVEL: str = "INFO"

    def get_data_path(self) -> Path:
        """Get the Claude data path as a Path object.

        Returns:
            Path: Resolved and expanded path to the Claude data directory.
        """
        return Path(self.CLAUDE_DATA_PATH).expanduser().resolve()

    def is_data_path_valid(self) -> bool:
        """Check if the configured data path exists and is readable.

        Returns:
            bool: True if the path exists and is a directory.
        """
        path = self.get_data_path()
        return path.exists() and path.is_dir()


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings instance.

    Uses LRU cache to ensure settings are loaded only once
    during the application lifecycle.

    Returns:
        Settings: The application settings instance.
    """
    return Settings()
