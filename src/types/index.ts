/**
 * TypeScript type definitions for Claude Code Usage Dashboard
 * Contains all types for usage data, plans, sessions, and API responses
 */

// ============================================================================
// Plan Types
// ============================================================================

/**
 * Available Claude subscription plans
 */
export type PlanType = 'free' | 'pro' | 'max_5x' | 'max_20x';

/**
 * Plan configuration with limits and pricing
 */
export interface PlanConfig {
  id: PlanType;
  name: string;
  displayName: string;
  monthlyPrice: number;
  tokenLimit: number;
  requestsPerMinute: number;
  sessionDurationMinutes: number;
  features: string[];
}

/**
 * All available plan configurations
 */
export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    monthlyPrice: 0,
    tokenLimit: 100000,
    requestsPerMinute: 5,
    sessionDurationMinutes: 60,
    features: ['Basic access', 'Limited usage'],
  },
  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    monthlyPrice: 20,
    tokenLimit: 5000000,
    requestsPerMinute: 50,
    sessionDurationMinutes: 300,
    features: ['Increased limits', 'Priority access', 'Advanced features'],
  },
  max_5x: {
    id: 'max_5x',
    name: 'max_5x',
    displayName: 'Max 5x',
    monthlyPrice: 100,
    tokenLimit: 25000000,
    requestsPerMinute: 100,
    sessionDurationMinutes: 480,
    features: ['5x usage limits', 'Priority support', 'Extended sessions'],
  },
  max_20x: {
    id: 'max_20x',
    name: 'max_20x',
    displayName: 'Max 20x',
    monthlyPrice: 200,
    tokenLimit: 100000000,
    requestsPerMinute: 200,
    sessionDurationMinutes: 720,
    features: ['20x usage limits', 'Premium support', 'Unlimited sessions'],
  },
};

// ============================================================================
// Currency Types
// ============================================================================

/**
 * Supported currency codes
 */
export type CurrencyCode = 'USD' | 'CNY';

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate relative to USD
}

/**
 * Available currency configurations
 */
export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 1,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    exchangeRate: 7.25, // Approximate exchange rate
  },
};

// ============================================================================
// Model Types
// ============================================================================

/**
 * Claude model identifiers
 */
export type ModelId =
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'claude-3.5-sonnet'
  | 'claude-3.5-haiku'
  | 'claude-opus-4'
  | 'claude-sonnet-4';

/**
 * Model configuration with pricing
 */
export interface ModelConfig {
  id: ModelId;
  name: string;
  displayName: string;
  inputPricePerMillion: number; // USD per million tokens
  outputPricePerMillion: number; // USD per million tokens
  contextWindow: number;
  color: string; // For charts
}

/**
 * Model configurations with pricing
 */
export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'claude-3-opus',
    displayName: 'Claude 3 Opus',
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    contextWindow: 200000,
    color: '#8B5CF6',
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet',
    name: 'claude-3-sonnet',
    displayName: 'Claude 3 Sonnet',
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    contextWindow: 200000,
    color: '#06B6D4',
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'claude-3-haiku',
    displayName: 'Claude 3 Haiku',
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    contextWindow: 200000,
    color: '#10B981',
  },
  'claude-3.5-sonnet': {
    id: 'claude-3.5-sonnet',
    name: 'claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    contextWindow: 200000,
    color: '#F59E0B',
  },
  'claude-3.5-haiku': {
    id: 'claude-3.5-haiku',
    name: 'claude-3.5-haiku',
    displayName: 'Claude 3.5 Haiku',
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4,
    contextWindow: 200000,
    color: '#EC4899',
  },
  'claude-opus-4': {
    id: 'claude-opus-4',
    name: 'claude-opus-4',
    displayName: 'Claude Opus 4',
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
    contextWindow: 200000,
    color: '#6366F1',
  },
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    name: 'claude-sonnet-4',
    displayName: 'Claude Sonnet 4',
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
    contextWindow: 200000,
    color: '#3B82F6',
  },
};

// ============================================================================
// Usage Data Types
// ============================================================================

/**
 * Token usage breakdown
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;
}

/**
 * Cost breakdown in USD
 */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cacheCreationCost: number;
  cacheReadCost: number;
  totalCost: number;
}

/**
 * Single usage record
 */
export interface UsageRecord {
  id: string;
  timestamp: string; // ISO 8601 format
  model: ModelId;
  tokens: TokenUsage;
  cost: CostBreakdown;
  sessionId: string;
  projectPath?: string;
}

/**
 * Aggregated usage statistics
 */
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  requestCount: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
}

/**
 * Usage data grouped by time period
 */
export interface UsageByPeriod {
  period: string; // Date string or hour
  tokens: TokenUsage;
  cost: CostBreakdown;
  requestCount: number;
}

/**
 * Usage data grouped by model
 */
export interface UsageByModel {
  model: ModelId;
  modelDisplayName: string;
  tokens: TokenUsage;
  cost: CostBreakdown;
  requestCount: number;
  percentage: number;
  color: string;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session status
 */
export type SessionStatus = 'active' | 'idle' | 'expired' | 'paused';

/**
 * Session information
 */
export interface Session {
  id: string;
  startTime: string; // ISO 8601 format
  endTime?: string;
  status: SessionStatus;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  projectPath?: string;
  lastActivityTime: string;
}

/**
 * Current session state
 */
export interface CurrentSession extends Session {
  remainingTime: number; // in seconds
  usagePercentage: number;
  isNearLimit: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Base API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

/**
 * API error details
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Dashboard data response
 */
export interface DashboardData {
  currentSession: CurrentSession | null;
  todayStats: UsageStats;
  weekStats: UsageStats;
  monthStats: UsageStats;
  usageByHour: UsageByPeriod[];
  usageByDay: UsageByPeriod[];
  usageByModel: UsageByModel[];
  recentSessions: Session[];
  planUsage: PlanUsage;
}

/**
 * Plan usage information
 */
export interface PlanUsage {
  plan: PlanType;
  tokensUsed: number;
  tokenLimit: number;
  usagePercentage: number;
  resetDate: string; // ISO 8601 format
  daysUntilReset: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'usage_update'
  | 'session_update'
  | 'cost_update'
  | 'limit_warning'
  | 'connection_status'
  | 'error';

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
}

/**
 * Usage update payload
 */
export interface UsageUpdatePayload {
  tokens: TokenUsage;
  cost: CostBreakdown;
  model: ModelId;
}

/**
 * Session update payload
 */
export interface SessionUpdatePayload {
  session: CurrentSession;
}

/**
 * Limit warning payload
 */
export interface LimitWarningPayload {
  type: 'token_limit' | 'rate_limit' | 'session_expiry';
  currentUsage: number;
  limit: number;
  percentage: number;
  message: string;
}

// ============================================================================
// Chart Types
// ============================================================================

/**
 * Chart data point for trends
 */
export interface TrendDataPoint {
  label: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
}

/**
 * Pie chart data
 */
export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

/**
 * Bar chart data
 */
export interface BarChartData {
  label: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  total: number;
}

// ============================================================================
// Settings Types
// ============================================================================

/**
 * User settings
 */
export interface UserSettings {
  plan: PlanType;
  currency: CurrencyCode;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  display: DisplaySettings;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  usageLimitWarning: boolean;
  sessionExpiry: boolean;
  dailySummary: boolean;
  warningThreshold: number; // Percentage (0-100)
}

/**
 * Display settings
 */
export interface DisplaySettings {
  compactMode: boolean;
  showCosts: boolean;
  showCharts: boolean;
  refreshInterval: number; // in seconds
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Time range for data filtering
 */
export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Filter options for usage data
 */
export interface UsageFilter {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  models?: ModelId[];
  minCost?: number;
  maxCost?: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
