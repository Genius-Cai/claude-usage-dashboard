'use client';

/**
 * Session Timer Component
 * Displays countdown timer for current session with visual indicators
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle, Pause, Play, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { CurrentSession, SessionStatus } from '@/types';
import { cn } from '@/lib/utils';

interface SessionTimerProps {
  session: CurrentSession | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':');
}

/**
 * Get status badge config
 */
function getStatusConfig(status: SessionStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: Play,
      };
    case 'idle':
      return {
        label: 'Idle',
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Pause,
      };
    case 'expired':
      return {
        label: 'Expired',
        variant: 'destructive' as const,
        className: '',
        icon: AlertCircle,
      };
    case 'paused':
      return {
        label: 'Paused',
        variant: 'outline' as const,
        className: '',
        icon: Pause,
      };
    default:
      return {
        label: status,
        variant: 'secondary' as const,
        className: '',
        icon: Clock,
      };
  }
}

/**
 * Session timer card with countdown
 */
export function SessionTimer({
  session,
  isLoading = false,
  onRefresh,
  className,
}: SessionTimerProps) {
  const [remainingTime, setRemainingTime] = React.useState(
    session?.remainingTime || 0
  );

  // Update remaining time when session changes
  React.useEffect(() => {
    if (session?.remainingTime) {
      setRemainingTime(session.remainingTime);
    }
  }, [session?.remainingTime]);

  // Countdown timer
  React.useEffect(() => {
    if (!session || session.status !== 'active' || remainingTime <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [session, remainingTime]);

  // Track the initial time for progress calculation
  const [initialTime] = React.useState(() => Date.now());

  // Calculate progress percentage using memoized initial time
  const totalDuration = session
    ? session.remainingTime + (initialTime - new Date(session.startTime).getTime()) / 1000
    : 0;
  const progressPercentage = totalDuration > 0
    ? ((totalDuration - remainingTime) / totalDuration) * 100
    : 0;

  // Warning thresholds
  const isWarning = remainingTime > 0 && remainingTime <= 30 * 60; // 30 minutes
  const isCritical = remainingTime > 0 && remainingTime <= 10 * 60; // 10 minutes

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-2 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Session Status
          </CardTitle>
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">No active session</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(session.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        isCritical && 'border-red-500 dark:border-red-400',
        isWarning && !isCritical && 'border-yellow-500 dark:border-yellow-400',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Session Timer
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant={statusConfig.variant}
            className={cn('gap-1', statusConfig.className)}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
          {onRefresh && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={remainingTime}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            className={cn(
              'text-4xl font-mono font-bold tracking-wider',
              isCritical && 'text-red-500 dark:text-red-400',
              isWarning && !isCritical && 'text-yellow-500 dark:text-yellow-400'
            )}
          >
            {formatTime(remainingTime)}
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Session Progress</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress
            value={progressPercentage}
            className={cn(
              'h-2',
              isCritical && '[&>div]:bg-red-500',
              isWarning && !isCritical && '[&>div]:bg-yellow-500'
            )}
          />
        </div>

        {/* Warning Message */}
        <AnimatePresence>
          {(isWarning || isCritical) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                'flex items-center gap-2 rounded-md p-2 text-sm',
                isCritical
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {isCritical
                  ? 'Session expiring soon! Consider wrapping up.'
                  : 'Session will expire in less than 30 minutes.'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {session.requestCount}
            </div>
            <div className="text-xs text-muted-foreground">Requests</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {(session.totalTokens / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-muted-foreground">Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              ${session.totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Cost</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact session timer for header
 */
interface CompactSessionTimerProps {
  session: CurrentSession | null;
  className?: string;
}

export function CompactSessionTimer({ session, className }: CompactSessionTimerProps) {
  const [remainingTime, setRemainingTime] = React.useState(
    session?.remainingTime || 0
  );

  React.useEffect(() => {
    if (session?.remainingTime) {
      setRemainingTime(session.remainingTime);
    }
  }, [session?.remainingTime]);

  React.useEffect(() => {
    if (!session || session.status !== 'active' || remainingTime <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [session, remainingTime]);

  if (!session) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Clock className="h-4 w-4" />
        <span className="text-sm">No session</span>
      </div>
    );
  }

  const isWarning = remainingTime > 0 && remainingTime <= 30 * 60;
  const isCritical = remainingTime > 0 && remainingTime <= 10 * 60;

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-mono text-sm',
        isCritical && 'text-red-500 dark:text-red-400',
        isWarning && !isCritical && 'text-yellow-500 dark:text-yellow-400',
        !isWarning && !isCritical && 'text-foreground',
        className
      )}
    >
      <Clock className="h-4 w-4" />
      <span>{formatTime(remainingTime)}</span>
    </div>
  );
}
