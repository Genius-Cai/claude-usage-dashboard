/**
 * Tests for use-usage-data hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { queryKeys } from '@/hooks/use-usage-data';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    dashboard: {
      fetch: vi.fn(),
      fetchCurrentSession: vi.fn(),
      fetchPlanUsage: vi.fn(),
      fetchPlanUsageRealtime: vi.fn(),
    },
    usage: {
      fetchStats: vi.fn(),
      fetchByPeriod: vi.fn(),
      fetchByModel: vi.fn(),
    },
    sessions: {
      fetch: vi.fn(),
      fetchRecent: vi.fn(),
    },
  },
  generateMockDashboardData: vi.fn(),
  ApiError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock settings store
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: () => ({
    display: {
      refreshInterval: 30,
    },
  }),
}));

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

describe('queryKeys', () => {
  describe('all', () => {
    it('should return base query key', () => {
      expect(queryKeys.all).toEqual(['usage']);
    });
  });

  describe('dashboard', () => {
    it('should return dashboard query key', () => {
      expect(queryKeys.dashboard()).toEqual(['usage', 'dashboard']);
    });
  });

  describe('currentSession', () => {
    it('should return currentSession query key', () => {
      expect(queryKeys.currentSession()).toEqual(['usage', 'currentSession']);
    });
  });

  describe('planUsage', () => {
    it('should return planUsage query key', () => {
      expect(queryKeys.planUsage()).toEqual(['usage', 'planUsage']);
    });
  });

  describe('planUsageRealtime', () => {
    it('should include plan in query key', () => {
      expect(queryKeys.planUsageRealtime('max20')).toEqual(['usage', 'planUsageRealtime', 'max20']);
    });

    it('should differentiate between plans', () => {
      expect(queryKeys.planUsageRealtime('pro')).not.toEqual(
        queryKeys.planUsageRealtime('max20')
      );
    });
  });

  describe('stats', () => {
    it('should include period in query key', () => {
      expect(queryKeys.stats('today')).toEqual(['usage', 'stats', 'today']);
      expect(queryKeys.stats('week')).toEqual(['usage', 'stats', 'week']);
      expect(queryKeys.stats('month')).toEqual(['usage', 'stats', 'month']);
    });
  });

  describe('byPeriod', () => {
    it('should include groupBy and dates in query key', () => {
      expect(queryKeys.byPeriod('day')).toEqual(['usage', 'byPeriod', 'day', undefined, undefined]);
      expect(queryKeys.byPeriod('hour', '2024-01-01', '2024-01-31')).toEqual([
        'usage', 'byPeriod', 'hour', '2024-01-01', '2024-01-31'
      ]);
    });
  });

  describe('byModel', () => {
    it('should include dates in query key', () => {
      expect(queryKeys.byModel()).toEqual(['usage', 'byModel', undefined, undefined]);
      expect(queryKeys.byModel('2024-01-01', '2024-01-31')).toEqual([
        'usage', 'byModel', '2024-01-01', '2024-01-31'
      ]);
    });
  });

  describe('sessions', () => {
    it('should include pagination in query key', () => {
      expect(queryKeys.sessions()).toEqual(['usage', 'sessions', undefined]);
      expect(queryKeys.sessions({ page: 1, limit: 10 })).toEqual([
        'usage', 'sessions', { page: 1, limit: 10 }
      ]);
    });
  });

  describe('recentSessions', () => {
    it('should include limit in query key', () => {
      expect(queryKeys.recentSessions(5)).toEqual(['usage', 'recentSessions', 5]);
      expect(queryKeys.recentSessions(10)).toEqual(['usage', 'recentSessions', 10]);
    });
  });

  describe('session', () => {
    it('should include session id in query key', () => {
      expect(queryKeys.session('abc123')).toEqual(['usage', 'session', 'abc123']);
    });
  });
});

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch dashboard data', async () => {
    const mockData = {
      totalTokens: 1000,
      totalCost: 5.50,
    };

    const { api } = await import('@/lib/api');
    vi.mocked(api.dashboard.fetch).mockResolvedValue(mockData);

    const { useDashboardData } = await import('@/hooks/use-usage-data');

    const { result } = renderHook(() => useDashboardData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(api.dashboard.fetch).toHaveBeenCalledTimes(1);
  });

  it('should respect enabled option', async () => {
    const { api } = await import('@/lib/api');
    const { useDashboardData } = await import('@/hooks/use-usage-data');

    renderHook(() => useDashboardData({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(api.dashboard.fetch).not.toHaveBeenCalled();
  });
});

describe('usePlanUsageRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch plan usage with default plan', async () => {
    const mockData = {
      plan: { plan: 'max20', display_name: 'Max (20x)' },
      cost_usage: { percentage: 5.0, formatted_current: '$5.00' },
      token_usage: { percentage: 10.0, formatted_current: '100,000' },
    };

    const { api } = await import('@/lib/api');
    vi.mocked(api.dashboard.fetchPlanUsageRealtime).mockResolvedValue(mockData);

    const { usePlanUsageRealtime } = await import('@/hooks/use-usage-data');

    const { result } = renderHook(() => usePlanUsageRealtime(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(api.dashboard.fetchPlanUsageRealtime).toHaveBeenCalledWith('max20');
  });

  it('should use specified plan', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.dashboard.fetchPlanUsageRealtime).mockResolvedValue({});

    const { usePlanUsageRealtime } = await import('@/hooks/use-usage-data');

    renderHook(() => usePlanUsageRealtime({ plan: 'pro' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.dashboard.fetchPlanUsageRealtime).toHaveBeenCalledWith('pro');
    });
  });
});

describe('useUsageStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch stats with default period', async () => {
    const mockData = {
      totalTokens: 5000,
      totalCost: 1.25,
    };

    const { api } = await import('@/lib/api');
    vi.mocked(api.usage.fetchStats).mockResolvedValue(mockData);

    const { useUsageStats } = await import('@/hooks/use-usage-data');

    const { result } = renderHook(() => useUsageStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.usage.fetchStats).toHaveBeenCalledWith('today');
  });

  it('should fetch stats with specified period', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.usage.fetchStats).mockResolvedValue({});

    const { useUsageStats } = await import('@/hooks/use-usage-data');

    renderHook(() => useUsageStats({ period: 'week' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.usage.fetchStats).toHaveBeenCalledWith('week');
    });
  });
});

describe('useUsageByPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch usage by period with default groupBy', async () => {
    const mockData = [
      { period: '2024-01-01', totalTokens: 1000, cost: 0.5 },
      { period: '2024-01-02', totalTokens: 1500, cost: 0.75 },
    ];

    const { api } = await import('@/lib/api');
    vi.mocked(api.usage.fetchByPeriod).mockResolvedValue(mockData);

    const { useUsageByPeriod } = await import('@/hooks/use-usage-data');

    const { result } = renderHook(() => useUsageByPeriod(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.usage.fetchByPeriod).toHaveBeenCalledWith('day', undefined, undefined);
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useUsageByModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch usage by model', async () => {
    const mockData = [
      { model: 'claude-sonnet-4', tokens: 5000, cost: 2.5 },
      { model: 'claude-3-5-haiku', tokens: 2000, cost: 0.5 },
    ];

    const { api } = await import('@/lib/api');
    vi.mocked(api.usage.fetchByModel).mockResolvedValue(mockData);

    const { useUsageByModel } = await import('@/hooks/use-usage-data');

    const { result } = renderHook(() => useUsageByModel(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.usage.fetchByModel).toHaveBeenCalledWith(undefined, undefined);
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useRefreshData', () => {
  it('should provide refresh functions', async () => {
    const { useRefreshData } = await import('@/hooks/use-usage-data');

    const { result } = renderHook(() => useRefreshData(), {
      wrapper: createWrapper(),
    });

    expect(result.current.refresh).toBeDefined();
    expect(result.current.refreshDashboard).toBeDefined();
    expect(result.current.refreshSession).toBeDefined();
    expect(typeof result.current.isRefreshing).toBe('boolean');
  });
});
