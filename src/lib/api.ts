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
  ModelId,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second

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
  maxRetries?: number;
}

/**
 * Determines if an error is recoverable and should be retried
 */
function isRecoverableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Retry on network errors and timeouts
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }
    // Retry on server errors (5xx) but not client errors (4xx)
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }
    return false;
  }
  // Retry on generic network failures
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  return false;
}

/**
 * Calculates delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
}

/**
 * Delays execution for the specified duration
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = API_TIMEOUT, maxRetries = MAX_RETRIES, ...fetchOptions } = options;
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

      // Convert to ApiError for consistent handling
      if (error instanceof ApiError) {
        lastError = error;
      } else if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new ApiError(408, 'TIMEOUT', 'Request timed out');
        } else {
          lastError = new ApiError(0, 'NETWORK_ERROR', error.message);
        }
      } else {
        lastError = new ApiError(0, 'UNKNOWN_ERROR', 'An unknown error occurred');
      }

      // Check if we should retry
      const isLastAttempt = attempt >= maxRetries;
      if (isLastAttempt || !isRecoverableError(lastError)) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const retryDelay = calculateRetryDelay(attempt);
      await delay(retryDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new ApiError(0, 'UNKNOWN_ERROR', 'An unknown error occurred');
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
    model: model.model as ModelId,
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

  // Generate hourly usage data (last 24 hours)
  const usageByHour: UsageByPeriod[] = Array.from({ length: 24 }, (_, i) => {
    const hour = (now.getHours() - 23 + i + 24) % 24;
    const baseRequests = Math.floor(Math.random() * 15) + 2;
    const baseTokens = baseRequests * (Math.floor(Math.random() * 3000) + 1500);
    return {
      period: `${String(hour).padStart(2, '0')}:00`,
      tokens: {
        inputTokens: Math.floor(baseTokens * 0.4),
        outputTokens: Math.floor(baseTokens * 0.5),
        cacheCreationInputTokens: Math.floor(baseTokens * 0.05),
        cacheReadInputTokens: Math.floor(baseTokens * 0.05),
        totalTokens: baseTokens,
      },
      cost: {
        inputCost: baseTokens * 0.000003,
        outputCost: baseTokens * 0.000015,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: baseTokens * 0.000018,
      },
      requestCount: baseRequests,
    };
  });

  // Generate daily usage data (last 7 days)
  const usageByDay: UsageByPeriod[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + i);
    const baseRequests = Math.floor(Math.random() * 80) + 40;
    const baseTokens = baseRequests * (Math.floor(Math.random() * 4000) + 2000);
    return {
      period: date.toISOString().split('T')[0],
      tokens: {
        inputTokens: Math.floor(baseTokens * 0.4),
        outputTokens: Math.floor(baseTokens * 0.5),
        cacheCreationInputTokens: Math.floor(baseTokens * 0.05),
        cacheReadInputTokens: Math.floor(baseTokens * 0.05),
        totalTokens: baseTokens,
      },
      cost: {
        inputCost: baseTokens * 0.000003,
        outputCost: baseTokens * 0.000015,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: baseTokens * 0.000018,
      },
      requestCount: baseRequests,
    };
  });

  // Generate model usage data
  const usageByModel: UsageByModel[] = [
    {
      model: 'claude-sonnet-4' as ModelId,
      modelDisplayName: 'Claude Sonnet 4',
      tokens: {
        inputTokens: 180000,
        outputTokens: 270000,
        cacheCreationInputTokens: 15000,
        cacheReadInputTokens: 25000,
        totalTokens: 490000,
      },
      cost: {
        inputCost: 0.54,
        outputCost: 4.05,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: 4.59,
      },
      requestCount: 89,
      percentage: 45.2,
      color: '#3B82F6',
    },
    {
      model: 'claude-opus-4' as ModelId,
      modelDisplayName: 'Claude Opus 4',
      tokens: {
        inputTokens: 85000,
        outputTokens: 120000,
        cacheCreationInputTokens: 8000,
        cacheReadInputTokens: 12000,
        totalTokens: 225000,
      },
      cost: {
        inputCost: 1.28,
        outputCost: 9.0,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: 10.28,
      },
      requestCount: 34,
      percentage: 28.5,
      color: '#6366F1',
    },
    {
      model: 'claude-3.5-sonnet' as ModelId,
      modelDisplayName: 'Claude 3.5 Sonnet',
      tokens: {
        inputTokens: 60000,
        outputTokens: 90000,
        cacheCreationInputTokens: 5000,
        cacheReadInputTokens: 8000,
        totalTokens: 163000,
      },
      cost: {
        inputCost: 0.18,
        outputCost: 1.35,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: 1.53,
      },
      requestCount: 28,
      percentage: 18.8,
      color: '#F59E0B',
    },
    {
      model: 'claude-3.5-haiku' as ModelId,
      modelDisplayName: 'Claude 3.5 Haiku',
      tokens: {
        inputTokens: 25000,
        outputTokens: 35000,
        cacheCreationInputTokens: 2000,
        cacheReadInputTokens: 3000,
        totalTokens: 65000,
      },
      cost: {
        inputCost: 0.02,
        outputCost: 0.14,
        cacheCreationCost: 0,
        cacheReadCost: 0,
        totalCost: 0.16,
      },
      requestCount: 15,
      percentage: 7.5,
      color: '#EC4899',
    },
  ];

  // Generate recent sessions
  const recentSessions: Session[] = Array.from({ length: 5 }, (_, i) => {
    const sessionStart = new Date(now.getTime() - (i + 1) * 6 * 60 * 60 * 1000);
    const sessionEnd = new Date(sessionStart.getTime() + 5 * 60 * 60 * 1000);
    return {
      id: `session-${i + 1}`,
      startTime: sessionStart.toISOString(),
      endTime: i === 0 ? undefined : sessionEnd.toISOString(),
      status: i === 0 ? 'active' : 'expired',
      totalTokens: Math.floor(Math.random() * 150000) + 50000,
      totalCost: Math.random() * 5 + 1,
      requestCount: Math.floor(Math.random() * 50) + 20,
      lastActivityTime: i === 0 ? now.toISOString() : sessionEnd.toISOString(),
    };
  });

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
    usageByHour,
    usageByDay,
    usageByModel,
    recentSessions,
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

/**
 * Generate mock PlanUsageResponse for demo mode
 */
export function generateMockPlanUsageResponse(): PlanUsageResponse {
  const now = new Date();
  const resetTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
  const remainingMinutes = Math.floor((resetTime.getTime() - now.getTime()) / (1000 * 60));

  return {
    timestamp: now.toISOString(),
    plan: {
      plan: 'max20',
      display_name: 'Max 20x',
      token_limit: 220000,
      cost_limit: 600,
      message_limit: 1000,
    },
    cost_usage: {
      current: 2.45,
      limit: 600,
      percentage: 0.41,
      formatted_current: '$2.45',
      formatted_limit: '$600.00',
    },
    token_usage: {
      current: 125000,
      limit: 220000,
      percentage: 56.8,
      formatted_current: '125K',
      formatted_limit: '220K',
    },
    message_usage: {
      current: 42,
      limit: 1000,
      percentage: 4.2,
      formatted_current: '42',
      formatted_limit: '1,000',
    },
    reset_info: {
      reset_time: resetTime.toISOString(),
      remaining_minutes: remainingMinutes,
      remaining_formatted: `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`,
    },
    burn_rate: {
      tokens_per_minute: 520,
      cost_per_hour: 0.82,
    },
    model_distribution: {
      'claude-sonnet-4': 45.2,
      'claude-opus-4': 28.5,
      'claude-3.5-sonnet': 18.8,
      'claude-3.5-haiku': 7.5,
    },
    predictions: {
      tokens_run_out: new Date(now.getTime() + 4.5 * 60 * 60 * 1000).toISOString(),
      limit_resets_at: resetTime.toISOString(),
    },
  };
}

// ============================================================================
// Session Functions (derived from plan-usage API)
// ============================================================================

/**
 * Fetch recent sessions from plan-usage API
 * Creates session objects from the current plan usage data
 */
export async function fetchRecentSessions(_limit: number = 10): Promise<Session[]> {
  try {
    const planUsage = await apiRequest<PlanUsageResponse>('/usage/plan-usage?plan=max20');

    // Create a session from current plan usage data
    // The plan-usage data represents the current active session block
    const sessionDurationMs = 5 * 60 * 60 * 1000; // 5-hour window
    const resetTime = new Date(planUsage.reset_info.reset_time);
    const startTime = new Date(resetTime.getTime() - sessionDurationMs);

    const currentSession: Session = {
      id: `session-${startTime.toISOString()}`,
      startTime: startTime.toISOString(),
      endTime: planUsage.reset_info.reset_time,
      status: planUsage.reset_info.remaining_minutes > 0 ? 'active' : 'expired',
      totalTokens: planUsage.token_usage.current,
      totalCost: planUsage.cost_usage.current,
      requestCount: planUsage.message_usage.current,
      lastActivityTime: planUsage.timestamp,
    };

    // For now, return only the current session
    // Future enhancement: backend could return historical session blocks
    return planUsage.message_usage.current > 0 ? [currentSession] : [];
  } catch (error) {
    console.error('Failed to fetch recent sessions:', error);
    return [];
  }
}

/**
 * Fetch sessions with pagination
 */
export async function fetchSessions(pagination?: { page: number; pageSize: number }): Promise<{
  items: Session[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}> {
  const sessions = await fetchRecentSessions(100);
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = sessions.slice(start, end);

  return {
    items,
    total: sessions.length,
    page,
    pageSize,
    totalPages: Math.ceil(sessions.length / pageSize) || 1,
    hasNext: end < sessions.length,
    hasPrevious: page > 1,
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
  sessions: {
    fetch: fetchSessions,
    fetchRecent: fetchRecentSessions,
  },
  health: {
    check: checkApiHealth,
  },
  mock: {
    generateDashboardData: generateMockDashboardData,
    generatePlanUsageResponse: generateMockPlanUsageResponse,
  },
};

export default api;
