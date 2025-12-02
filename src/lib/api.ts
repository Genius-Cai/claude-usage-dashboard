/**
 * API client for Claude Code Usage Dashboard
 * Maps frontend requests to backend API endpoints
 */

import type {
  DashboardData,
  UsageStats,
  UsageByPeriod,
  UsageByModel,
  Session,
  CurrentSession,
  PlanUsage,
  PlanUsageResponse,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000;

// ============================================================================
// Error Handling
// ============================================================================

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
  return response.json();
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

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
    if (error instanceof ApiError) throw error;
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
// Backend Response Types (matching actual backend schema)
// ============================================================================

interface BackendSession {
  session_start: string;
  session_end: string;
  remaining_minutes: number;
  remaining_formatted: string;
  is_active: boolean;
  tokens_in_window: number;
  cost_in_window: number;
}

interface BackendTokens {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
}

interface BackendTodayStats {
  date: string;
  total_requests: number;
  tokens: BackendTokens;
  total_cost_usd: number;
  models_used: string[];
  hourly_distribution: Record<string, number>;
}

interface BackendBurnRate {
  tokens_per_minute: number;
  cost_per_hour: number;
}

interface BackendRealtimeResponse {
  timestamp: string;
  session: BackendSession;
  today_stats: BackendTodayStats;
  burn_rate: BackendBurnRate;
  recent_entries: Array<{
    timestamp: string;
    input_tokens: number;
    output_tokens: number;
    cache_creation_tokens: number;
    cache_read_tokens: number;
    cost_usd: number;
    model: string;
  }>;
}

interface BackendHistoryDay {
  date: string;
  total_requests: number;
  tokens: BackendTokens;
  total_cost_usd: number;
  models_used: string[];
}

interface BackendHistoryResponse {
  start_date: string;
  end_date: string;
  days: number;
  daily_stats: BackendHistoryDay[];
  total_tokens: number;
  total_cost: number;
  total_requests: number;
}

interface BackendModelStats {
  model: string;
  total_requests: number;
  tokens: BackendTokens;
  total_cost_usd: number;
  percentage_of_total: number;
}

interface BackendModelStatsResponse {
  models: BackendModelStats[];
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

function transformToUsageStats(stats: BackendTodayStats): UsageStats {
  return {
    totalTokens: stats.tokens.total_tokens,
    totalCost: stats.total_cost_usd,
    inputTokens: stats.tokens.input_tokens,
    outputTokens: stats.tokens.output_tokens,
    cacheTokens: stats.tokens.cache_creation_tokens + stats.tokens.cache_read_tokens,
    requestCount: stats.total_requests,
    averageTokensPerRequest: stats.total_requests > 0
      ? Math.round(stats.tokens.total_tokens / stats.total_requests)
      : 0,
    averageCostPerRequest: stats.total_requests > 0
      ? stats.total_cost_usd / stats.total_requests
      : 0,
  };
}

function transformToCurrentSession(session: BackendSession, tokens: BackendTokens, cost: number): CurrentSession {
  return {
    id: 'current-session',
    startTime: session.session_start,
    status: session.is_active ? 'active' : 'expired',
    totalTokens: session.tokens_in_window,
    totalCost: session.cost_in_window,
    requestCount: 0, // Not available from backend
    lastActivityTime: new Date().toISOString(),
    remainingTime: session.remaining_minutes * 60, // Convert to seconds
    usagePercentage: 0, // Calculated elsewhere
    isNearLimit: session.remaining_minutes < 30,
  };
}

function transformHourlyToUsageByPeriod(hourlyDist: Record<string, number>): UsageByPeriod[] {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(hour => {
    const count = hourlyDist[String(hour)] || 0;
    return {
      period: `${String(hour).padStart(2, '0')}:00`,
      tokens: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        totalTokens: count * 1000, // Estimate
      },
      cost: {
        inputCost: 0,
        outputCost: 0,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: count * 0.2, // Estimate
      },
      requestCount: count,
    };
  });
}

function transformDailyToUsageByPeriod(days: BackendHistoryDay[]): UsageByPeriod[] {
  return days.map(day => ({
    period: day.date,
    tokens: {
      inputTokens: day.tokens.input_tokens,
      outputTokens: day.tokens.output_tokens,
      cacheCreationInputTokens: day.tokens.cache_creation_tokens,
      cacheReadInputTokens: day.tokens.cache_read_tokens,
      totalTokens: day.tokens.total_tokens,
    },
    cost: {
      inputCost: 0,
      outputCost: 0,
      cacheCreationCost: 0,
      cacheReadCost: 0,
      totalCost: day.total_cost_usd,
    },
    requestCount: day.total_requests,
  }));
}

function transformToUsageByModel(models: BackendModelStats[]): UsageByModel[] {
  const colors = ['#3B82F6', '#6366F1', '#EC4899', '#10B981', '#F59E0B'];
  return models.map((model, index) => ({
    model: model.model as any,
    modelDisplayName: model.model.replace('claude-', '').replace(/-\d+$/, ''),
    tokens: {
      inputTokens: model.tokens?.input_tokens || 0,
      outputTokens: model.tokens?.output_tokens || 0,
      cacheCreationInputTokens: model.tokens?.cache_creation_tokens || 0,
      cacheReadInputTokens: model.tokens?.cache_read_tokens || 0,
      totalTokens: model.tokens?.total_tokens || 0,
    },
    cost: {
      inputCost: 0,
      outputCost: 0,
      cacheCreationCost: 0,
      cacheReadCost: 0,
      totalCost: model.total_cost_usd || 0,
    },
    requestCount: model.total_requests || 0,
    percentage: model.percentage_of_total || 0,
    color: colors[index % colors.length],
  }));
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch main dashboard data from backend /usage/realtime
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [realtime, history, modelStats] = await Promise.all([
    apiRequest<BackendRealtimeResponse>('/usage/realtime'),
    apiRequest<BackendHistoryResponse>('/usage/history?days=7').catch(() => null),
    apiRequest<BackendModelStatsResponse>('/stats/models').catch(() => null),
  ]);

  const todayStats = transformToUsageStats(realtime.today_stats);

  return {
    currentSession: transformToCurrentSession(
      realtime.session,
      realtime.today_stats.tokens,
      realtime.today_stats.total_cost_usd
    ),
    todayStats,
    weekStats: todayStats, // Use today for now
    monthStats: todayStats, // Use today for now
    usageByHour: transformHourlyToUsageByPeriod(realtime.today_stats.hourly_distribution),
    usageByDay: history ? transformDailyToUsageByPeriod(history.daily_stats) : [],
    usageByModel: modelStats ? transformToUsageByModel(modelStats.models) : [],
    recentSessions: [],
    planUsage: {
      plan: 'max_20x',
      tokensUsed: realtime.session.tokens_in_window,
      tokenLimit: 220000,
      usagePercentage: (realtime.session.tokens_in_window / 220000) * 100,
      resetDate: realtime.session.session_end,
      daysUntilReset: 0,
    },
  };
}

/**
 * Fetch current session from backend /usage/realtime
 */
export async function fetchCurrentSession(): Promise<CurrentSession | null> {
  const realtime = await apiRequest<BackendRealtimeResponse>('/usage/realtime');
  return transformToCurrentSession(
    realtime.session,
    realtime.today_stats.tokens,
    realtime.today_stats.total_cost_usd
  );
}

/**
 * Fetch plan usage from backend /usage/plan-usage
 */
export async function fetchPlanUsage(): Promise<PlanUsage> {
  const planUsage = await apiRequest<PlanUsageResponse>('/usage/plan-usage?plan=max20');
  return {
    plan: 'max_20x',
    tokensUsed: planUsage.token_usage.current,
    tokenLimit: planUsage.token_usage.limit,
    usagePercentage: planUsage.token_usage.percentage,
    resetDate: planUsage.reset_info.reset_time,
    daysUntilReset: 0,
  };
}

/**
 * Fetch real-time plan usage vs limits
 */
export async function fetchPlanUsageRealtime(plan: string = 'max20'): Promise<PlanUsageResponse> {
  return apiRequest<PlanUsageResponse>(`/usage/plan-usage?plan=${plan}`);
}

/**
 * Fetch usage statistics
 */
export async function fetchUsageStats(
  period: 'today' | 'week' | 'month' | 'year' = 'today'
): Promise<UsageStats> {
  const realtime = await apiRequest<BackendRealtimeResponse>('/usage/realtime');
  return transformToUsageStats(realtime.today_stats);
}

/**
 * Fetch usage by period
 */
export async function fetchUsageByPeriod(
  groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
  startDate?: string,
  endDate?: string
): Promise<UsageByPeriod[]> {
  if (groupBy === 'hour') {
    const realtime = await apiRequest<BackendRealtimeResponse>('/usage/realtime');
    return transformHourlyToUsageByPeriod(realtime.today_stats.hourly_distribution);
  }

  const days = groupBy === 'week' ? 7 : groupBy === 'month' ? 30 : 7;
  const history = await apiRequest<BackendHistoryResponse>(`/usage/history?days=${days}`);
  return transformDailyToUsageByPeriod(history.daily_stats);
}

/**
 * Fetch usage by model
 */
export async function fetchUsageByModel(
  startDate?: string,
  endDate?: string
): Promise<UsageByModel[]> {
  const modelStats = await apiRequest<BackendModelStatsResponse>('/stats/models');
  return transformToUsageByModel(modelStats.models);
}

/**
 * Health check
 */
export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest<{ status: string; timestamp: string }>('/health');
}

// ============================================================================
// Mock Data (fallback only)
// ============================================================================

export function generateMockDashboardData(): DashboardData {
  const now = new Date();
  return {
    currentSession: {
      id: 'mock-session',
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      totalTokens: 125000,
      totalCost: 2.45,
      requestCount: 42,
      lastActivityTime: now.toISOString(),
      remainingTime: 180 * 60,
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
    usageByHour: [],
    usageByDay: [],
    usageByModel: [],
    recentSessions: [],
    planUsage: {
      plan: 'max_20x',
      tokensUsed: 125000,
      tokenLimit: 220000,
      usagePercentage: 56.8,
      resetDate: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      daysUntilReset: 0,
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
    fetchByPeriod: fetchUsageByPeriod,
    fetchByModel: fetchUsageByModel,
    fetchPlanUsageRealtime,
  },
  health: {
    check: checkApiHealth,
  },
  mock: {
    generateDashboardData: generateMockDashboardData,
  },
};

export default api;
