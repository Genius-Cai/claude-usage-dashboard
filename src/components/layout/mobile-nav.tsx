'use client';

/**
 * Mobile Navigation Component
 * Bottom navigation bar for mobile devices with page routing
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Clock,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { id: 'statistics', label: 'Statistics', href: '/statistics', icon: BarChart3 },
  { id: 'sessions', label: 'Sessions', href: '/sessions', icon: Clock },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

interface MobileNavProps {
  className?: string;
}

/**
 * Mobile bottom navigation with page routing
 */
export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden safe-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMobileNavIndicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Mobile navigation with sheet/drawer
 */
interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export function MobileMenuSheet({
  open,
  onOpenChange,
  children,
}: MobileMenuSheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-background shadow-xl"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Claude Usage</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </motion.div>
    </>
  );
}

/**
 * Mobile navigation menu content for sheet
 */
export function MobileNavMenuContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Floating action button for quick actions
 */
interface FloatingActionButtonProps {
  icon: React.ElementType;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function FloatingActionButton({
  icon: Icon,
  onClick,
  label,
  className,
}: FloatingActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-40 flex items-center justify-center',
        'h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg',
        'md:hidden',
        className
      )}
    >
      <Icon className="h-6 w-6" />
      {label && <span className="sr-only">{label}</span>}
    </motion.button>
  );
}

/**
 * Tab bar for mobile sections
 */
interface TabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ElementType;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onTabChange, className }: TabBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 bg-muted rounded-lg overflow-x-auto',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pull-to-refresh indicator
 */
interface PullToRefreshProps {
  isRefreshing: boolean;
  progress?: number;
  className?: string;
}

export function PullToRefreshIndicator({
  isRefreshing,
  progress = 0,
  className,
}: PullToRefreshProps) {
  if (!isRefreshing && progress === 0) return null;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-0 flex items-center justify-center py-4',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'h-8 w-8 rounded-full border-2 border-primary',
          isRefreshing && 'animate-spin border-t-transparent'
        )}
        style={{
          transform: !isRefreshing ? `rotate(${progress * 360}deg)` : undefined,
        }}
      />
    </div>
  );
}

/**
 * Export nav items for reuse
 */
export { navItems };
