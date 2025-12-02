'use client';

/**
 * Statistics Page
 * Historical statistics with date range picker, sortable table, and export functionality
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Zap,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UsageTrendChart } from '@/components/charts/usage-trend';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { useUsageByPeriod, useUsageStats } from '@/hooks/use-usage-data';
import { useSettingsStore } from '@/stores/settings-store';
import type { UsageByPeriod } from '@/types';
import { cn } from '@/lib/utils';

type DateRange = '7D' | '30D' | '90D' | 'ALL';
type SortField = 'period' | 'tokens' | 'cost' | 'requests';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Format number with suffix (K, M, B)
 */
function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * Get date range boundaries
 */
function getDateRange(range: DateRange): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '7D':
      start.setDate(end.getDate() - 7);
      break;
    case '30D':
      start.setDate(end.getDate() - 30);
      break;
    case '90D':
      start.setDate(end.getDate() - 90);
      break;
    case 'ALL':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Export data to CSV
 */
function exportToCSV(data: UsageByPeriod[], formatCurrency: (amount: number) => string) {
  const headers = ['Date', 'Total Tokens', 'Input Tokens', 'Output Tokens', 'Cache Tokens', 'Requests', 'Cost (USD)'];
  const rows = data.map((row) => [
    row.period,
    row.tokens.totalTokens || (row.tokens.inputTokens + row.tokens.outputTokens),
    row.tokens.inputTokens,
    row.tokens.outputTokens,
    row.tokens.cacheReadInputTokens,
    row.requestCount,
    row.cost.totalCost.toFixed(4),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `claude-usage-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Sortable table header
 */
function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortConfig;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort.field === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-left font-medium transition-colors hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {label}
      {isActive ? (
        currentSort.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}

/**
 * Loading skeleton for statistics page
 */
function StatisticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[350px]" />
      <Skeleton className="h-[400px]" />
    </div>
  );
}

/**
 * Statistics Page Component
 */
export default function StatisticsPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>('30D');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    field: 'period',
    direction: 'desc',
  });

  const { formatCurrency } = useSettingsStore();
  const dateRangeBounds = React.useMemo(() => getDateRange(dateRange), [dateRange]);

  // Fetch data based on date range
  const { data: usageData = [], isLoading } = useUsageByPeriod({
    groupBy: 'day',
    startDate: dateRangeBounds.start,
    endDate: dateRangeBounds.end,
  });

  const { data: periodStats } = useUsageStats({
    period: dateRange === '7D' ? 'week' : 'month',
  });

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (!usageData.length) return null;

    const totalCost = usageData.reduce((sum, day) => sum + day.cost.totalCost, 0);
    const totalTokens = usageData.reduce(
      (sum, day) => sum + (day.tokens.totalTokens || day.tokens.inputTokens + day.tokens.outputTokens),
      0
    );
    const totalRequests = usageData.reduce((sum, day) => sum + day.requestCount, 0);
    const avgCostPerDay = totalCost / usageData.length;

    return {
      totalCost,
      totalTokens,
      totalRequests,
      avgCostPerDay,
      daysCount: usageData.length,
    };
  }, [usageData]);

  // Sort data
  const sortedData = React.useMemo(() => {
    const sorted = [...usageData].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortConfig.field) {
        case 'period':
          return sortConfig.direction === 'asc'
            ? a.period.localeCompare(b.period)
            : b.period.localeCompare(a.period);
        case 'tokens':
          aValue = a.tokens.totalTokens || a.tokens.inputTokens + a.tokens.outputTokens;
          bValue = b.tokens.totalTokens || b.tokens.inputTokens + b.tokens.outputTokens;
          break;
        case 'cost':
          aValue = a.cost.totalCost;
          bValue = b.cost.totalCost;
          break;
        case 'requests':
          aValue = a.requestCount;
          bValue = b.requestCount;
          break;
        default:
          return 0;
      }

      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [usageData, sortConfig]);

  // Handle sort
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground">
            Historical usage data and trends
          </p>
        </div>
        <StatisticsSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
            <p className="text-muted-foreground">
              Historical usage data and trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date Range Tabs */}
            <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <TabsList>
                <TabsTrigger value="7D">7D</TabsTrigger>
                <TabsTrigger value="30D">30D</TabsTrigger>
                <TabsTrigger value="90D">90D</TabsTrigger>
                <TabsTrigger value="ALL">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(usageData, formatCurrency)}
              disabled={!usageData.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Summary Stats */}
        {summaryStats && (
          <motion.div variants={itemVariants}>
            <StatsGrid columns={4}>
              <StatsCard
                title="Total Cost"
                value={formatCurrency(summaryStats.totalCost)}
                icon={DollarSign}
                subtitle={`${summaryStats.daysCount} days`}
              />
              <StatsCard
                title="Total Tokens"
                value={summaryStats.totalTokens}
                icon={Zap}
              />
              <StatsCard
                title="Total Requests"
                value={summaryStats.totalRequests}
                icon={Activity}
              />
              <StatsCard
                title="Avg Cost/Day"
                value={formatCurrency(summaryStats.avgCostPerDay)}
                icon={TrendingUp}
              />
            </StatsGrid>
          </motion.div>
        )}

        {/* Usage Trend Chart */}
        <motion.div variants={itemVariants}>
          <UsageTrendChart
            data={usageData}
            title={`Usage Trend (${dateRange})`}
            showControls
          />
        </motion.div>

        {/* Daily Usage Table */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Daily Usage</CardTitle>
                  <CardDescription>
                    Detailed breakdown by day - click headers to sort
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {usageData.length} days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 pr-4 text-left">
                        <SortableHeader
                          label="Date"
                          field="period"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="pb-3 px-4 text-right">
                        <SortableHeader
                          label="Tokens"
                          field="tokens"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="pb-3 px-4 text-right hidden sm:table-cell">
                        Input
                      </th>
                      <th className="pb-3 px-4 text-right hidden sm:table-cell">
                        Output
                      </th>
                      <th className="pb-3 px-4 text-right">
                        <SortableHeader
                          label="Requests"
                          field="requests"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="pb-3 pl-4 text-right">
                        <SortableHeader
                          label="Cost"
                          field="cost"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, index) => {
                      const totalTokens = row.tokens.totalTokens || row.tokens.inputTokens + row.tokens.outputTokens;

                      return (
                        <motion.tr
                          key={row.period}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 pr-4 font-medium">
                            {new Date(row.period).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {formatNumber(totalTokens)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground hidden sm:table-cell">
                            {formatNumber(row.tokens.inputTokens)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-muted-foreground hidden sm:table-cell">
                            {formatNumber(row.tokens.outputTokens)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {row.requestCount}
                          </td>
                          <td className="py-3 pl-4 text-right font-medium">
                            {formatCurrency(row.cost.totalCost)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  {/* Footer with totals */}
                  {summaryStats && (
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="pt-3 pr-4">Total</td>
                        <td className="pt-3 px-4 text-right font-mono">
                          {formatNumber(summaryStats.totalTokens)}
                        </td>
                        <td className="pt-3 px-4 text-right hidden sm:table-cell">-</td>
                        <td className="pt-3 px-4 text-right hidden sm:table-cell">-</td>
                        <td className="pt-3 px-4 text-right">
                          {summaryStats.totalRequests}
                        </td>
                        <td className="pt-3 pl-4 text-right">
                          {formatCurrency(summaryStats.totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {usageData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-4 opacity-50" />
                  <p>No usage data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
