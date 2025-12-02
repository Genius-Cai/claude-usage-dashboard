'use client';

/**
 * Token Breakdown Chart Component
 * Bar chart showing token breakdown by type
 */

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UsageByPeriod, TokenUsage } from '@/types';
import { cn } from '@/lib/utils';

interface TokenBreakdownChartProps {
  data: UsageByPeriod[];
  isLoading?: boolean;
  title?: string;
  className?: string;
}

type ViewMode = 'stacked' | 'grouped';

const TOKEN_COLORS = {
  input: '#3B82F6', // Blue
  output: '#10B981', // Green
  cacheCreation: '#F59E0B', // Amber
  cacheRead: '#8B5CF6', // Purple
};

/**
 * Format token count for display
 */
function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

/**
 * Custom tooltip for bar chart
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    fill: string;
    dataKey: string;
  }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[180px]">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-medium">{formatTokens(entry.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 pt-1 border-t">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-sm font-medium">{formatTokens(total)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Token breakdown bar chart
 */
export function TokenBreakdownChart({
  data,
  isLoading = false,
  title = 'Token Breakdown',
  className,
}: TokenBreakdownChartProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('stacked');

  // Transform data for chart
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      period: item.period,
      input: item.tokens.inputTokens,
      output: item.tokens.outputTokens,
      cacheCreation: item.tokens.cacheCreationInputTokens,
      cacheRead: item.tokens.cacheReadInputTokens,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="stacked" className="text-xs px-2">
              Stacked
            </TabsTrigger>
            <TabsTrigger value="grouped" className="text-xs px-2">
              Grouped
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={viewMode === 'grouped' ? 2 : 0}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatTokens}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '1rem' }}
                iconType="square"
                iconSize={12}
              />
              <Bar
                dataKey="input"
                name="Input Tokens"
                fill={TOKEN_COLORS.input}
                stackId={viewMode === 'stacked' ? 'a' : undefined}
                radius={viewMode === 'grouped' ? [4, 4, 0, 0] : undefined}
              />
              <Bar
                dataKey="output"
                name="Output Tokens"
                fill={TOKEN_COLORS.output}
                stackId={viewMode === 'stacked' ? 'a' : undefined}
                radius={viewMode === 'grouped' ? [4, 4, 0, 0] : undefined}
              />
              <Bar
                dataKey="cacheCreation"
                name="Cache Creation"
                fill={TOKEN_COLORS.cacheCreation}
                stackId={viewMode === 'stacked' ? 'a' : undefined}
                radius={viewMode === 'grouped' ? [4, 4, 0, 0] : undefined}
              />
              <Bar
                dataKey="cacheRead"
                name="Cache Read"
                fill={TOKEN_COLORS.cacheRead}
                stackId={viewMode === 'stacked' ? 'a' : undefined}
                radius={
                  viewMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Token summary cards
 */
interface TokenSummaryProps {
  tokens: TokenUsage;
  isLoading?: boolean;
  className?: string;
}

export function TokenSummary({
  tokens,
  isLoading = false,
  className,
}: TokenSummaryProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const total =
    tokens.inputTokens +
    tokens.outputTokens +
    tokens.cacheCreationInputTokens +
    tokens.cacheReadInputTokens;

  const items = [
    {
      label: 'Input Tokens',
      value: tokens.inputTokens,
      color: TOKEN_COLORS.input,
      percentage: total > 0 ? (tokens.inputTokens / total) * 100 : 0,
    },
    {
      label: 'Output Tokens',
      value: tokens.outputTokens,
      color: TOKEN_COLORS.output,
      percentage: total > 0 ? (tokens.outputTokens / total) * 100 : 0,
    },
    {
      label: 'Cache Creation',
      value: tokens.cacheCreationInputTokens,
      color: TOKEN_COLORS.cacheCreation,
      percentage: total > 0 ? (tokens.cacheCreationInputTokens / total) * 100 : 0,
    },
    {
      label: 'Cache Read',
      value: tokens.cacheReadInputTokens,
      color: TOKEN_COLORS.cacheRead,
      percentage: total > 0 ? (tokens.cacheReadInputTokens / total) * 100 : 0,
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
      {items.map((item) => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <div className="text-2xl font-bold">{formatTokens(item.value)}</div>
            <Badge variant="secondary" className="mt-2 text-xs">
              {item.percentage.toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Horizontal token breakdown bar
 */
interface TokenBarProps {
  tokens: TokenUsage;
  className?: string;
  showLabels?: boolean;
}

export function TokenBar({
  tokens,
  className,
  showLabels = true,
}: TokenBarProps) {
  const total =
    tokens.inputTokens +
    tokens.outputTokens +
    tokens.cacheCreationInputTokens +
    tokens.cacheReadInputTokens;

  if (total === 0) {
    return (
      <div className={cn('h-4 rounded-full bg-secondary', className)} />
    );
  }

  const segments = [
    {
      value: tokens.inputTokens,
      color: TOKEN_COLORS.input,
      label: 'Input',
    },
    {
      value: tokens.outputTokens,
      color: TOKEN_COLORS.output,
      label: 'Output',
    },
    {
      value: tokens.cacheCreationInputTokens,
      color: TOKEN_COLORS.cacheCreation,
      label: 'Cache Create',
    },
    {
      value: tokens.cacheReadInputTokens,
      color: TOKEN_COLORS.cacheRead,
      label: 'Cache Read',
    },
  ].filter((s) => s.value > 0);

  return (
    <div className={className}>
      <div className="flex h-4 overflow-hidden rounded-full">
        {segments.map((segment, index) => (
          <div
            key={segment.label}
            className="transition-all duration-500"
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${formatTokens(segment.value)}`}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-4 mt-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs text-muted-foreground">
                {segment.label}: {formatTokens(segment.value)} (
                {((segment.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
