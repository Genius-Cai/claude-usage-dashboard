'use client';

/**
 * Plan Usage Card Component - Enhanced Version
 * Features:
 * - Semantic colored icons
 * - Animated progress bars with fill effect
 * - Count-up number animations
 * - Stagger entrance animations
 * - Cost rate display
 * - Visual hierarchy
 */

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePlanUsageRealtime } from '@/hooks';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Zap,
  MessageSquare,
  Clock,
  TrendingUp,
  Cpu,
  Flame,
} from 'lucide-react';
import type { UsageVsLimit } from '@/types';

interface PlanUsageCardProps {
  plan?: string;
  className?: string;
}

/**
 * Get sophisticated color classes based on percentage
 * Uses a modern palette: blue -> amber -> rose -> violet (overage)
 */
function getStatusColors(percentage: number): {
  text: string;
  bar: string;
  bg: string;
  icon: string;
  glow: string;
} {
  if (percentage >= 100) {
    return {
      text: 'text-violet-600 dark:text-violet-400',
      bar: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
      bg: 'bg-violet-100 dark:bg-violet-950/30',
      icon: 'text-violet-500',
      glow: 'shadow-violet-500/20',
    };
  }
  if (percentage >= 80) {
    return {
      text: 'text-rose-600 dark:text-rose-400',
      bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
      bg: 'bg-rose-100 dark:bg-rose-950/30',
      icon: 'text-rose-500',
      glow: 'shadow-rose-500/20',
    };
  }
  if (percentage >= 50) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      bg: 'bg-amber-100 dark:bg-amber-950/30',
      icon: 'text-amber-500',
      glow: 'shadow-amber-500/20',
    };
  }
  return {
    text: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-gradient-to-r from-sky-500 to-cyan-500',
    bg: 'bg-sky-100 dark:bg-sky-950/30',
    icon: 'text-sky-500',
    glow: 'shadow-sky-500/20',
  };
}

/**
 * Semantic icon colors for different metrics
 */
const ICON_COLORS = {
  cost: 'text-emerald-500 dark:text-emerald-400',
  token: 'text-amber-500 dark:text-amber-400',
  message: 'text-blue-500 dark:text-blue-400',
  time: 'text-purple-500 dark:text-purple-400',
  burn: 'text-orange-500 dark:text-orange-400',
  model: 'text-cyan-500 dark:text-cyan-400',
} as const;

/**
 * Animated progress bar with fill effect
 */
function AnimatedProgressBar({
  percentage,
  delay = 0,
}: {
  percentage: number;
  delay?: number;
}) {
  const colors = getStatusColors(percentage);
  const displayPercentage = Math.min(percentage, 100);

  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
      <motion.div
        className={cn(
          'h-full rounded-full shadow-lg',
          colors.bar,
          colors.glow
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
  decimals = 1,
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
 * Modern usage meter component with animations
 */
function UsageMeter({
  label,
  icon: Icon,
  iconColor,
  usage,
  index = 0,
}: {
  label: string;
  icon: React.ElementType;
  iconColor: string;
  usage: UsageVsLimit;
  index?: number;
}) {
  const colors = getStatusColors(usage.percentage);

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1 rounded-md', colors.bg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-mono font-semibold', colors.text)}>
            <AnimatedValue value={usage.percentage} suffix="%" />
          </span>
        </div>
      </div>
      <AnimatedProgressBar percentage={usage.percentage} delay={index * 0.1} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{usage.formatted_current}</span>
        <span className="tabular-nums">/ {usage.formatted_limit}</span>
      </div>
    </motion.div>
  );
}

/**
 * Info row with icon and animated value
 */
function InfoRow({
  icon: Icon,
  iconColor,
  label,
  children,
  index = 0,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      className="flex items-center justify-between"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.3 + index * 0.05,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconColor)} />
        <span className="text-sm">{label}</span>
      </div>
      {children}
    </motion.div>
  );
}

/**
 * Plan Usage Card - displays usage vs limits like claude-monitor CLI
 * Enhanced with animations and visual hierarchy
 */
export function PlanUsageCard({ plan = 'max20', className }: PlanUsageCardProps) {
  const { formatCurrency } = useSettingsStore();
  const { data, isLoading, isError, error } = usePlanUsageRealtime({ plan });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Plan Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {error?.message || 'Unable to load usage data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CardTitle className="text-base font-medium">Plan Usage</CardTitle>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Badge variant="secondary" className="text-xs">
            {data.plan.display_name}
          </Badge>
        </motion.div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Usage - Primary metric, most visual weight */}
        <UsageMeter
          label="Cost Usage"
          icon={DollarSign}
          iconColor={ICON_COLORS.cost}
          usage={data.cost_usage}
          index={0}
        />

        {/* Token Usage */}
        <UsageMeter
          label="Token Usage"
          icon={Zap}
          iconColor={ICON_COLORS.token}
          usage={data.token_usage}
          index={1}
        />

        {/* Message Usage */}
        <UsageMeter
          label="Messages"
          icon={MessageSquare}
          iconColor={ICON_COLORS.message}
          usage={data.message_usage}
          index={2}
        />

        {/* Divider */}
        <motion.div
          className="border-t border-border pt-4"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        />

        {/* Reset Time */}
        <InfoRow
          icon={Clock}
          iconColor={ICON_COLORS.time}
          label="Time to Reset"
          index={0}
        >
          <span
            className={cn(
              'text-sm font-mono font-semibold tabular-nums',
              data.reset_info.remaining_minutes < 30
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-muted-foreground'
            )}
          >
            {data.reset_info.remaining_formatted}
          </span>
        </InfoRow>

        {/* Burn Rate - Enhanced with cost rate */}
        <InfoRow
          icon={Flame}
          iconColor={ICON_COLORS.burn}
          label="Burn Rate"
          index={1}
        >
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm font-mono text-muted-foreground">
              <AnimatedValue
                value={data.burn_rate.tokens_per_minute}
                decimals={0}
                suffix=" tok/min"
              />
            </span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <AnimatedValue
                value={data.burn_rate.cost_per_hour / 60}
                decimals={4}
                prefix="$"
                suffix="/min"
              />
            </span>
          </div>
        </InfoRow>

        {/* Model Distribution */}
        {Object.keys(data.model_distribution).length > 0 && (
          <>
            <motion.div
              className="border-t border-border pt-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            />
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.45 }}
            >
              <div className="flex items-center gap-2">
                <Cpu className={cn('h-4 w-4', ICON_COLORS.model)} />
                <span className="text-sm">Model Distribution</span>
              </div>
              <div className="space-y-1">
                {Object.entries(data.model_distribution)
                  .slice(0, 3)
                  .map(([model, percentage], idx) => (
                    <motion.div
                      key={model}
                      className="flex items-center justify-between text-xs"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.5 + idx * 0.05 }}
                    >
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {model.replace('claude-', '').replace(/-\d+$/, '')}
                      </span>
                      <span className="font-mono">{percentage}%</span>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          </>
        )}

        {/* Predictions */}
        {(data.predictions.tokens_run_out || data.predictions.limit_resets_at) && (
          <>
            <motion.div
              className="border-t border-border pt-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.55 }}
            />
            <motion.div
              className="space-y-1 text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              {data.predictions.tokens_run_out && (
                <div className="flex justify-between">
                  <span>Tokens run out:</span>
                  <span className="font-mono text-amber-500">
                    {data.predictions.tokens_run_out}
                  </span>
                </div>
              )}
              {data.predictions.limit_resets_at && (
                <div className="flex justify-between">
                  <span>Limit resets:</span>
                  <span className="font-mono">
                    {data.predictions.limit_resets_at}
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
