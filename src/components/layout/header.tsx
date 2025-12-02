'use client';

/**
 * Header Component
 * Main header with theme toggle, plan selector, and navigation
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Moon,
  Sun,
  Menu,
  Settings,
  Bell,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlanSelector, PlanBadge } from '@/components/dashboard/plan-selector';
import { CompactSessionTimer } from '@/components/dashboard/session-timer';
import { CompactCostDisplay } from '@/components/dashboard/cost-card';
import type { CurrentSession, DashboardData } from '@/types';
import { cn } from '@/lib/utils';

interface HeaderProps {
  session?: CurrentSession | null;
  todayCost?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onMenuClick?: () => void;
  className?: string;
}

/**
 * Theme toggle button
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Settings className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Refresh button with loading state
 */
function RefreshButton({
  onRefresh,
  isRefreshing,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={onRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw
        className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
      />
      <span className="sr-only">Refresh data</span>
    </Button>
  );
}

/**
 * Main header component
 */
export function Header({
  session,
  todayCost = 0,
  onRefresh,
  isRefreshing = false,
  onMenuClick,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-semibold hidden sm:inline-block">
              Claude Usage
            </span>
          </div>

          {/* Plan badge - hidden on mobile */}
          <div className="hidden md:block">
            <PlanBadge />
          </div>
        </div>

        {/* Center section - Session timer (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-4">
          <CompactSessionTimer session={session ?? null} />
          <Separator orientation="vertical" className="h-6" />
          <CompactCostDisplay cost={todayCost} />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Plan selector - hidden on mobile */}
          <div className="hidden lg:block w-[140px]">
            <PlanSelector compact />
          </div>

          <RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} />
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Compact header for mobile
 */
interface CompactHeaderProps {
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function CompactHeader({
  title = 'Dashboard',
  onBack,
  actions,
  className,
}: CompactHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur',
        className
      )}
    >
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <span className="font-medium">{title}</span>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Sub-header with stats summary
 */
interface StatsHeaderProps {
  stats: {
    label: string;
    value: string | number;
    change?: number;
  }[];
  className?: string;
}

export function StatsHeader({ stats, className }: StatsHeaderProps) {
  return (
    <div
      className={cn(
        'border-b bg-muted/50 px-4 py-2',
        className
      )}
    >
      <div className="container flex items-center justify-between gap-4 overflow-x-auto">
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            {index > 0 && (
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
            )}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{stat.label}:</span>
              <span className="text-sm font-medium">{stat.value}</span>
              {stat.change !== undefined && (
                <Badge
                  variant={stat.change >= 0 ? 'destructive' : 'secondary'}
                  className={cn(
                    'text-xs',
                    stat.change < 0 && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  )}
                >
                  {stat.change >= 0 ? '+' : ''}
                  {stat.change.toFixed(1)}%
                </Badge>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
