/**
 * Tests for use-websocket hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock WebSocket - Store reference for tests
let mockWsInstance: MockWebSocket | null = null;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.OPEN;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    mockWsInstance = self;
    // Simulate async connection
    setTimeout(() => {
      if (self.onopen) {
        self.onopen(new Event('open'));
      }
    }, 10);
  }

  send = vi.fn();

  close = vi.fn().mockImplementation(() => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    self.readyState = MockWebSocket.CLOSED;
    if (self.onclose) {
      self.onclose(new CloseEvent('close'));
    }
  });

  // Helper to simulate receiving a message
  simulateMessage = (data: object) => {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  };

  // Helper to simulate error
  simulateError = () => {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  };
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Mock queryClient methods
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

// Create wrapper for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useWebSocket', () => {
  beforeEach(() => {
    // Destroy previous WebSocket if it exists
    if (mockWsInstance) {
      try {
        mockWsInstance.close();
      } catch {}
    }
    mockWsInstance = null;
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Cleanup WebSocket instance
    if (mockWsInstance) {
      try {
        mockWsInstance.close();
      } catch {}
    }
    mockWsInstance = null;
    vi.useRealTimers();
  });

  it('should start in disconnected state when disabled', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(() => useWebSocket({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect when enabled', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');
    const onConnect = vi.fn();

    const { result } = renderHook(
      () => useWebSocket({ enabled: true, onConnect }),
      { wrapper: createWrapper() }
    );

    expect(result.current.status).toBe('connecting');

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(onConnect).toHaveBeenCalled();
  });

  it('should handle disconnect', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');
    const onDisconnect = vi.fn();

    const { result } = renderHook(
      () => useWebSocket({ enabled: true, onDisconnect }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);

    // Disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should send messages when connected', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(
      () => useWebSocket({ enabled: true }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const testMessage = { type: 'ping' as const };

    act(() => {
      result.current.send(testMessage);
    });

    expect(mockWsInstance?.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });

  it('should handle incoming usage_update messages', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');
    const onUsageUpdate = vi.fn();

    const { result } = renderHook(
      () => useWebSocket({ enabled: true, onUsageUpdate }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const usagePayload = {
      tokens: {
        inputTokens: 1000,
        outputTokens: 2000,
        totalTokens: 3000,
      },
      cost: {
        inputCost: 0.01,
        outputCost: 0.05,
        totalCost: 0.06,
      },
      model: 'claude-sonnet-4',
    };

    act(() => {
      mockWsInstance?.simulateMessage({
        type: 'usage_update',
        payload: usagePayload,
        timestamp: new Date().toISOString(),
      });
    });

    expect(onUsageUpdate).toHaveBeenCalledWith(usagePayload);
    expect(result.current.lastMessage).toBeDefined();
    expect(result.current.lastMessage?.type).toBe('usage_update');
  });

  it('should handle incoming session_update messages', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');
    const onSessionUpdate = vi.fn();

    renderHook(
      () => useWebSocket({ enabled: true, onSessionUpdate }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const sessionPayload = {
      session: {
        id: 'session-1',
        startTime: new Date().toISOString(),
        status: 'active',
        totalTokens: 50000,
        totalCost: 2.5,
        requestCount: 25,
        lastActivityTime: new Date().toISOString(),
        remainingTime: 3600,
        usagePercentage: 50,
        isNearLimit: false,
      },
    };

    act(() => {
      mockWsInstance?.simulateMessage({
        type: 'session_update',
        payload: sessionPayload,
        timestamp: new Date().toISOString(),
      });
    });

    expect(onSessionUpdate).toHaveBeenCalledWith(sessionPayload);
  });

  it('should handle incoming limit_warning messages', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');
    const onLimitWarning = vi.fn();

    renderHook(
      () => useWebSocket({ enabled: true, onLimitWarning }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const warningPayload = {
      type: 'token_limit',
      percentage: 85,
      message: 'You have used 85% of your token limit',
    };

    act(() => {
      mockWsInstance?.simulateMessage({
        type: 'limit_warning',
        payload: warningPayload,
        timestamp: new Date().toISOString(),
      });
    });

    expect(onLimitWarning).toHaveBeenCalledWith(warningPayload);
  });

  it('should handle error messages', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');
    const onError = vi.fn();

    const { result } = renderHook(
      () => useWebSocket({ enabled: true, onError }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    act(() => {
      mockWsInstance?.simulateMessage({
        type: 'error',
        payload: { message: 'Something went wrong' },
        timestamp: new Date().toISOString(),
      });
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Something went wrong');
  });

  it('should handle invalid JSON gracefully', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(
      () => useWebSocket({ enabled: true }),
      { wrapper: createWrapper() }
    );

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Send invalid JSON - should not throw
    act(() => {
      if (mockWsInstance?.onmessage) {
        mockWsInstance.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
    });

    // Should not crash
    expect(result.current.isConnected).toBe(true);
  });

  it('should expose connect and disconnect functions', async () => {
    const { useWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(
      () => useWebSocket({ enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.send).toBe('function');
  });
});

describe('useSimulatedWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start disconnected', async () => {
    const { useSimulatedWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(() => useSimulatedWebSocket(), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect when connect is called', async () => {
    const { useSimulatedWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(() => useSimulatedWebSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should disconnect when disconnect is called', async () => {
    const { useSimulatedWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(() => useSimulatedWebSocket(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should always report no error', async () => {
    const { useSimulatedWebSocket } = await import('@/hooks/use-websocket');

    const { result } = renderHook(() => useSimulatedWebSocket(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBeNull();

    act(() => {
      result.current.connect();
    });

    expect(result.current.error).toBeNull();
  });
});
