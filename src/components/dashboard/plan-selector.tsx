'use client';

/**
 * Plan Selector Component
 * Dropdown for selecting subscription plan
 */

import * as React from 'react';
import { Check, Sparkles, Crown, Zap, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settings-store';
import { PLAN_CONFIGS, type PlanType } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Map of plan types to their icons
 */
const PLAN_ICONS: Record<PlanType, LucideIcon> = {
  free: Sparkles,
  pro: Zap,
  max_5x: Crown,
  max_20x: Crown,
};

/**
 * Get badge variant for plan type
 */
function getPlanBadgeVariant(plan: PlanType): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (plan) {
    case 'free':
      return 'secondary';
    case 'pro':
      return 'default';
    case 'max_5x':
    case 'max_20x':
      return 'default';
    default:
      return 'secondary';
  }
}

interface PlanSelectorProps {
  className?: string;
  showPrice?: boolean;
  compact?: boolean;
}

/**
 * Plan selector dropdown
 */
export function PlanSelector({
  className,
  showPrice = true,
  compact = false,
}: PlanSelectorProps) {
  const { plan, setPlan } = useSettingsStore();
  const currentPlan = PLAN_CONFIGS[plan];
  const CurrentPlanIcon = PLAN_ICONS[plan];

  return (
    <Select value={plan} onValueChange={(value) => setPlan(value as PlanType)}>
      <SelectTrigger
        className={cn(
          'w-full',
          compact ? 'h-8 text-sm' : 'h-10',
          className
        )}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            <CurrentPlanIcon className="h-4 w-4" />
            <span>{currentPlan.displayName}</span>
            {showPrice && !compact && currentPlan.monthlyPrice > 0 && (
              <span className="text-xs text-muted-foreground">
                ${currentPlan.monthlyPrice}/mo
              </span>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(PLAN_CONFIGS).map((planConfig) => {
          const ItemIcon = PLAN_ICONS[planConfig.id];
          const isSelected = planConfig.id === plan;

          return (
            <SelectItem
              key={planConfig.id}
              value={planConfig.id}
              className="py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ItemIcon
                    className={cn(
                      'h-4 w-4',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span className="font-medium">{planConfig.displayName}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                {showPrice && (
                  <span className="text-sm text-muted-foreground">
                    {planConfig.monthlyPrice === 0
                      ? 'Free'
                      : `$${planConfig.monthlyPrice}/mo`}
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Plan badge display
 */
interface PlanBadgeProps {
  plan?: PlanType;
  className?: string;
  showIcon?: boolean;
}

export function PlanBadge({ plan: planProp, className, showIcon = true }: PlanBadgeProps) {
  const { plan: storePlan } = useSettingsStore();
  const plan = planProp || storePlan;
  const planConfig = PLAN_CONFIGS[plan];
  const BadgeIcon = PLAN_ICONS[plan];
  const variant = getPlanBadgeVariant(plan);

  return (
    <Badge
      variant={variant}
      className={cn(
        'gap-1',
        plan === 'max_5x' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        plan === 'max_20x' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        className
      )}
    >
      {showIcon && <BadgeIcon className="h-3 w-3" />}
      {planConfig.displayName}
    </Badge>
  );
}

/**
 * Plan comparison card
 */
interface PlanCardProps {
  plan: PlanType;
  isSelected?: boolean;
  onSelect?: (plan: PlanType) => void;
  className?: string;
}

export function PlanCard({ plan, isSelected, onSelect, className }: PlanCardProps) {
  const planConfig = PLAN_CONFIGS[plan];
  const CardIcon = PLAN_ICONS[plan];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative cursor-pointer rounded-lg border-2 p-4 transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
        className
      )}
      onClick={() => onSelect?.(plan)}
    >
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-2 top-2"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            plan === 'free' && 'bg-gray-100 dark:bg-gray-800',
            plan === 'pro' && 'bg-blue-100 dark:bg-blue-900/30',
            plan === 'max_5x' && 'bg-purple-100 dark:bg-purple-900/30',
            plan === 'max_20x' && 'bg-amber-100 dark:bg-amber-900/30'
          )}
        >
          <CardIcon
            className={cn(
              'h-5 w-5',
              plan === 'free' && 'text-gray-600 dark:text-gray-400',
              plan === 'pro' && 'text-blue-600 dark:text-blue-400',
              plan === 'max_5x' && 'text-purple-600 dark:text-purple-400',
              plan === 'max_20x' && 'text-amber-600 dark:text-amber-400'
            )}
          />
        </div>
        <div>
          <h3 className="font-semibold">{planConfig.displayName}</h3>
          <p className="text-sm text-muted-foreground">
            {planConfig.monthlyPrice === 0
              ? 'Free forever'
              : `$${planConfig.monthlyPrice}/month`}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {(planConfig.tokenLimit / 1_000_000).toFixed(0)}M
          </span>{' '}
          tokens/month
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {planConfig.requestsPerMinute}
          </span>{' '}
          requests/min
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {planConfig.features.slice(0, 2).map((feature, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {feature}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Plan selector grid for settings
 */
interface PlanSelectorGridProps {
  className?: string;
}

export function PlanSelectorGrid({ className }: PlanSelectorGridProps) {
  const { plan, setPlan } = useSettingsStore();

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Object.values(PLAN_CONFIGS).map((planConfig) => (
        <PlanCard
          key={planConfig.id}
          plan={planConfig.id}
          isSelected={planConfig.id === plan}
          onSelect={setPlan}
        />
      ))}
    </div>
  );
}
