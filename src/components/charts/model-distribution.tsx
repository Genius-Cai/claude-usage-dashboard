'use client';

/**
 * Model Distribution Chart Component
 * Pie chart showing usage distribution across models
 */

import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { UsageByModel } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

interface ModelDistributionChartProps {
  data: UsageByModel[];
  isLoading?: boolean;
  title?: string;
  className?: string;
  showLegend?: boolean;
  metric?: 'cost' | 'tokens' | 'requests';
}

/**
 * Custom tooltip for pie chart
 */
function CustomTooltip({
  active,
  payload,
  formatCurrency,
  metric,
}: {
  active?: boolean;
  payload?: Array<{
    payload: UsageByModel & { name: string; value: number };
  }>;
  formatCurrency: (amount: number) => string;
  metric: 'cost' | 'tokens' | 'requests';
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium">{data.modelDisplayName}</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cost:</span>
          <span className="font-medium">{formatCurrency(data.cost.totalCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tokens:</span>
          <span className="font-medium">
            {(data.tokens.totalTokens / 1000).toFixed(1)}K
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Requests:</span>
          <span className="font-medium">{data.requestCount}</span>
        </div>
        <div className="flex justify-between pt-1 border-t">
          <span className="text-muted-foreground">Share:</span>
          <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom legend component
 */
function CustomLegend({
  payload,
  formatCurrency,
}: {
  payload?: Array<{
    value: string;
    color: string;
    payload: UsageByModel & { value: number };
  }>;
  formatCurrency: (amount: number) => string;
}) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm">{entry.value}</span>
          <Badge variant="secondary" className="text-xs">
            {entry.payload.percentage.toFixed(0)}%
          </Badge>
        </div>
      ))}
    </div>
  );
}

/**
 * Model distribution pie chart
 */
export function ModelDistributionChart({
  data,
  isLoading = false,
  title = 'Model Usage',
  className,
  showLegend = true,
  metric = 'cost',
}: ModelDistributionChartProps) {
  const { formatCurrency } = useSettingsStore();

  // Transform data for pie chart based on metric
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      ...item,
      name: item.modelDisplayName,
      value:
        metric === 'cost'
          ? item.cost.totalCost
          : metric === 'tokens'
          ? item.tokens.totalTokens
          : item.requestCount,
    }));
  }, [data, metric]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex justify-center">
          <Skeleton className="h-[250px] w-[250px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={500}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                content={
                  <CustomTooltip
                    formatCurrency={formatCurrency}
                    metric={metric}
                  />
                }
              />
              {showLegend && (
                <Legend
                  content={
                    <CustomLegend formatCurrency={formatCurrency} />
                  }
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Model usage list (alternative to pie chart)
 */
interface ModelUsageListProps {
  data: UsageByModel[];
  isLoading?: boolean;
  className?: string;
}

export function ModelUsageList({
  data,
  isLoading = false,
  className,
}: ModelUsageListProps) {
  const { formatCurrency } = useSettingsStore();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Model Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((model) => (
          <div key={model.model} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: model.color }}
                />
                <span className="text-sm font-medium">
                  {model.modelDisplayName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {model.requestCount} requests
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(model.cost.totalCost)}
                </span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${model.percentage}%`,
                  backgroundColor: model.color,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Input: {(model.tokens.inputTokens / 1000).toFixed(1)}K
              </span>
              <span>
                Output: {(model.tokens.outputTokens / 1000).toFixed(1)}K
              </span>
              <span>{model.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
