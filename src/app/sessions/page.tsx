'use client';

/**
 * Sessions Page
 * Session management with current session info, history, and timeline visualization
 *
 * Uses plan-usage API for accurate session data from analyze_usage()
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Play,
  Pause,
  AlertCircle,
  ChevronRight,
  Activity,
  Zap,
  DollarSign,
  Calendar,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionTimer } from '@/components/dashboard/session-timer';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { usePlanUsageRealtime, useRefreshData } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';
import type { SessionStatus, PlanUsageResponse } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Format duration in minutes to readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format date to relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get status config for session
 */
function getStatusConfig(status: SessionStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        icon: Play,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'idle':
      return {
        label: 'Idle',
        icon: Pause,
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'expired':
      return {
        label: 'Expired',
        icon: AlertCircle,
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      };
    case 'paused':
      return {
        label: 'Paused',
        icon: Pause,
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      };
    default:
      return {
        label: status,
        icon: Clock,
        className: '',
      };
  }
}

/**
 * Rolling window visualization component
 * Shows the 5-hour window with usage distribution
 */
function RollingWindowVisualization({ planUsage }: { planUsage: PlanUsageResponse | null }) {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Generate 5-hour blocks based on the session window
  const blocks = React.useMemo(() => {
    const now = currentTime;
    const blocksArr = [];

    // Calculate session start from reset time (reset_time - 5 hours = start)
    let sessionStartTime: Date | null = null;
    if (planUsage?.reset_info?.reset_time) {
      const resetTime = new Date(planUsage.reset_info.reset_time);
      sessionStartTime = new Date(resetTime.getTime() - 5 * 60 * 60 * 1000);
    }

    for (let i = 0; i < 5; i++) {
      const blockStart = new Date(now.getTime() - (4 - i) * 60 * 60 * 1000);
      const blockEnd = new Date(blockStart.getTime() + 60 * 60 * 1000);

      let usage = 0;
      let isActive = false;

      if (planUsage && sessionStartTime) {
        // Check if this block is within the active session window
        if (blockEnd >= sessionStartTime && blockStart <= now) {
          isActive = true;
          // Distribute usage across active blocks (simplified)
          const totalTokens = planUsage.token_usage?.current ?? 0;
          const tokenLimit = planUsage.token_usage?.limit ?? 1;
          usage = Math.min(100, (totalTokens / tokenLimit) * 100);
        }
      }

      blocksArr.push({
        hour: blockStart.getHours(),
        label: blockStart.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        isActive,
        usage: isActive ? usage : 0,
        isCurrent: i === 4,
      });
    }

    return blocksArr;
  }, [currentTime, planUsage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Timer className="h-4 w-4" />
          5-Hour Rolling Window
        </CardTitle>
        <CardDescription>
          Your usage resets on a rolling 5-hour window
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="flex items-end gap-1 h-32">
            {blocks.map((block, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="flex-1 w-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(10, block.usage)}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={cn(
                      'w-full rounded-t-md transition-colors',
                      block.isCurrent
                        ? 'bg-primary'
                        : block.isActive
                        ? 'bg-primary/60'
                        : 'bg-muted'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-xs',
                    block.isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {block.label}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span>Current hour</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-primary/60" />
              <span>Active usage</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <span>No usage</span>
            </div>
          </div>

          {/* Info text */}
          <p className="text-sm text-muted-foreground text-center">
            Usage limits reset continuously based on a 5-hour sliding window, not at fixed times.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Current session display component using plan usage data
 */
function CurrentSessionDisplay({ planUsage }: { planUsage: PlanUsageResponse }) {
  const { formatCurrency } = useSettingsStore();

  const isActive = planUsage.reset_info.remaining_minutes > 0;
  const statusConfig = getStatusConfig(isActive ? 'active' : 'expired');
  const StatusIcon = statusConfig.icon;

  // Calculate duration from remaining time (5 hour window - remaining = elapsed)
  const elapsedMinutes = Math.max(0, 5 * 60 - planUsage.reset_info.remaining_minutes);

  // Calculate start time
  const resetTime = new Date(planUsage.reset_info.reset_time);
  const startTime = new Date(resetTime.getTime() - 5 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      {/* Status icon */}
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
          statusConfig.className
        )}
      >
        <StatusIcon className="h-5 w-5" />
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            Current Session
          </span>
          <Badge variant="outline" className={cn('shrink-0', statusConfig.className)}>
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(Math.floor(elapsedMinutes))}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {planUsage.token_usage?.formatted_current ?? '0'}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {planUsage.message_usage?.current ?? 0} messages
          </span>
        </div>
      </div>

      {/* Cost and time */}
      <div className="text-right shrink-0">
        <div className="font-medium">{formatCurrency(planUsage.cost_usage?.current ?? 0)}</div>
        <div className="text-xs text-muted-foreground">
          {formatRelativeTime(startTime.toISOString())}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </motion.div>
  );
}

/**
 * Loading skeleton for sessions page
 */
function SessionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}

/**
 * Sessions Page Component
 * Uses a single API call (plan-usage) for all session data
 */
export default function SessionsPage() {
  const { formatCurrency } = useSettingsStore();
  const { refresh } = useRefreshData();

  // Single API call for all session data - this uses plan-usage endpoint
  // which calls analyze_usage() for accurate session blocks
  const { data: planUsage, isLoading, refetch } = usePlanUsageRealtime({ plan: 'max20' });

  // Handle refresh - use internal refetch
  const handleRefresh = React.useCallback(() => {
    refetch();
    refresh();
  }, [refetch, refresh]);

  // Calculate session stats from plan usage data
  const sessionStats = React.useMemo(() => {
    if (!planUsage) return null;

    const elapsedMinutes = Math.max(0, 5 * 60 - planUsage.reset_info.remaining_minutes);

    return {
      duration: Math.floor(elapsedMinutes),
      tokens: planUsage.token_usage?.current ?? 0,
      cost: planUsage.cost_usage?.current ?? 0,
      messages: planUsage.message_usage?.current ?? 0,
      burnRate: planUsage.burn_rate?.tokens_per_minute ?? 0,
      costPerHour: planUsage.burn_rate?.cost_per_hour ?? 0,
    };
  }, [planUsage]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage your Claude Code sessions
          </p>
        </div>
        <SessionsSkeleton />
      </div>
    );
  }

  // Check if there's an active session with usage
  const hasActiveSession = planUsage && (planUsage.message_usage?.current ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage your Claude Code sessions
          </p>
        </motion.div>

        {/* Current Session & Rolling Window */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
          {/* SessionTimer uses usePlanUsageRealtime internally, no need to pass session */}
          <SessionTimer onRefresh={handleRefresh} />
          <RollingWindowVisualization planUsage={planUsage ?? null} />
        </motion.div>

        {/* Current Session Stats */}
        {sessionStats && (
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-medium mb-4">Current Session Stats</h2>
            <StatsGrid columns={4}>
              <StatsCard
                title="Session Duration"
                value={formatDuration(sessionStats.duration)}
                icon={Clock}
                subtitle="Active time"
              />
              <StatsCard
                title="Tokens Used"
                value={sessionStats.tokens.toLocaleString()}
                icon={Zap}
                subtitle={`${sessionStats.burnRate.toFixed(1)}/min`}
              />
              <StatsCard
                title="Messages"
                value={sessionStats.messages}
                icon={Activity}
              />
              <StatsCard
                title="Session Cost"
                value={formatCurrency(sessionStats.cost)}
                icon={DollarSign}
                subtitle={`$${sessionStats.costPerHour.toFixed(2)}/hr`}
              />
            </StatsGrid>
          </motion.div>
        )}

        {/* Session History */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Session History</CardTitle>
                  <CardDescription>
                    Your current Claude Code session
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {hasActiveSession ? '1 active session' : 'No active session'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {hasActiveSession && planUsage ? (
                <div className="space-y-3">
                  <CurrentSessionDisplay planUsage={planUsage} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-4 opacity-50" />
                  <p>No active session</p>
                  <p className="text-sm mt-2">Start using Claude Code to begin a session</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
