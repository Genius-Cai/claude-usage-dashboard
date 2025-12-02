'use client';

/**
 * Stats Card Component
 * Reusable statistics card with icon, value, and trend
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TrendDirection = 'up' | 'down' | 'neutral';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  iconClassName?: string;
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
 * Get trend icon and color
 */
function getTrendConfig(direction: TrendDirection) {
  switch (direction) {
    case 'up':
      return {
        icon: TrendingUp,
        colorClass: 'text-red-500 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-900/30',
      };
    case 'down':
      return {
        icon: TrendingDown,
        colorClass: 'text-green-500 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-900/30',
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
 * Reusable stats card component
 */
export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  isLoading = false,
  className,
  valueClassName,
  iconClassName,
  children,
}: StatsCardProps) {
  const trendConfig = trend ? getTrendConfig(trend.direction) : null;
  const TrendIcon = trendConfig?.icon;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon
            className={cn(
              'h-4 w-4 text-muted-foreground',
              iconClassName
            )}
          />
        )}
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          <div
            className={cn(
              'text-2xl font-bold tracking-tight',
              valueClassName
            )}
          >
            {formatValue(value)}
          </div>

          <div className="flex items-center gap-2">
            {trend && TrendIcon && (
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  trendConfig?.bgClass,
                  trendConfig?.colorClass
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
              </div>
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
  );
}

/**
 * Stats card with progress indicator
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
  ...props
}: StatsCardWithProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const isWarning = percentage >= warningThreshold;
  const isOverLimit = percentage >= 100;

  return (
    <StatsCard {...props}>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {progressLabel || 'Usage'}
          </span>
          <span
            className={cn(
              'font-medium',
              isOverLimit && 'text-red-500',
              isWarning && !isOverLimit && 'text-yellow-500'
            )}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className={cn(
              'h-full rounded-full',
              isOverLimit
                ? 'bg-red-500'
                : isWarning
                ? 'bg-yellow-500'
                : 'bg-primary'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(current)}</span>
          <span>{formatValue(total)}</span>
        </div>
      </div>
    </StatsCard>
  );
}

/**
 * Mini stats display for compact layouts
 */
interface MiniStatsProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function MiniStats({ label, value, icon: Icon, className }: MiniStatsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{formatValue(value)}</span>
      </div>
    </div>
  );
}

/**
 * Stats grid for displaying multiple stats
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
      {children}
    </div>
  );
}
