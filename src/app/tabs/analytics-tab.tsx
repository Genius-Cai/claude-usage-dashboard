'use client';

/**
 * Analytics Tab Component
 * Shows weekly stats, usage trends, and token breakdown charts
 */

import * as React from 'react';
import {
  DollarSign,
  Zap,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { UsageTrendChart, TokenComparisonChart } from '@/components/charts/usage-trend';
import { TokenBreakdownChart } from '@/components/charts/token-breakdown';
import { useUsageByPeriod } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';
import type { UsageStats } from '@/types';

interface AnalyticsTabProps {
  weekStats: UsageStats | undefined;
}

export function AnalyticsTab({ weekStats }: AnalyticsTabProps) {
  const { formatCurrency } = useSettingsStore();

  // Fetch chart data - only when this tab is mounted
  const { data: usageByDay = [] } = useUsageByPeriod({ groupBy: 'day' });

  return (
    <div className="space-y-6">
      {/* Weekly Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Week Cost"
          value={formatCurrency(weekStats?.totalCost || 0)}
          icon={DollarSign}
        />
        <StatsCard
          title="Week Tokens"
          value={weekStats?.totalTokens || 0}
          icon={Zap}
        />
        <StatsCard
          title="Week Requests"
          value={weekStats?.requestCount || 0}
          icon={Activity}
        />
        <StatsCard
          title="Avg Cost/Request"
          value={formatCurrency(weekStats?.averageCostPerRequest || 0)}
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UsageTrendChart
          data={usageByDay}
          title="Weekly Usage Trend"
        />
        <TokenBreakdownChart
          data={usageByDay}
          title="Token Breakdown by Day"
        />
      </div>

      <TokenComparisonChart
        data={usageByDay}
      />
    </div>
  );
}
