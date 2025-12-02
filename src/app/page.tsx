'use client';

/**
 * Main Dashboard Page
 * Displays usage statistics, charts, and session information
 *
 * Performance optimizations:
 * - Code splitting: Tab components loaded dynamically with next/dynamic
 * - Conditional fetching: Data only fetched when tab is active (in tab components)
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layout/header';
import { CostCard } from '@/components/dashboard/cost-card';
import { StatsCard, StatsCardWithProgress, StatsGrid } from '@/components/dashboard/stats-card';
import { useDashboard } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';
import { PLAN_CONFIGS } from '@/types';

// Dynamic imports for tab components (code splitting)
const OverviewTab = dynamic(
  () => import('./tabs/overview-tab').then((mod) => ({ default: mod.OverviewTab })),
  {
    loading: () => <TabLoadingSkeleton />,
    ssr: false,
  }
);

const AnalyticsTab = dynamic(
  () => import('./tabs/analytics-tab').then((mod) => ({ default: mod.AnalyticsTab })),
  {
    loading: () => <TabLoadingSkeleton />,
    ssr: false,
  }
);

const ModelsTab = dynamic(
  () => import('./tabs/models-tab').then((mod) => ({ default: mod.ModelsTab })),
  {
    loading: () => <TabLoadingSkeleton />,
    ssr: false,
  }
);

/**
 * Loading skeleton for tab content
 */
function TabLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[300px]" />
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[250px]" />
        </div>
      </div>
      <Skeleton className="h-[100px]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}

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

  const { plan } = useSettingsStore();
  const planConfig = PLAN_CONFIGS[plan];

  // Fetch dashboard data (core data only, chart data loaded in tab components)
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

              {/* Overview Tab - Loaded dynamically */}
              <TabsContent value="overview" className="space-y-6">
                {activeTab === 'overview' && (
                  <OverviewTab
                    session={session ?? null}
                    todayStats={todayStats}
                    onRefresh={refresh}
                  />
                )}
              </TabsContent>

              {/* Analytics Tab - Loaded dynamically */}
              <TabsContent value="analytics" className="space-y-6">
                {activeTab === 'analytics' && (
                  <AnalyticsTab weekStats={weekStats} />
                )}
              </TabsContent>

              {/* Models Tab - Loaded dynamically */}
              <TabsContent value="models" className="space-y-6">
                {activeTab === 'models' && <ModelsTab />}
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
