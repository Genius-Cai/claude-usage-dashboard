'use client';

/**
 * AnimatedNumber Component
 * Provides smooth count-up animations for numbers
 */

import * as React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (value: number) => string;
}

/**
 * Animated number with smooth count-up effect
 */
export function AnimatedNumber({
  value,
  duration = 0.8,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  formatFn,
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    mass: 1,
    stiffness: 75,
    damping: 15,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    if (formatFn) {
      return formatFn(current);
    }
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={cn('tabular-nums', className)}>
      {display}
    </motion.span>
  );
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Animated compact number (with K, M, B formatting)
 */
export function AnimatedCompactNumber({
  value,
  className,
  ...props
}: Omit<AnimatedNumberProps, 'formatFn'>) {
  return (
    <AnimatedNumber
      value={value}
      formatFn={formatCompactNumber}
      className={className}
      {...props}
    />
  );
}

/**
 * Animated percentage with color based on thresholds
 */
export function AnimatedPercentage({
  value,
  className,
  colorByValue = false,
}: {
  value: number;
  className?: string;
  colorByValue?: boolean;
}) {
  const colorClass = React.useMemo(() => {
    if (!colorByValue) return '';
    if (value >= 100) return 'text-violet-600 dark:text-violet-400';
    if (value >= 80) return 'text-rose-600 dark:text-rose-400';
    if (value >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-sky-600 dark:text-sky-400';
  }, [value, colorByValue]);

  return (
    <AnimatedNumber
      value={value}
      decimals={1}
      suffix="%"
      className={cn(colorClass, className)}
    />
  );
}

/**
 * Animated currency display
 */
export function AnimatedCurrency({
  value,
  currency = 'USD',
  className,
}: {
  value: number;
  currency?: 'USD' | 'CNY';
  className?: string;
}) {
  const prefix = currency === 'USD' ? '$' : '¥';
  const decimals = value < 10 ? 4 : value < 100 ? 2 : 0;

  return (
    <AnimatedNumber
      value={value}
      prefix={prefix}
      decimals={decimals}
      className={className}
    />
  );
}
