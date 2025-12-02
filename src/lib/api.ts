/**
 * API client for Claude Code Usage Dashboard
 * Provides functions for fetching and managing usage data
 */

import type {
  ApiResponse,
  DashboardData,
  UsageRecord,
  Session,
  UsageStats,
  UsageByPeriod,
  UsageByModel,
  UsageFilter,
  PaginationOptions,
  PaginatedResponse,
  PlanUsage,
  CurrentSession,
  PlanUsageResponse,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.code || 'UNKNOWN_ERROR',
      errorData.message || `HTTP error ${response.status}`,
      errorData.details
    );
  }

  const data = await response.json();

  // Handle standard API response format
  if ('success' in data) {
    if (!data.success) {
      throw new ApiError(
        response.status,
        data.error?.code || 'API_ERROR',
        data.error?.message || 'API request failed',
        data.error?.details
      );
    }
    return data.data as T;
  }

  return data as T;
}

// ============================================================================
// HTTP Client
// ============================================================================

interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Make an API request with timeout support
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = API_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);
    return handleResponse<T>(response);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'TIMEOUT', 'Request timed out');
      }
      throw new ApiError(0, 'NETWORK_ERROR', error.message);
    }

    throw new ApiError(0, 'UNKNOWN_ERROR', 'An unknown error occurred');
  }
}

// ============================================================================
// Dashboard API
// ============================================================================

/**
 * Fetch main dashboard data
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  return apiRequest<DashboardData>('/dashboard');
}

/**
 * Fetch current session information
 */
export async function fetchCurrentSession(): Promise<CurrentSession | null> {
  return apiRequest<CurrentSession | null>('/session/current');
}

/**
 * Fetch plan usage information
 */
export async function fetchPlanUsage(): Promise<PlanUsage> {
  return apiRequest<PlanUsage>('/plan/usage');
}

/**
 * Fetch real-time plan usage vs limits (matching claude-monitor CLI)
 * @param plan - Plan type (pro, max5, max20, custom). Defaults to max20.
 */
export async function fetchPlanUsageRealtime(plan: string = 'max20'): Promise<PlanUsageResponse> {
  return apiRequest<PlanUsageResponse>(`/usage/plan-usage?plan=${plan}`);
}

// ============================================================================
// Usage API
// ============================================================================

/**
 * Fetch usage statistics for a time period
 */
export async function fetchUsageStats(
  period: 'today' | 'week' | 'month' | 'year' = 'today'
): Promise<UsageStats> {
  return apiRequest<UsageStats>(`/usage/stats?period=${period}`);
}

/**
 * Fetch usage records with filtering and pagination
 */
export async function fetchUsageRecords(
  filter?: UsageFilter,
  pagination?: PaginationOptions
): Promise<PaginatedResponse<UsageRecord>> {
  const params = new URLSearchParams();

  if (filter) {
    if (filter.timeRange) params.set('timeRange', filter.timeRange);
    if (filter.startDate) params.set('startDate', filter.startDate);
    if (filter.endDate) params.set('endDate', filter.endDate);
    if (filter.models?.length) params.set('models', filter.models.join(','));
    if (filter.minCost !== undefined) params.set('minCost', String(filter.minCost));
    if (filter.maxCost !== undefined) params.set('maxCost', String(filter.maxCost));
  }

  if (pagination) {
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
    if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);
  }

  const queryString = params.toString();
  return apiRequest<PaginatedResponse<UsageRecord>>(
    `/usage/records${queryString ? `?${queryString}` : ''}`
  );
}

/**
 * Fetch usage data grouped by time period
 */
export async function fetchUsageByPeriod(
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
  startDate?: string,
  endDate?: string
): Promise<UsageByPeriod[]> {
  const params = new URLSearchParams({ groupBy });
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  return apiRequest<UsageByPeriod[]>(`/usage/by-period?${params.toString()}`);
}

/**
 * Fetch usage data grouped by model
 */
export async function fetchUsageByModel(
  startDate?: string,
  endDate?: string
): Promise<UsageByModel[]> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  const queryString = params.toString();
  return apiRequest<UsageByModel[]>(
    `/usage/by-model${queryString ? `?${queryString}` : ''}`
  );
}

// ============================================================================
// Session API
// ============================================================================

/**
 * Fetch all sessions with pagination
 */
export async function fetchSessions(
  pagination?: PaginationOptions
): Promise<PaginatedResponse<Session>> {
  const params = new URLSearchParams();

  if (pagination) {
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
    if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);
  }

  const queryString = params.toString();
  return apiRequest<PaginatedResponse<Session>>(
    `/sessions${queryString ? `?${queryString}` : ''}`
  );
}

/**
 * Fetch recent sessions
 */
export async function fetchRecentSessions(limit: number = 10): Promise<Session[]> {
  return apiRequest<Session[]>(`/sessions/recent?limit=${limit}`);
}

/**
 * Fetch a specific session by ID
 */
export async function fetchSession(sessionId: string): Promise<Session> {
  return apiRequest<Session>(`/sessions/${sessionId}`);
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check API health status
 */
export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest<{ status: string; timestamp: string }>('/health');
}

// ============================================================================
// Mock Data (for development)
// ============================================================================

/**
 * Generate mock dashboard data for development
 */
export function generateMockDashboardData(): DashboardData {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    currentSession: {
      id: 'session-1',
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      totalTokens: 125000,
      totalCost: 2.45,
      requestCount: 42,
      lastActivityTime: now.toISOString(),
      remainingTime: 180 * 60, // 3 hours in seconds
      usagePercentage: 25,
      isNearLimit: false,
    },
    todayStats: {
      totalTokens: 450000,
      totalCost: 8.75,
      inputTokens: 180000,
      outputTokens: 270000,
      cacheTokens: 50000,
      requestCount: 156,
      averageTokensPerRequest: 2885,
      averageCostPerRequest: 0.056,
    },
    weekStats: {
      totalTokens: 2500000,
      totalCost: 48.50,
      inputTokens: 1000000,
      outputTokens: 1500000,
      cacheTokens: 250000,
      requestCount: 892,
      averageTokensPerRequest: 2802,
      averageCostPerRequest: 0.054,
    },
    monthStats: {
      totalTokens: 8500000,
      totalCost: 165.00,
      inputTokens: 3400000,
      outputTokens: 5100000,
      cacheTokens: 850000,
      requestCount: 3012,
      averageTokensPerRequest: 2822,
      averageCostPerRequest: 0.055,
    },
    usageByHour: Array.from({ length: 24 }, (_, i) => ({
      period: `${String(i).padStart(2, '0')}:00`,
      tokens: {
        inputTokens: Math.floor(Math.random() * 20000) + 5000,
        outputTokens: Math.floor(Math.random() * 30000) + 10000,
        cacheCreationInputTokens: Math.floor(Math.random() * 2000),
        cacheReadInputTokens: Math.floor(Math.random() * 5000),
        totalTokens: 0,
      },
      cost: {
        inputCost: 0,
        outputCost: 0,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: Math.random() * 0.5 + 0.1,
      },
      requestCount: Math.floor(Math.random() * 10) + 2,
    })),
    usageByDay: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfDay);
      date.setDate(date.getDate() - (6 - i));
      return {
        period: date.toISOString().split('T')[0],
        tokens: {
          inputTokens: Math.floor(Math.random() * 200000) + 100000,
          outputTokens: Math.floor(Math.random() * 300000) + 150000,
          cacheCreationInputTokens: Math.floor(Math.random() * 20000),
          cacheReadInputTokens: Math.floor(Math.random() * 50000),
          totalTokens: 0,
        },
        cost: {
          inputCost: 0,
          outputCost: 0,
          cacheCreationCost: 0,
          cacheReadCost: 0,
          totalCost: Math.random() * 10 + 5,
        },
        requestCount: Math.floor(Math.random() * 100) + 50,
      };
    }),
    usageByModel: [
      {
        model: 'claude-sonnet-4',
        modelDisplayName: 'Claude Sonnet 4',
        tokens: {
          inputTokens: 200000,
          outputTokens: 300000,
          cacheCreationInputTokens: 10000,
          cacheReadInputTokens: 25000,
          totalTokens: 535000,
        },
        cost: {
          inputCost: 0.6,
          outputCost: 4.5,
          cacheCreationCost: 0.015,
          cacheReadCost: 0.0125,
          totalCost: 5.13,
        },
        requestCount: 85,
        percentage: 45,
        color: '#3B82F6',
      },
      {
        model: 'claude-opus-4',
        modelDisplayName: 'Claude Opus 4',
        tokens: {
          inputTokens: 100000,
          outputTokens: 150000,
          cacheCreationInputTokens: 5000,
          cacheReadInputTokens: 10000,
          totalTokens: 265000,
        },
        cost: {
          inputCost: 1.5,
          outputCost: 11.25,
          cacheCreationCost: 0.075,
          cacheReadCost: 0.05,
          totalCost: 12.88,
        },
        requestCount: 42,
        percentage: 35,
        color: '#6366F1',
      },
      {
        model: 'claude-3.5-haiku',
        modelDisplayName: 'Claude 3.5 Haiku',
        tokens: {
          inputTokens: 80000,
          outputTokens: 120000,
          cacheCreationInputTokens: 4000,
          cacheReadInputTokens: 15000,
          totalTokens: 219000,
        },
        cost: {
          inputCost: 0.064,
          outputCost: 0.48,
          cacheCreationCost: 0.003,
          cacheReadCost: 0.006,
          totalCost: 0.55,
        },
        requestCount: 29,
        percentage: 20,
        color: '#EC4899',
      },
    ],
    recentSessions: [
      {
        id: 'session-1',
        startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        totalTokens: 125000,
        totalCost: 2.45,
        requestCount: 42,
        projectPath: '/Users/dev/project-a',
        lastActivityTime: now.toISOString(),
      },
      {
        id: 'session-2',
        startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
        status: 'expired',
        totalTokens: 350000,
        totalCost: 6.80,
        requestCount: 128,
        projectPath: '/Users/dev/project-b',
        lastActivityTime: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      },
    ],
    planUsage: {
      plan: 'pro',
      tokensUsed: 8500000,
      tokenLimit: 5000000,
      usagePercentage: 170,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      daysUntilReset: 15,
    },
  };
}

// ============================================================================
// API Client Export
// ============================================================================

export const api = {
  dashboard: {
    fetch: fetchDashboardData,
    fetchCurrentSession,
    fetchPlanUsage,
    fetchPlanUsageRealtime,
  },
  usage: {
    fetchStats: fetchUsageStats,
    fetchRecords: fetchUsageRecords,
    fetchByPeriod: fetchUsageByPeriod,
    fetchByModel: fetchUsageByModel,
    fetchPlanUsageRealtime,
  },
  sessions: {
    fetch: fetchSessions,
    fetchRecent: fetchRecentSessions,
    fetchById: fetchSession,
  },
  health: {
    check: checkApiHealth,
  },
  mock: {
    generateDashboardData: generateMockDashboardData,
  },
};

export default api;
