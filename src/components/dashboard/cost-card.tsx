'use client';

/**
 * Cost Card Component
 * Displays the main cost information with USD/CNY toggle
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsStore } from '@/stores/settings-store';
import { CURRENCY_CONFIGS, type CurrencyCode } from '@/types';
import { cn } from '@/lib/utils';

interface CostCardProps {
  totalCost: number;
  previousCost?: number;
  periodLabel?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Main cost display card with currency switching
 */
export function CostCard({
  totalCost,
  previousCost,
  periodLabel = 'Today',
  isLoading = false,
  className,
}: CostCardProps) {
  const { currency, setCurrency, formatCurrency } = useSettingsStore();
  const [isHovered, setIsHovered] = React.useState(false);

  // Calculate cost change
  const costChange = previousCost !== undefined ? totalCost - previousCost : 0;
  const costChangePercentage =
    previousCost !== undefined && previousCost > 0
      ? ((totalCost - previousCost) / previousCost) * 100
      : 0;
  const isPositiveChange = costChange > 0;

  // Convert cost to selected currency
  const convertedCost = totalCost * CURRENCY_CONFIGS[currency].exchangeRate;
  const currencySymbol = CURRENCY_CONFIGS[currency].symbol;

  // Toggle currency
  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'CNY' : 'USD');
  };

  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden h-full transition-all duration-300',
        isHovered && 'shadow-lg',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {periodLabel} Cost
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCurrency}
          className="h-8 gap-1 text-xs"
        >
          <DollarSign className="h-3 w-3" />
          {currency}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={currency}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-3xl font-bold tracking-tight">
              {currencySymbol}
              {convertedCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {currency === 'CNY' && (
              <span className="text-sm text-muted-foreground">
                ({formatCurrency(totalCost).replace(currencySymbol, '$')})
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {previousCost !== undefined && (
          <div className="flex items-center gap-2">
            <Badge
              variant={isPositiveChange ? 'destructive' : 'secondary'}
              className={cn(
                'gap-1',
                !isPositiveChange && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              )}
            >
              {isPositiveChange ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(costChangePercentage).toFixed(1)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isPositiveChange ? '+' : ''}
              {formatCurrency(costChange)} vs yesterday
            </span>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

/**
 * Compact cost display for headers or smaller spaces
 */
interface CompactCostDisplayProps {
  cost: number;
  className?: string;
}

export function CompactCostDisplay({ cost, className }: CompactCostDisplayProps) {
  const { currency, formatCurrency } = useSettingsStore();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{formatCurrency(cost)}</span>
      {currency === 'CNY' && (
        <span className="text-xs text-muted-foreground">CNY</span>
      )}
    </div>
  );
}

/**
 * Animated cost counter
 */
interface AnimatedCostProps {
  value: number;
  className?: string;
}

export function AnimatedCost({ value, className }: AnimatedCostProps) {
  const { formatCurrency } = useSettingsStore();
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    const duration = 500; // ms
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => prev + increment);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className={cn('tabular-nums', className)}>
      {formatCurrency(displayValue)}
    </span>
  );
}
