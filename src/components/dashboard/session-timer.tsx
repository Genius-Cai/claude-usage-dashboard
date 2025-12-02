'use client';

/**
 * Session Timer Component - Enhanced Version
 * Features:
 * - Stagger entrance animations
 * - Count-up animations for timer and stats
 * - Semantic colored status badges (sky/cyan active, amber idle, violet expired)
 * - Animated progress bar with fill effect and glow
 * - Scale animation for timer when critical
 * - Pulse animation in critical state
 * - Visual hierarchy with timer most prominent
 */

import * as React from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Clock, AlertCircle, Pause, Play, RefreshCw, MessageSquare, Zap, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanUsageRealtime } from '@/hooks';
import type { CurrentSession, SessionStatus } from '@/types';
import { cn } from '@/lib/utils';

interface SessionTimerProps {
  /** @deprecated Use plan prop instead. Session data is now fetched from plan-usage API */
  session?: CurrentSession | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  /** Plan to fetch usage data for (default: 'max20') */
  plan?: string;
}

/**
 * Semantic icon colors for different metrics
 */
const ICON_COLORS = {
  message: 'text-blue-500 dark:text-blue-400',
  token: 'text-amber-500 dark:text-amber-400',
  cost: 'text-emerald-500 dark:text-emerald-400',
  time: 'text-purple-500 dark:text-purple-400',
} as const;

/**
 * Get status colors based on percentage for progress bar
 */
function getProgressColors(percentage: number): {
  bar: string;
  glow: string;
} {
  if (percentage >= 100) {
    return {
      bar: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
      glow: 'shadow-lg shadow-violet-500/30',
    };
  }
  if (percentage >= 80) {
    return {
      bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
      glow: 'shadow-lg shadow-rose-500/30',
    };
  }
  if (percentage >= 50) {
    return {
      bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      glow: 'shadow-lg shadow-amber-500/30',
    };
  }
  return {
    bar: 'bg-gradient-to-r from-sky-500 to-cyan-500',
    glow: 'shadow-lg shadow-sky-500/30',
  };
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
 * Get status badge config with semantic colors
 * Active: sky/cyan, Idle: amber, Expired: violet
 */
function getStatusConfig(status: SessionStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        variant: 'default' as const,
        className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800',
        iconColor: 'text-sky-500 dark:text-sky-400',
        icon: Play,
      };
    case 'idle':
      return {
        label: 'Idle',
        variant: 'secondary' as const,
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
        iconColor: 'text-amber-500 dark:text-amber-400',
        icon: Pause,
      };
    case 'expired':
      return {
        label: 'Expired',
        variant: 'destructive' as const,
        className: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800',
        iconColor: 'text-violet-500 dark:text-violet-400',
        icon: AlertCircle,
      };
    case 'paused':
      return {
        label: 'Paused',
        variant: 'outline' as const,
        className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800',
        iconColor: 'text-slate-500 dark:text-slate-400',
        icon: Pause,
      };
    default:
      return {
        label: status,
        variant: 'secondary' as const,
        className: '',
        iconColor: 'text-muted-foreground',
        icon: Clock,
      };
  }
}

/**
 * Animated progress bar with fill effect and glow
 */
function AnimatedProgressBar({
  percentage,
  isCritical,
  isWarning,
  delay = 0,
}: {
  percentage: number;
  isCritical: boolean;
  isWarning: boolean;
  delay?: number;
}) {
  const displayPercentage = Math.min(percentage, 100);

  // Determine colors based on warning/critical state or percentage
  let barColors: { bar: string; glow: string };
  if (isCritical) {
    barColors = {
      bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
      glow: 'shadow-lg shadow-rose-500/30',
    };
  } else if (isWarning) {
    barColors = {
      bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      glow: 'shadow-lg shadow-amber-500/30',
    };
  } else {
    barColors = getProgressColors(percentage);
  }

  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
      <motion.div
        className={cn(
          'h-full rounded-full',
          barColors.bar,
          barColors.glow,
          isCritical && 'animate-pulse'
        )}
        initial={{ width: 0 }}
        animate={{ width: `${displayPercentage}%` }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
      />
    </div>
  );
}

/**
 * Animated number with count-up effect
 */
function AnimatedValue({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  React.useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now();
    const duration = 800;
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, isInView]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * Stat item with icon and animated value
 */
function StatItem({
  icon: Icon,
  iconColor,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  index = 0,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  index?: number;
}) {
  const isNumeric = typeof value === 'number';

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.4 + index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className={cn('h-3.5 w-3.5', iconColor)} />
      </div>
      <div className="text-lg font-semibold font-mono">
        {isNumeric ? (
          <AnimatedValue
            value={value}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
          />
        ) : (
          <span>{prefix}{value}{suffix}</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}

/**
 * Session timer card with countdown
 * Now uses plan-usage API for accurate session data from analyze_usage()
 */
export function SessionTimer({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session: _legacySession,
  isLoading: externalLoading = false,
  onRefresh,
  className,
  plan = 'max20',
}: SessionTimerProps) {
  // Fetch plan usage data which contains accurate session info from analyze_usage()
  const { data, isLoading: queryLoading, refetch } = usePlanUsageRealtime({ plan });

  // Convert remaining_minutes from API to seconds for countdown
  const initialRemainingSeconds = data?.reset_info?.remaining_minutes
    ? data.reset_info.remaining_minutes * 60
    : 0;

  const [remainingTime, setRemainingTime] = React.useState(initialRemainingSeconds);

  // Update remaining time when API data changes
  React.useEffect(() => {
    if (data?.reset_info?.remaining_minutes) {
      setRemainingTime(data.reset_info.remaining_minutes * 60);
    }
  }, [data?.reset_info?.remaining_minutes]);

  // Countdown timer - only run when we have valid data
  const shouldRunTimer = Boolean(data) && remainingTime > 0;
  React.useEffect(() => {
    if (!shouldRunTimer) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [shouldRunTimer]);

  // Calculate progress based on cost usage percentage from API
  const progressPercentage = data?.cost_usage?.percentage ?? 0;

  // Warning thresholds based on remaining time
  const isWarning = remainingTime > 0 && remainingTime <= 30 * 60; // 30 minutes
  const isCritical = remainingTime > 0 && remainingTime <= 10 * 60; // 10 minutes

  const isLoading = externalLoading || queryLoading;

  // Handle refresh - use both external handler and internal refetch
  const handleRefresh = React.useCallback(() => {
    refetch();
    onRefresh?.();
  }, [refetch, onRefresh]);

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

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Session Status
          </CardTitle>
          {handleRefresh && (
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          </motion.div>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            No active session
          </motion.p>
        </CardContent>
      </Card>
    );
  }

  // Determine status based on remaining time
  const sessionStatus: SessionStatus = remainingTime > 0 ? 'active' : 'expired';
  const statusConfig = getStatusConfig(sessionStatus);
  const StatusIcon = statusConfig.icon;

  // Extract session stats from plan usage data
  const sessionCost = data.cost_usage?.current ?? 0;
  const sessionMessages = data.message_usage?.current ?? 0;
  const sessionTokens = data.token_usage?.formatted_current ?? '0';

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300',
        isCritical && 'border-rose-500 dark:border-rose-400 shadow-lg shadow-rose-500/10',
        isWarning && !isCritical && 'border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/10',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Session Timer
          </CardTitle>
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Badge
              variant={statusConfig.variant}
              className={cn('gap-1 border', statusConfig.className)}
            >
              <StatusIcon className={cn('h-3 w-3', statusConfig.iconColor)} />
              {statusConfig.label}
            </Badge>
          </motion.div>
          {handleRefresh && (
            <motion.div
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display - Most prominent with scale animation when critical */}
        <AnimatePresence mode="wait">
          <motion.div
            key={Math.floor(remainingTime / 60)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: isCritical ? [1, 1.02, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.3 },
              scale: isCritical
                ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 },
            }}
            className={cn(
              'text-4xl font-mono font-bold tracking-wider text-center py-2',
              isCritical && 'text-rose-600 dark:text-rose-400',
              isWarning && !isCritical && 'text-amber-600 dark:text-amber-400',
              !isWarning && !isCritical && 'text-foreground'
            )}
          >
            {formatTime(remainingTime)}
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar - Animated fill with glow effect */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Session Usage</span>
            <span className="font-mono">
              <AnimatedValue value={progressPercentage} decimals={1} suffix="%" />
            </span>
          </div>
          <AnimatedProgressBar
            percentage={progressPercentage}
            isCritical={isCritical}
            isWarning={isWarning}
            delay={0.3}
          />
        </motion.div>

        {/* Warning Message with AnimatePresence */}
        <AnimatePresence>
          {(isWarning || isCritical) && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                'flex items-center gap-2 rounded-lg p-3 text-sm border',
                isCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
              )}
            >
              <motion.div
                animate={isCritical ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <AlertCircle className={cn(
                  'h-4 w-4 shrink-0',
                  isCritical ? 'text-rose-500' : 'text-amber-500'
                )} />
              </motion.div>
              <span>
                {isCritical
                  ? 'Session expiring soon! Consider wrapping up.'
                  : 'Session will expire in less than 30 minutes.'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Stats with stagger animation and semantic icon colors */}
        <motion.div
          className="border-t border-border pt-4"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        />
        <div className="grid grid-cols-3 gap-4">
          <StatItem
            icon={MessageSquare}
            iconColor={ICON_COLORS.message}
            label="Messages"
            value={sessionMessages}
            index={0}
          />
          <StatItem
            icon={Zap}
            iconColor={ICON_COLORS.token}
            label="Tokens"
            value={sessionTokens}
            index={1}
          />
          <StatItem
            icon={DollarSign}
            iconColor={ICON_COLORS.cost}
            label="Cost"
            value={sessionCost}
            prefix="$"
            decimals={2}
            index={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact session timer for header
 * Uses plan-usage API for accurate session data
 */
interface CompactSessionTimerProps {
  /** @deprecated Session data is now fetched from plan-usage API */
  session?: CurrentSession | null;
  className?: string;
  /** Plan to fetch usage data for (default: 'max20') */
  plan?: string;
}

export function CompactSessionTimer({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session: _legacySession,
  className,
  plan = 'max20',
}: CompactSessionTimerProps) {
  // Fetch plan usage data which contains accurate session info
  const { data, isLoading } = usePlanUsageRealtime({ plan });

  // Convert remaining_minutes from API to seconds for countdown
  const initialRemainingSeconds = data?.reset_info?.remaining_minutes
    ? data.reset_info.remaining_minutes * 60
    : 0;

  const [remainingTime, setRemainingTime] = React.useState(initialRemainingSeconds);

  React.useEffect(() => {
    if (data?.reset_info?.remaining_minutes) {
      setRemainingTime(data.reset_info.remaining_minutes * 60);
    }
  }, [data?.reset_info?.remaining_minutes]);

  // Countdown timer - only run when we have valid data
  const shouldRunTimer = Boolean(data) && remainingTime > 0;
  React.useEffect(() => {
    if (!shouldRunTimer) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [shouldRunTimer]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Clock className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!data) {
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
    <motion.div
      className={cn(
        'flex items-center gap-2 font-mono text-sm',
        isCritical && 'text-rose-600 dark:text-rose-400',
        isWarning && !isCritical && 'text-amber-600 dark:text-amber-400',
        !isWarning && !isCritical && 'text-foreground',
        className
      )}
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Clock className={cn(
        'h-4 w-4',
        isCritical && 'text-rose-500',
        isWarning && !isCritical && 'text-amber-500',
        !isWarning && !isCritical && ICON_COLORS.time
      )} />
      <span>{formatTime(remainingTime)}</span>
    </motion.div>
  );
}
