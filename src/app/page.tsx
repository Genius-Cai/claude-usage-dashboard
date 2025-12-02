'use client';

/**
 * Main Dashboard Page
 * Displays usage statistics, charts, and session information
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  DollarSign,
  BarChart3,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/header';
import { CostCard } from '@/components/dashboard/cost-card';
import { StatsCard, StatsCardWithProgress, StatsGrid } from '@/components/dashboard/stats-card';
import { SessionTimer } from '@/components/dashboard/session-timer';
import { UsageTrendChart, TokenComparisonChart } from '@/components/charts/usage-trend';
import { ModelDistributionChart, ModelUsageList } from '@/components/charts/model-distribution';
import { TokenBreakdownChart, TokenBar } from '@/components/charts/token-breakdown';
import { useDashboard, useUsageByPeriod, useUsageByModel } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';
import { PLAN_CONFIGS } from '@/types';

/**
 * Loading skeleton for dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px]" />
      </div>

      {/* Additional Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[300px] lg:col-span-2" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <Activity className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
      <p className="text-muted-foreground text-center mb-4 max-w-md">
        {error.message || 'An error occurred while loading the dashboard data.'}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Main Dashboard Component
 */
export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState('overview');

  const { plan, formatCurrency } = useSettingsStore();
  const planConfig = PLAN_CONFIGS[plan];

  // Fetch dashboard data
  const {
    data: dashboardData,
    session,
    planUsage,
    isLoading,
    isError,
    error,
    refresh,
    isRefreshing,
  } = useDashboard();

  // Fetch chart data
  const { data: usageByDay = [] } = useUsageByPeriod({ groupBy: 'day' });
  const { data: usageByHour = [] } = useUsageByPeriod({ groupBy: 'hour' });
  const { data: usageByModel = [] } = useUsageByModel();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isRefreshing={isRefreshing} onRefresh={refresh} />
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError && error) {
    return (
      <div className="min-h-screen bg-background">
        <Header isRefreshing={isRefreshing} onRefresh={refresh} />
        <ErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  const todayStats = dashboardData?.todayStats;
  const weekStats = dashboardData?.weekStats;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <Header
        session={session ?? null}
        todayCost={todayStats?.totalCost || 0}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Page Title & Description */}
          <motion.div variants={itemVariants} className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your Claude Code usage, costs, and session analytics
            </p>
          </motion.div>

          {/* Stats Overview */}
          <motion.div variants={itemVariants}>
            <StatsGrid columns={4}>
              <CostCard
                totalCost={todayStats?.totalCost || 0}
                previousCost={(todayStats?.totalCost || 0) * 0.85}
                periodLabel="Today"
              />

              <StatsCard
                title="Total Tokens"
                value={todayStats?.totalTokens || 0}
                icon={Zap}
                trend={{
                  value: 12.5,
                  direction: 'up',
                  label: 'vs yesterday',
                }}
              />

              <StatsCard
                title="Requests"
                value={todayStats?.requestCount || 0}
                icon={Activity}
                trend={{
                  value: 8.2,
                  direction: 'up',
                  label: 'vs yesterday',
                }}
              />

              <StatsCardWithProgress
                title="Plan Usage"
                value={`${((planUsage?.usagePercentage || 0)).toFixed(0)}%`}
                icon={BarChart3}
                current={planUsage?.tokensUsed || 0}
                total={planConfig.tokenLimit}
                progressLabel="Monthly Limit"
                warningThreshold={80}
              />
            </StatsGrid>
          </motion.div>

          {/* Tabs for Different Views */}
          <motion.div variants={itemVariants}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="models">Models</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Session & Cost Row */}
                <div className="grid gap-6 lg:grid-cols-3">
                  <SessionTimer
                    session={session ?? null}
                    onRefresh={refresh}
                    className="lg:col-span-1"
                  />

                  <div className="lg:col-span-2">
                    <UsageTrendChart
                      data={dashboardData?.usageByHour || usageByHour}
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
                    data={dashboardData?.usageByModel || usageByModel}
                    title="Model Usage Distribution"
                  />

                  <ModelUsageList
                    data={dashboardData?.usageByModel || usageByModel}
                  />
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                {/* Weekly Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    title="Week Cost"
                    value={formatCurrency(weekStats?.totalCost || 0)}
                    icon={DollarSign}
                    trend={{
                      value: -5.2,
                      direction: 'down',
                      label: 'vs last week',
                    }}
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
                    data={dashboardData?.usageByDay || usageByDay}
                    title="Weekly Usage Trend"
                  />
                  <TokenBreakdownChart
                    data={dashboardData?.usageByDay || usageByDay}
                    title="Token Breakdown by Day"
                  />
                </div>

                <TokenComparisonChart
                  data={dashboardData?.usageByDay || usageByDay}
                />
              </TabsContent>

              {/* Models Tab */}
              <TabsContent value="models" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(dashboardData?.usageByModel || usageByModel).map((model) => (
                    <motion.div
                      key={model.model}
                      variants={itemVariants}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu
                            className="h-5 w-5"
                            style={{ color: model.color }}
                          />
                          <span className="font-medium">
                            {model.modelDisplayName}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {model.percentage.toFixed(0)}%
                        </Badge>
                      </div>

                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${model.percentage}%`,
                            backgroundColor: model.color,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tokens</span>
                          <p className="font-medium">
                            {(model.tokens.totalTokens / 1000).toFixed(1)}K
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost</span>
                          <p className="font-medium">
                            {formatCurrency(model.cost.totalCost)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Input</span>
                          <p className="font-medium">
                            {(model.tokens.inputTokens / 1000).toFixed(1)}K
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Output</span>
                          <p className="font-medium">
                            {(model.tokens.outputTokens / 1000).toFixed(1)}K
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t text-sm text-muted-foreground">
                        {model.requestCount} requests
                      </div>
                    </motion.div>
                  ))}
                </div>

                <ModelDistributionChart
                  data={dashboardData?.usageByModel || usageByModel}
                  title="Cost Distribution by Model"
                  metric="cost"
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
