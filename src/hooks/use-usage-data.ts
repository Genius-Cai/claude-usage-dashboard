'use client';

/**
 * TanStack Query hooks for usage data
 * Provides data fetching with caching, refetching, and error handling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, generateMockDashboardData, generateMockPlanUsageResponse, ApiError } from '@/lib/api';
import { useSettingsStore } from '@/stores/settings-store';
import type {
  DashboardData,
  UsageStats,
  UsageByPeriod,
  UsageByModel,
  Session,
  CurrentSession,
  PlanUsage,
  PlanUsageResponse,
  UsageFilter,
  PaginationOptions,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  all: ['usage'] as const,
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  currentSession: () => [...queryKeys.all, 'currentSession'] as const,
  planUsage: () => [...queryKeys.all, 'planUsage'] as const,
  planUsageRealtime: (plan: string) => [...queryKeys.all, 'planUsageRealtime', plan] as const,
  stats: (period: string) => [...queryKeys.all, 'stats', period] as const,
  byPeriod: (groupBy: string, start?: string, end?: string) =>
    [...queryKeys.all, 'byPeriod', groupBy, start, end] as const,
  byModel: (start?: string, end?: string) =>
    [...queryKeys.all, 'byModel', start, end] as const,
  sessions: (pagination?: PaginationOptions) =>
    [...queryKeys.all, 'sessions', pagination] as const,
  recentSessions: (limit: number) =>
    [...queryKeys.all, 'recentSessions', limit] as const,
  session: (id: string) => [...queryKeys.all, 'session', id] as const,
};

// ============================================================================
// Configuration
// ============================================================================

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// ============================================================================
// Dashboard Hook
// ============================================================================

interface UseDashboardDataOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching main dashboard data
 */
export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { display } = useSettingsStore();
  const {
    refetchInterval = display.refreshInterval * 1000,
    enabled = true,
  } = options;

  return useQuery<DashboardData, ApiError>({
    queryKey: queryKeys.dashboard(),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return generateMockDashboardData();
      }
      return api.dashboard.fetch();
    },
    refetchInterval,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    retry: 3,
  });
}

// ============================================================================
// Current Session Hook
// ============================================================================

interface UseCurrentSessionOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching current session data
 */
export function useCurrentSession(options: UseCurrentSessionOptions = {}) {
  const { display } = useSettingsStore();
  const {
    refetchInterval = display.refreshInterval * 1000,
    enabled = true,
  } = options;

  return useQuery<CurrentSession | null, ApiError>({
    queryKey: queryKeys.currentSession(),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockDashboardData();
        return mockData.currentSession;
      }
      return api.dashboard.fetchCurrentSession();
    },
    refetchInterval,
    enabled,
    staleTime: 10 * 1000, // 10 seconds
  });
}

// ============================================================================
// Plan Usage Hook
// ============================================================================

/**
 * Hook for fetching plan usage information
 */
export function usePlanUsage() {
  return useQuery<PlanUsage, ApiError>({
    queryKey: queryKeys.planUsage(),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockDashboardData();
        return mockData.planUsage;
      }
      return api.dashboard.fetchPlanUsage();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Plan Usage Realtime Hook (matching claude-monitor CLI)
// ============================================================================

interface UsePlanUsageRealtimeOptions {
  plan?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching real-time plan usage vs limits
 * This matches the claude-monitor CLI output format
 */
export function usePlanUsageRealtime(options: UsePlanUsageRealtimeOptions = {}) {
  const { display } = useSettingsStore();
  const {
    plan = 'max20',
    refetchInterval = display.refreshInterval * 1000,
    enabled = true,
  } = options;

  return useQuery<PlanUsageResponse, ApiError>({
    queryKey: queryKeys.planUsageRealtime(plan),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return generateMockPlanUsageResponse();
      }
      return api.dashboard.fetchPlanUsageRealtime(plan);
    },
    refetchInterval,
    enabled,
    staleTime: 10 * 1000, // 10 seconds
    retry: 3,
  });
}

// ============================================================================
// Usage Stats Hook
// ============================================================================

type StatsPeriod = 'today' | 'week' | 'month' | 'year';

interface UseUsageStatsOptions {
  period?: StatsPeriod;
  enabled?: boolean;
}

/**
 * Hook for fetching usage statistics
 */
export function useUsageStats(options: UseUsageStatsOptions = {}) {
  const { period = 'today', enabled = true } = options;

  return useQuery<UsageStats, ApiError>({
    queryKey: queryKeys.stats(period),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockDashboardData();
        switch (period) {
          case 'week':
            return mockData.weekStats;
          case 'month':
            return mockData.monthStats;
          default:
            return mockData.todayStats;
        }
      }
      return api.usage.fetchStats(period);
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Usage By Period Hook
// ============================================================================

type GroupBy = 'hour' | 'day' | 'week' | 'month';

interface UseUsageByPeriodOptions {
  groupBy?: GroupBy;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching usage data grouped by time period
 */
export function useUsageByPeriod(options: UseUsageByPeriodOptions = {}) {
  const { groupBy = 'day', startDate, endDate, enabled = true } = options;

  return useQuery<UsageByPeriod[], ApiError>({
    queryKey: queryKeys.byPeriod(groupBy, startDate, endDate),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockDashboardData();
        return groupBy === 'hour' ? mockData.usageByHour : mockData.usageByDay;
      }
      return api.usage.fetchByPeriod(groupBy, startDate, endDate);
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// Usage By Model Hook
// ============================================================================

interface UseUsageByModelOptions {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching usage data grouped by model
 */
export function useUsageByModel(options: UseUsageByModelOptions = {}) {
  const { startDate, endDate, enabled = true } = options;

  return useQuery<UsageByModel[], ApiError>({
    queryKey: queryKeys.byModel(startDate, endDate),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockDashboardData();
        return mockData.usageByModel;
      }
      return api.usage.fetchByModel(startDate, endDate);
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Sessions Hook
// ============================================================================

interface UseSessionsOptions {
  pagination?: PaginationOptions;
  enabled?: boolean;
}

/**
 * Hook for fetching sessions with pagination
 */
export function useSessions(options: UseSessionsOptions = {}) {
  const { pagination, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.sessions(pagination),
    queryFn: () => api.sessions.fetch(pagination),
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for fetching recent sessions
 */
export function useRecentSessions(limit: number = 10) {
  return useQuery<Session[], ApiError>({
    queryKey: queryKeys.recentSessions(limit),
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockDashboardData();
        return mockData.recentSessions;
      }
      return api.sessions.fetchRecent(limit);
    },
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Refresh Hook
// ============================================================================

/**
 * Hook for manual data refresh
 */
export function useRefreshData() {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.all });
  };

  const refreshDashboard = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
  };

  const refreshSession = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.currentSession() });
  };

  return {
    refresh,
    refreshDashboard,
    refreshSession,
    isRefreshing: queryClient.isFetching({ queryKey: queryKeys.all }) > 0,
  };
}

// ============================================================================
// Combined Dashboard Hook
// ============================================================================

/**
 * Combined hook for all dashboard data
 */
export function useDashboard() {
  const dashboardQuery = useDashboardData();
  const sessionQuery = useCurrentSession();
  const planUsageQuery = usePlanUsage();
  const { refresh, isRefreshing } = useRefreshData();

  return {
    data: dashboardQuery.data,
    session: sessionQuery.data,
    planUsage: planUsageQuery.data,
    isLoading:
      dashboardQuery.isLoading ||
      sessionQuery.isLoading ||
      planUsageQuery.isLoading,
    isError:
      dashboardQuery.isError || sessionQuery.isError || planUsageQuery.isError,
    error: dashboardQuery.error || sessionQuery.error || planUsageQuery.error,
    refresh,
    isRefreshing,
  };
}
