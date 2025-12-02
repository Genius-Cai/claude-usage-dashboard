'use client';

/**
 * Overview Tab Component
 * Shows plan usage, session timer, usage trends, and model distribution
 */

import * as React from 'react';
import { PlanUsageCard } from '@/components/dashboard/plan-usage-card';
import { SessionTimer } from '@/components/dashboard/session-timer';
import { UsageTrendChart } from '@/components/charts/usage-trend';
import { ModelDistributionChart, ModelUsageList } from '@/components/charts/model-distribution';
import { TokenBar } from '@/components/charts/token-breakdown';
import { useUsageByPeriod, useUsageByModel } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';
import type { CurrentSession, UsageStats } from '@/types';

interface OverviewTabProps {
  session: CurrentSession | null;
  todayStats: UsageStats | undefined;
  onRefresh: () => void;
}

export function OverviewTab({ session, todayStats, onRefresh }: OverviewTabProps) {
  const { plan } = useSettingsStore();

  // Fetch chart data - only when this tab is mounted
  const { data: usageByHour = [] } = useUsageByPeriod({ groupBy: 'hour' });
  const { data: usageByModel = [] } = useUsageByModel();

  return (
    <div className="space-y-6">
      {/* Plan Usage & Session Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <PlanUsageCard
          plan={plan}
          className="lg:col-span-1"
        />

        <div className="lg:col-span-2 space-y-6">
          <SessionTimer
            session={session}
            onRefresh={onRefresh}
          />
          <UsageTrendChart
            data={usageByHour}
            title="Today's Usage Trend"
          />
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Token Breakdown</h3>
        <TokenBar
          tokens={{
            inputTokens: todayStats?.inputTokens || 0,
            outputTokens: todayStats?.outputTokens || 0,
            cacheCreationInputTokens: 0,
            cacheReadInputTokens: todayStats?.cacheTokens || 0,
            totalTokens: todayStats?.totalTokens || 0,
          }}
        />
      </div>

      {/* Model Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ModelDistributionChart
          data={usageByModel}
          title="Model Usage Distribution"
        />

        <ModelUsageList
          data={usageByModel}
        />
      </div>
    </div>
  );
}
