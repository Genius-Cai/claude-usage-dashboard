'use client';

/**
 * Plan Usage Card Component
 * Displays real-time usage vs plan limits matching claude-monitor CLI
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import type { UsageVsLimit } from '@/types';

interface PlanUsageCardProps {
  plan?: string;
  className?: string;
}

/**
 * Get color class based on percentage
 */
function getPercentageColor(percentage: number): string {
  if (percentage >= 80) return 'text-red-500';
  if (percentage >= 50) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get progress bar color based on percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Usage meter component
 */
function UsageMeter({
  label,
  icon: Icon,
  usage,
  showBar = true,
}: {
  label: string;
  icon: React.ElementType;
  usage: UsageVsLimit;
  showBar?: boolean;
}) {
  const colorClass = getPercentageColor(usage.percentage);
  const progressColor = getProgressColor(usage.percentage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-mono font-semibold', colorClass)}>
            {usage.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      {showBar && (
        <div className="relative">
          <Progress value={usage.percentage} className="h-2" />
          <div
            className={cn('absolute inset-0 h-2 rounded-full', progressColor)}
            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
          />
        </div>
      )}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{usage.formatted_current}</span>
        <span>/ {usage.formatted_limit}</span>
      </div>
    </div>
  );
}

/**
 * Plan Usage Card - displays usage vs limits like claude-monitor CLI
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
        <CardTitle className="text-base font-medium">
          Plan Usage
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {data.plan.display_name}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Usage */}
        <UsageMeter
          label="Cost Usage"
          icon={DollarSign}
          usage={data.cost_usage}
        />

        {/* Token Usage */}
        <UsageMeter
          label="Token Usage"
          icon={Zap}
          usage={data.token_usage}
        />

        {/* Message Usage */}
        <UsageMeter
          label="Messages"
          icon={MessageSquare}
          usage={data.message_usage}
        />

        {/* Divider */}
        <div className="border-t border-border pt-4" />

        {/* Reset Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Time to Reset</span>
          </div>
          <span className={cn(
            'text-sm font-mono font-semibold',
            data.reset_info.remaining_minutes < 30 ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {data.reset_info.remaining_formatted}
          </span>
        </div>

        {/* Burn Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Burn Rate</span>
          </div>
          <span className="text-sm font-mono text-muted-foreground">
            {data.burn_rate.tokens_per_minute.toFixed(0)} tok/min
          </span>
        </div>

        {/* Model Distribution */}
        {Object.keys(data.model_distribution).length > 0 && (
          <>
            <div className="border-t border-border pt-4" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Model Distribution</span>
              </div>
              <div className="space-y-1">
                {Object.entries(data.model_distribution)
                  .slice(0, 3)
                  .map(([model, percentage]) => (
                    <div
                      key={model}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {model.replace('claude-', '').replace(/-\d+$/, '')}
                      </span>
                      <span className="font-mono">{percentage}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* Predictions */}
        {(data.predictions.tokens_run_out || data.predictions.limit_resets_at) && (
          <>
            <div className="border-t border-border pt-4" />
            <div className="space-y-1 text-xs text-muted-foreground">
              {data.predictions.tokens_run_out && (
                <div className="flex justify-between">
                  <span>Tokens run out:</span>
                  <span className="font-mono text-yellow-500">
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
