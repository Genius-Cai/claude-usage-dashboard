'use client';

/**
 * Usage Trend Chart Component
 * Line chart for displaying usage trends over time
 */

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UsageByPeriod } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

// Chart colors for light and dark modes
const CHART_COLORS = {
  light: {
    primary: '#8B5CF6',      // Purple
    stroke: '#7C3AED',
    fillOpacity: 0.4,
    gridColor: '#E5E7EB',
    textColor: '#6B7280',
  },
  dark: {
    primary: '#A78BFA',      // Lighter purple for dark mode
    stroke: '#8B5CF6',
    fillOpacity: 0.6,        // Higher opacity for visibility
    gridColor: '#374151',
    textColor: '#9CA3AF',
  },
};

interface UsageTrendChartProps {
  data: UsageByPeriod[];
  isLoading?: boolean;
  title?: string;
  className?: string;
  showControls?: boolean;
}

type MetricType = 'cost' | 'tokens' | 'requests';
type ChartType = 'line' | 'area';

/**
 * Format tick value for axis
 */
function formatAxisValue(value: number, type: MetricType): string {
  if (type === 'cost') {
    return `$${value.toFixed(2)}`;
  }
  if (type === 'tokens') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
  }
  return value.toString();
}

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
  label,
  metric,
  formatCurrency,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  metric: MetricType;
  formatCurrency: (amount: number) => string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="text-sm font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {metric === 'cost'
              ? formatCurrency(entry.value)
              : metric === 'tokens'
              ? `${(entry.value / 1000).toFixed(1)}K`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Usage trend line/area chart
 */
export function UsageTrendChart({
  data,
  isLoading = false,
  title = 'Usage Trend',
  className,
  showControls = true,
}: UsageTrendChartProps) {
  const { formatCurrency } = useSettingsStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [metric, setMetric] = React.useState<MetricType>('cost');
  const [chartType, setChartType] = React.useState<ChartType>('area');

  // Ensure we're mounted before accessing theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Get colors based on theme
  const colors = mounted && resolvedTheme === 'dark' ? CHART_COLORS.dark : CHART_COLORS.light;

  // Transform data based on selected metric
  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      period: item.period,
      value:
        metric === 'cost'
          ? item.cost.totalCost
          : metric === 'tokens'
          ? item.tokens.totalTokens || (item.tokens.inputTokens + item.tokens.outputTokens)
          : item.requestCount,
      inputTokens: item.tokens.inputTokens,
      outputTokens: item.tokens.outputTokens,
    }));
  }, [data, metric]);

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

  const Chart = chartType === 'area' ? AreaChart : LineChart;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {showControls && (
          <div className="flex items-center gap-2">
            <Tabs
              value={chartType}
              onValueChange={(v) => setChartType(v as ChartType)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="area" className="text-xs px-2">
                  Area
                </TabsTrigger>
                <TabsTrigger value="line" className="text-xs px-2">
                  Line
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={metric}
              onValueChange={(v) => setMetric(v as MetricType)}
            >
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="tokens">Tokens</SelectItem>
                <SelectItem value="requests">Requests</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={chartData}>
              <defs>
                <linearGradient id="colorValueLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.5} />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorValueDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.7} />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: colors.textColor }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.textColor }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatAxisValue(value, metric)}
                width={60}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    metric={metric}
                    formatCurrency={formatCurrency}
                  />
                }
              />
              {chartType === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="value"
                  name={
                    metric === 'cost'
                      ? 'Cost'
                      : metric === 'tokens'
                      ? 'Tokens'
                      : 'Requests'
                  }
                  stroke={colors.stroke}
                  strokeWidth={2.5}
                  fill={mounted && resolvedTheme === 'dark' ? 'url(#colorValueDark)' : 'url(#colorValueLight)'}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  name={
                    metric === 'cost'
                      ? 'Cost'
                      : metric === 'tokens'
                      ? 'Tokens'
                      : 'Requests'
                  }
                  stroke={colors.stroke}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: colors.primary }}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Comparison chart showing input vs output tokens
 */
interface TokenComparisonChartProps {
  data: UsageByPeriod[];
  isLoading?: boolean;
  className?: string;
}

export function TokenComparisonChart({
  data,
  isLoading = false,
  className,
}: TokenComparisonChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  const chartData = React.useMemo(() => {
    return data.map((item) => ({
      period: item.period,
      input: item.tokens.inputTokens,
      output: item.tokens.outputTokens,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Input vs Output Tokens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorInputLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorOutputLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorInputDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorOutputDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34D399" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.gridColor}
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fill: colors.textColor }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.textColor }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatAxisValue(value, 'tokens')}
                width={50}
              />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="input"
                name="Input Tokens"
                stroke={isDark ? '#60A5FA' : '#3B82F6'}
                strokeWidth={2.5}
                fill={isDark ? 'url(#colorInputDark)' : 'url(#colorInputLight)'}
              />
              <Area
                type="monotone"
                dataKey="output"
                name="Output Tokens"
                stroke={isDark ? '#34D399' : '#10B981'}
                strokeWidth={2.5}
                fill={isDark ? 'url(#colorOutputDark)' : 'url(#colorOutputLight)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
