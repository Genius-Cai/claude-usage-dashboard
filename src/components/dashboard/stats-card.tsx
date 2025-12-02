'use client';

/**
 * Stats Card Component - Enhanced Version
 * Features:
 * - Stagger entrance animations using framer-motion
 * - Count-up animations for numbers
 * - Semantic colored icons (emerald, amber, blue, purple, orange)
 * - Animated progress bar fill effect with glow
 * - Icon background with rounded corners matching status color
 */

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Semantic icon colors for different metrics
 */
export const ICON_COLORS = {
  cost: {
    text: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950/30',
  },
  token: {
    text: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950/30',
  },
  message: {
    text: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-950/30',
  },
  time: {
    text: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-950/30',
  },
  burn: {
    text: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-950/30',
  },
} as const;

export type IconColorType = keyof typeof ICON_COLORS;

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: IconColorType;
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  iconClassName?: string;
  index?: number;
  children?: React.ReactNode;
}

/**
 * Format large numbers for display
 */
function formatValue(value: string | number): string {
  if (typeof value === 'string') return value;

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * Parse numeric value from formatted string or number
 */
function parseNumericValue(value: string | number): number {
  if (typeof value === 'number') return value;

  // Remove currency symbols, commas, and extract number
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Animated number with count-up effect
 */
function AnimatedValue({
  value,
  formatFn,
  className,
}: {
  value: string | number;
  formatFn?: (val: string | number) => string;
  className?: string;
}) {
  const numericValue = parseNumericValue(value);
  const [displayValue, setDisplayValue] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  React.useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now();
    const duration = 800;
    const startValue = 0;
    const endValue = numericValue;

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
  }, [numericValue, isInView]);

  // Reconstruct the formatted value with animated number
  const formattedDisplay = React.useMemo(() => {
    if (formatFn) {
      return formatFn(displayValue);
    }

    // If original was a string with prefix/suffix, try to preserve it
    if (typeof value === 'string') {
      const prefix = value.match(/^[^0-9.-]*/)?.[0] || '';
      const suffix = value.match(/[^0-9.-]*$/)?.[0] || '';
      return `${prefix}${formatValue(displayValue)}${suffix}`;
    }

    return formatValue(displayValue);
  }, [displayValue, value, formatFn]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {formattedDisplay}
    </span>
  );
}

/**
 * Get trend icon and color
 * Uses modern palette: rose for increases (bad), sky for decreases (good)
 */
function getTrendConfig(direction: TrendDirection) {
  switch (direction) {
    case 'up':
      return {
        icon: TrendingUp,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-100 dark:bg-rose-950/30',
      };
    case 'down':
      return {
        icon: TrendingDown,
        colorClass: 'text-sky-600 dark:text-sky-400',
        bgClass: 'bg-sky-100 dark:bg-sky-950/30',
      };
    default:
      return {
        icon: Minus,
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted',
      };
  }
}

/**
 * Get status colors based on percentage
 */
function getStatusColors(percentage: number): {
  text: string;
  bar: string;
  bg: string;
  glow: string;
} {
  if (percentage >= 100) {
    return {
      text: 'text-violet-600 dark:text-violet-400',
      bar: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
      bg: 'bg-violet-100 dark:bg-violet-950/30',
      glow: 'shadow-lg shadow-violet-500/20',
    };
  }
  if (percentage >= 80) {
    return {
      text: 'text-rose-600 dark:text-rose-400',
      bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
      bg: 'bg-rose-100 dark:bg-rose-950/30',
      glow: 'shadow-lg shadow-rose-500/20',
    };
  }
  if (percentage >= 50) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      bg: 'bg-amber-100 dark:bg-amber-950/30',
      glow: 'shadow-lg shadow-amber-500/20',
    };
  }
  return {
    text: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-gradient-to-r from-sky-500 to-cyan-500',
    bg: 'bg-sky-100 dark:bg-sky-950/30',
    glow: 'shadow-lg shadow-sky-500/20',
  };
}

/**
 * Animated progress bar with fill effect and glow
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
          'h-full rounded-full',
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
 * Reusable stats card component with animations
 */
export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  isLoading = false,
  className,
  valueClassName,
  iconClassName,
  index = 0,
  children,
}: StatsCardProps) {
  const trendConfig = trend ? getTrendConfig(trend.direction) : null;
  const TrendIcon = trendConfig?.icon;
  const iconColorConfig = iconColor ? ICON_COLORS[iconColor] : null;

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="h-full"
    >
      <Card className={cn('overflow-hidden h-full', className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && (
            <div
              className={cn(
                'p-2 rounded-md',
                iconColorConfig?.bg || 'bg-muted'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  iconColorConfig?.text || 'text-muted-foreground',
                  iconClassName
                )}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
            className="space-y-1"
          >
            <div
              className={cn(
                'text-2xl font-bold tracking-tight',
                valueClassName
              )}
            >
              <AnimatedValue value={value} />
            </div>

            <div className="flex items-center gap-2">
              {trend && TrendIcon && (
                <motion.div
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    trendConfig?.bgClass,
                    trendConfig?.colorClass
                  )}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                >
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trend.value).toFixed(1)}%</span>
                </motion.div>
              )}
              {(subtitle || trend?.label) && (
                <span className="text-xs text-muted-foreground">
                  {trend?.label || subtitle}
                </span>
              )}
            </div>

            {children}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Stats card with animated progress indicator
 */
interface StatsCardWithProgressProps extends Omit<StatsCardProps, 'children'> {
  current: number;
  total: number;
  progressLabel?: string;
  warningThreshold?: number;
}

export function StatsCardWithProgress({
  current,
  total,
  progressLabel,
  warningThreshold = 80,
  index = 0,
  ...props
}: StatsCardWithProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isWarning = percentage >= warningThreshold;
  const isOverLimit = percentage >= 100;
  const colors = getStatusColors(percentage);

  return (
    <StatsCard {...props} index={index}>
      <motion.div
        className="mt-3 space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
      >
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {progressLabel || 'Usage'}
          </span>
          <span
            className={cn(
              'font-medium font-mono',
              isOverLimit && colors.text,
              isWarning && !isOverLimit && colors.text
            )}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
        <AnimatedProgressBar
          percentage={percentage}
          delay={index * 0.1 + 0.3}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">{formatValue(current)}</span>
          <span className="tabular-nums">{formatValue(total)}</span>
        </div>
      </motion.div>
    </StatsCard>
  );
}

/**
 * Mini stats display for compact layouts with animations
 */
interface MiniStatsProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: IconColorType;
  className?: string;
  index?: number;
}

export function MiniStats({
  label,
  value,
  icon: Icon,
  iconColor,
  className,
  index = 0,
}: MiniStatsProps) {
  const iconColorConfig = iconColor ? ICON_COLORS[iconColor] : null;

  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {Icon && (
        <div
          className={cn(
            'p-1.5 rounded-md',
            iconColorConfig?.bg || 'bg-muted'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              iconColorConfig?.text || 'text-muted-foreground'
            )}
          />
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium tabular-nums">
          <AnimatedValue value={value} />
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Stats grid for displaying multiple stats with stagger animation
 */
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {React.Children.map(children, (child, idx) => {
        if (React.isValidElement<{ index?: number }>(child)) {
          return React.cloneElement(child, {
            index: child.props.index ?? idx,
          });
        }
        return child;
      })}
    </div>
  );
}
