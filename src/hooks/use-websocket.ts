'use client';

/**
 * WebSocket hook for real-time updates
 * Handles connection management, reconnection, and message handling
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './use-usage-data';
import type {
  WebSocketMessage,
  WebSocketMessageType,
  UsageUpdatePayload,
  SessionUpdatePayload,
  LimitWarningPayload,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Types
// ============================================================================

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketState {
  status: ConnectionStatus;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  reconnectAttempts: number;
}

type MessageHandler<T = unknown> = (payload: T) => void;

interface UseWebSocketOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onUsageUpdate?: MessageHandler<UsageUpdatePayload>;
  onSessionUpdate?: MessageHandler<SessionUpdatePayload>;
  onLimitWarning?: MessageHandler<LimitWarningPayload>;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  send: (message: WebSocketMessage) => void;
  connect: () => void;
  disconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * WebSocket hook for real-time updates
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
    onUsageUpdate,
    onSessionUpdate,
    onLimitWarning,
  } = options;

  const queryClient = useQueryClient();
  const wsRef = React.useRef<WebSocket | null>(null);
  const heartbeatRef = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const connectRef = React.useRef<() => void>(() => {});
  const reconnectAttemptsRef = React.useRef<number>(0);

  const [state, setState] = React.useState<WebSocketState>({
    status: 'disconnected',
    lastMessage: null,
    error: null,
    reconnectAttempts: 0,
  });

  // Cleanup function
  const cleanup = React.useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Handle incoming messages
  const handleMessage = React.useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        setState((prev) => ({ ...prev, lastMessage: message }));

        // Handle different message types
        switch (message.type) {
          case 'usage_update':
            // Runtime validation before type assertion
            if (message.payload && typeof message.payload === 'object' && 'tokens' in message.payload) {
              onUsageUpdate?.(message.payload as UsageUpdatePayload);
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
              queryClient.invalidateQueries({ queryKey: queryKeys.stats('today') });
            }
            break;

          case 'session_update':
            // Runtime validation before type assertion
            if (message.payload && typeof message.payload === 'object' && 'session' in message.payload) {
              onSessionUpdate?.(message.payload as SessionUpdatePayload);
              queryClient.invalidateQueries({ queryKey: queryKeys.currentSession() });
            }
            break;

          case 'limit_warning':
            // Runtime validation before type assertion
            if (message.payload && typeof message.payload === 'object') {
              onLimitWarning?.(message.payload as LimitWarningPayload);
            }
            break;

          case 'connection_status':
            // Handle connection status updates
            break;

          case 'error': {
            const error = new Error((message.payload as { message: string }).message);
            setState((prev) => ({ ...prev, error }));
            onError?.(error);
            break;
          }

          default:
            // Unknown message type - silently ignore in production
            break;
        }
      } catch {
        // Failed to parse WebSocket message - silently ignore in production
      }
    },
    [queryClient, onUsageUpdate, onSessionUpdate, onLimitWarning, onError]
  );

  // Start heartbeat
  const startHeartbeat = React.useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  // Connect to WebSocket
  const connect = React.useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();
    setState((prev) => ({ ...prev, status: 'connecting', error: null }));

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setState((prev) => ({
          ...prev,
          status: 'connected',
          reconnectAttempts: 0,
        }));
        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onclose = () => {
        setState((prev) => ({ ...prev, status: 'disconnected' }));
        onDisconnect?.();

        // Attempt reconnection using ref to get current value
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            setState((prev) => ({
              ...prev,
              reconnectAttempts: reconnectAttemptsRef.current,
            }));
            connectRef.current();
          }, RECONNECT_INTERVAL);
        }
      };

      wsRef.current.onerror = () => {
        const error = new Error('WebSocket connection error');
        setState((prev) => ({ ...prev, status: 'error', error }));
        onError?.(error);
      };

      wsRef.current.onmessage = handleMessage;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to connect');
      setState((prev) => ({ ...prev, status: 'error', error: err }));
      onError?.(err);
    }
  }, [
    cleanup,
    handleMessage,
    onConnect,
    onDisconnect,
    onError,
    startHeartbeat,
  ]);

  // Disconnect from WebSocket
  const disconnect = React.useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = 0;
    setState((prev) => ({
      ...prev,
      status: 'disconnected',
      reconnectAttempts: 0,
    }));
  }, [cleanup]);

  // Send message
  const send = React.useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
    // Silently ignore send attempts when not connected
  }, []);

  // Keep connectRef updated with the latest connect function
  React.useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Effect to connect/disconnect based on enabled state
  React.useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return cleanup;
  }, [enabled, connect, disconnect, cleanup]);

  return {
    status: state.status,
    isConnected: state.status === 'connected',
    lastMessage: state.lastMessage,
    error: state.error,
    send,
    connect,
    disconnect,
  };
}

// ============================================================================
// Simulated WebSocket for Development
// ============================================================================

/**
 * Simulated WebSocket hook for development without a real server
 */
export function useSimulatedWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { onUsageUpdate, onSessionUpdate, onLimitWarning } = options;

  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = React.useState<WebSocketMessage | null>(
    null
  );
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const connect = React.useCallback(() => {
    setStatus('connected');

    // Simulate periodic updates
    intervalRef.current = setInterval(() => {
      const messageTypes: WebSocketMessageType[] = [
        'usage_update',
        'session_update',
      ];
      const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];

      const message: WebSocketMessage = {
        type,
        payload:
          type === 'usage_update'
            ? {
                tokens: {
                  inputTokens: Math.floor(Math.random() * 1000),
                  outputTokens: Math.floor(Math.random() * 2000),
                  cacheCreationInputTokens: 0,
                  cacheReadInputTokens: 0,
                  totalTokens: 0,
                },
                cost: {
                  inputCost: Math.random() * 0.01,
                  outputCost: Math.random() * 0.05,
                  cacheCreationCost: 0,
                  cacheReadCost: 0,
                  totalCost: 0,
                },
                model: 'claude-sonnet-4',
              }
            : {
                session: {
                  id: 'session-1',
                  startTime: new Date().toISOString(),
                  status: 'active',
                  totalTokens: Math.floor(Math.random() * 100000),
                  totalCost: Math.random() * 5,
                  requestCount: Math.floor(Math.random() * 50),
                  lastActivityTime: new Date().toISOString(),
                  remainingTime: 3600,
                  usagePercentage: Math.random() * 100,
                  isNearLimit: false,
                },
              },
        timestamp: new Date().toISOString(),
      };

      setLastMessage(message);

      if (type === 'usage_update') {
        onUsageUpdate?.(message.payload as UsageUpdatePayload);
      } else if (type === 'session_update') {
        onSessionUpdate?.(message.payload as SessionUpdatePayload);
      }
    }, 10000); // Every 10 seconds
  }, [onUsageUpdate, onSessionUpdate]);

  const disconnect = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const send = React.useCallback((_message: WebSocketMessage) => {
    // Simulated WebSocket send - no-op in development
  }, []);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    lastMessage,
    error: null,
    send,
    connect,
    disconnect,
  };
}
