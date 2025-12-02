"""WebSocket endpoint for real-time usage data streaming.

This module provides a WebSocket endpoint that broadcasts
real-time usage data to connected clients at regular intervals.
"""

import asyncio
import json
import logging
from datetime import datetime
from datetime import timezone as tz
from typing import Any, Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.services.data_service import get_data_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manager for WebSocket connections.

    Handles connection lifecycle, message broadcasting,
    and graceful disconnection of clients.
    """

    def __init__(self) -> None:
        """Initialize the connection manager."""
        self._active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection to register.
        """
        await websocket.accept()
        async with self._lock:
            self._active_connections.add(websocket)
        logger.info(
            f"WebSocket connected. Active connections: {len(self._active_connections)}"
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from the active set.

        Args:
            websocket: The WebSocket connection to remove.
        """
        async with self._lock:
            self._active_connections.discard(websocket)
        logger.info(
            f"WebSocket disconnected. Active connections: {len(self._active_connections)}"
        )

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Broadcast a message to all connected clients.

        Args:
            message: The message dictionary to broadcast.
        """
        if not self._active_connections:
            return

        # Serialize once for all connections
        json_message = json.dumps(message, default=str)

        # Create a copy of connections to iterate safely
        async with self._lock:
            connections = list(self._active_connections)

        disconnected: Set[WebSocket] = set()

        for connection in connections:
            try:
                await connection.send_text(json_message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                disconnected.add(connection)

        # Clean up disconnected clients
        if disconnected:
            async with self._lock:
                self._active_connections -= disconnected

    @property
    def connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self._active_connections)


# Global connection manager instance
manager = ConnectionManager()


async def get_realtime_data() -> Dict[str, Any]:
    """Fetch real-time usage data for broadcasting.

    Returns:
        Dictionary containing real-time usage data.
    """
    try:
        data_service = get_data_service()
        realtime = data_service.get_realtime_usage()

        # Convert to dictionary for JSON serialization
        return {
            "type": "realtime_update",
            "timestamp": realtime.timestamp.isoformat(),
            "session": {
                "session_start": (
                    realtime.session.session_start.isoformat()
                    if realtime.session.session_start
                    else None
                ),
                "session_end": (
                    realtime.session.session_end.isoformat()
                    if realtime.session.session_end
                    else None
                ),
                "remaining_minutes": realtime.session.remaining_minutes,
                "remaining_formatted": realtime.session.remaining_formatted,
                "is_active": realtime.session.is_active,
                "tokens_in_window": realtime.session.tokens_in_window,
                "cost_in_window": realtime.session.cost_in_window,
            },
            "today_stats": {
                "date": realtime.today_stats.date,
                "total_requests": realtime.today_stats.total_requests,
                "tokens": {
                    "input_tokens": realtime.today_stats.tokens.input_tokens,
                    "output_tokens": realtime.today_stats.tokens.output_tokens,
                    "cache_creation_tokens": realtime.today_stats.tokens.cache_creation_tokens,
                    "cache_read_tokens": realtime.today_stats.tokens.cache_read_tokens,
                    "total_tokens": realtime.today_stats.tokens.total_tokens,
                },
                "total_cost_usd": realtime.today_stats.total_cost_usd,
                "models_used": realtime.today_stats.models_used,
            },
            "burn_rate": {
                "tokens_per_minute": realtime.burn_rate.tokens_per_minute,
                "cost_per_hour": realtime.burn_rate.cost_per_hour,
            },
            "recent_entries_count": len(realtime.recent_entries),
        }
    except Exception as e:
        logger.error(f"Error fetching realtime data: {e}")
        return {
            "type": "error",
            "timestamp": datetime.now(tz.utc).isoformat(),
            "error": str(e),
        }


async def broadcast_loop() -> None:
    """Background task that broadcasts data at regular intervals."""
    settings = get_settings()
    interval = settings.WEBSOCKET_BROADCAST_INTERVAL

    while True:
        try:
            if manager.connection_count > 0:
                data = await get_realtime_data()
                await manager.broadcast(data)
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            logger.info("Broadcast loop cancelled")
            break
        except Exception as e:
            logger.error(f"Error in broadcast loop: {e}")
            await asyncio.sleep(interval)


# Background task reference
_broadcast_task: asyncio.Task | None = None


def start_broadcast_task() -> None:
    """Start the background broadcast task."""
    global _broadcast_task
    if _broadcast_task is None or _broadcast_task.done():
        _broadcast_task = asyncio.create_task(broadcast_loop())
        logger.info("Started WebSocket broadcast task")


def stop_broadcast_task() -> None:
    """Stop the background broadcast task."""
    global _broadcast_task
    if _broadcast_task and not _broadcast_task.done():
        _broadcast_task.cancel()
        logger.info("Stopped WebSocket broadcast task")


@router.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time usage data.

    Clients connecting to this endpoint will receive real-time
    usage data broadcasts every 10 seconds (configurable).

    Protocol:
    - On connection: Client receives immediate data snapshot
    - Every interval: Client receives updated data
    - Messages are JSON formatted

    Message types:
    - realtime_update: Regular data broadcast
    - error: Error occurred during data fetch
    - welcome: Initial connection acknowledgment
    """
    await manager.connect(websocket)

    # Ensure broadcast task is running
    start_broadcast_task()

    try:
        # Send initial welcome message
        welcome = {
            "type": "welcome",
            "timestamp": datetime.now(tz.utc).isoformat(),
            "message": "Connected to Claude Usage Dashboard real-time feed",
            "broadcast_interval_seconds": get_settings().WEBSOCKET_BROADCAST_INTERVAL,
        }
        await websocket.send_json(welcome)

        # Send immediate data snapshot
        initial_data = await get_realtime_data()
        await websocket.send_json(initial_data)

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for client messages (heartbeat, commands)
                message = await websocket.receive_text()

                # Handle ping/pong for connection keep-alive
                if message == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now(tz.utc).isoformat(),
                    })
                elif message == "refresh":
                    # Client requested immediate refresh
                    data = await get_realtime_data()
                    await websocket.send_json(data)

            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket)
