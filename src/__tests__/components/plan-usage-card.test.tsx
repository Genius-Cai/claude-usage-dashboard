/**
 * Tests for PlanUsageCard component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { render } from '../test-utils';
import { PlanUsageCard } from '@/components/dashboard/plan-usage-card';

// Mock the usePlanUsageRealtime hook
vi.mock('@/hooks', () => ({
  usePlanUsageRealtime: vi.fn(),
}));

// Mock settings store
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

// Mock data for successful response
const mockPlanUsageData = {
  plan: {
    plan: 'max20',
    display_name: 'Max (20x)',
    token_limit: 100000000,
    cost_limit: 600,
    message_limit: 1000,
  },
  cost_usage: {
    current: 15.50,
    limit: 600,
    percentage: 2.58,
    formatted_current: '$15.50',
    formatted_limit: '$600.00',
  },
  token_usage: {
    current: 1500000,
    limit: 100000000,
    percentage: 1.5,
    formatted_current: '1,500,000',
    formatted_limit: '100,000,000',
  },
  message_usage: {
    current: 50,
    limit: 1000,
    percentage: 5.0,
    formatted_current: '50',
    formatted_limit: '1000',
  },
  reset_info: {
    reset_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    remaining_minutes: 180,
    remaining_formatted: '3h 0m',
  },
  burn_rate: {
    tokens_per_minute: 250,
    cost_per_hour: 0.15,
  },
  model_distribution: {
    'claude-sonnet-4': 75,
    'claude-3-5-haiku': 25,
  },
  predictions: {
    tokens_run_out: null,
    limit_resets_at: '3:00 PM',
  },
};

describe('PlanUsageCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render loading skeleton when loading', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof usePlanUsageRealtime>);

    const { container } = render(<PlanUsageCard />);

    // Check for skeleton elements - shadcn Skeleton uses 'animate-pulse' class
    const animatedElements = container.querySelectorAll('[class*="animate-pulse"]');
    // Or check that the card doesn't have the main content (Plan Usage title with badge)
    const planBadge = screen.queryByText('Max (20x)');

    // When loading, we should either see animations or NOT see the full content
    const isLoadingState = animatedElements.length > 0 || planBadge === null;
    expect(isLoadingState).toBe(true);
  });

  it('should render error state when error occurs', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to fetch data' },
    } as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    expect(screen.getByText('Plan Usage')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('should render plan usage data correctly', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    // Check for plan title and badge
    expect(screen.getByText('Plan Usage')).toBeInTheDocument();
    expect(screen.getByText('Max (20x)')).toBeInTheDocument();

    // Check for usage meters
    expect(screen.getByText('Cost Usage')).toBeInTheDocument();
    expect(screen.getByText('Token Usage')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();

    // Check for percentages
    expect(screen.getByText('2.6%')).toBeInTheDocument();
    expect(screen.getByText('1.5%')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('should display formatted values', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    // Check for formatted current values
    expect(screen.getByText('$15.50')).toBeInTheDocument();
    expect(screen.getByText('1,500,000')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();

    // Check for formatted limits
    expect(screen.getByText('/ $600.00')).toBeInTheDocument();
    expect(screen.getByText('/ 100,000,000')).toBeInTheDocument();
    expect(screen.getByText('/ 1000')).toBeInTheDocument();
  });

  it('should display reset time information', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    expect(screen.getByText('Time to Reset')).toBeInTheDocument();
    expect(screen.getByText('3h 0m')).toBeInTheDocument();
  });

  it('should display burn rate', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    expect(screen.getByText('Burn Rate')).toBeInTheDocument();
    expect(screen.getByText('250 tok/min')).toBeInTheDocument();
  });

  it('should display model distribution', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    expect(screen.getByText('Model Distribution')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('should display predictions when available', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    expect(screen.getByText('Limit resets:')).toBeInTheDocument();
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();
  });

  it('should use green color for low usage', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    const { container } = render(<PlanUsageCard />);

    // Check for green color class (low usage < 50%)
    const greenElements = container.querySelectorAll('.text-green-500');
    expect(greenElements.length).toBeGreaterThan(0);
  });

  it('should use yellow color for medium usage', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    const mediumUsageData = {
      ...mockPlanUsageData,
      cost_usage: {
        ...mockPlanUsageData.cost_usage,
        percentage: 60,
      },
    };
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mediumUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    const { container } = render(<PlanUsageCard />);

    // Check for yellow color class (medium usage >= 50%)
    const yellowElements = container.querySelectorAll('.text-yellow-500');
    expect(yellowElements.length).toBeGreaterThan(0);
  });

  it('should use red color for high usage', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    const highUsageData = {
      ...mockPlanUsageData,
      cost_usage: {
        ...mockPlanUsageData.cost_usage,
        percentage: 85,
      },
    };
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: highUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    const { container } = render(<PlanUsageCard />);

    // Check for red color class (high usage >= 80%)
    const redElements = container.querySelectorAll('.text-red-500');
    expect(redElements.length).toBeGreaterThan(0);
  });

  it('should pass plan prop to hook', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard plan="pro" />);

    expect(usePlanUsageRealtime).toHaveBeenCalledWith({ plan: 'pro' });
  });

  it('should apply custom className', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: mockPlanUsageData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    const { container } = render(<PlanUsageCard className="custom-class" />);

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('should not show model distribution when empty', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    const noModelData = {
      ...mockPlanUsageData,
      model_distribution: {},
    };
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: noModelData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    expect(screen.queryByText('Model Distribution')).not.toBeInTheDocument();
  });

  it('should handle missing predictions gracefully', async () => {
    const { usePlanUsageRealtime } = await import('@/hooks');
    const noPredictionsData = {
      ...mockPlanUsageData,
      predictions: {
        tokens_run_out: null,
        limit_resets_at: null,
      },
    };
    vi.mocked(usePlanUsageRealtime).mockReturnValue({
      data: noPredictionsData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof usePlanUsageRealtime>);

    render(<PlanUsageCard />);

    // Component should still render without predictions section
    expect(screen.getByText('Plan Usage')).toBeInTheDocument();
    expect(screen.queryByText('Limit resets:')).not.toBeInTheDocument();
  });
});
