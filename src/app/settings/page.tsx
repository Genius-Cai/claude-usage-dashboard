'use client';

/**
 * Settings Page
 * User preferences for plan, currency, timezone, theme, and display options
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  CreditCard,
  Globe,
  Clock,
  Palette,
  Bell,
  RefreshCw,
  Info,
  Sun,
  Moon,
  Monitor,
  Check,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlanCard } from '@/components/dashboard/plan-selector';
import { useSettingsStore } from '@/stores/settings-store';
import {
  PLAN_CONFIGS,
  CURRENCY_CONFIGS,
  type PlanType,
  type CurrencyCode,
} from '@/types';
import { cn } from '@/lib/utils';

/**
 * Common timezones list
 */
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Seoul', label: 'Seoul' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
  { value: 'UTC', label: 'UTC' },
];

/**
 * Refresh interval options
 */
const REFRESH_INTERVALS = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
];

/**
 * Reset hour options (0-23)
 */
const RESET_HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

/**
 * Theme option component
 */
function ThemeOption({
  value,
  label,
  icon: Icon,
  currentTheme,
  onSelect,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  currentTheme: string | undefined;
  onSelect: (theme: string) => void;
}) {
  const isSelected = currentTheme === value;

  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <span className={cn('text-sm font-medium', isSelected && 'text-primary')}>
        {label}
      </span>
      {isSelected && (
        <Badge variant="default" className="gap-1">
          <Check className="h-3 w-3" />
          Active
        </Badge>
      )}
    </button>
  );
}

/**
 * Settings section wrapper
 */
function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Settings Page Component
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  const {
    plan,
    setPlan,
    currency,
    setCurrency,
    timezone,
    setTimezone,
    notifications,
    toggleUsageLimitWarning,
    toggleSessionExpiry,
    toggleDailySummary,
    setWarningThreshold,
    display,
    toggleCompactMode,
    toggleShowCosts,
    toggleShowCharts,
    setRefreshInterval,
    reset,
  } = useSettingsStore();

  // Ensure theme is mounted before rendering
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // State for custom exchange rate
  const [customExchangeRate, setCustomExchangeRate] = React.useState(
    CURRENCY_CONFIGS[currency].exchangeRate.toString()
  );

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

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 max-w-4xl"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Customize your dashboard preferences
          </p>
        </motion.div>

        {/* Plan Selection */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="Plan"
            description="Select your Claude subscription plan to track usage limits correctly"
            icon={CreditCard}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.values(PLAN_CONFIGS).map((planConfig) => (
                <PlanCard
                  key={planConfig.id}
                  plan={planConfig.id}
                  isSelected={planConfig.id === plan}
                  onSelect={setPlan}
                />
              ))}
            </div>

            {/* Custom plan info */}
            {plan === 'max_20x' && (
              <div className="mt-4 p-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Max 20x Plan</p>
                    <p className="text-sm mt-1">
                      This is the highest tier plan with 20x the usage limits.
                      Contact Anthropic for enterprise options.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SettingsSection>
        </motion.div>

        {/* Currency Settings */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="Currency"
            description="Set your preferred currency for cost display"
            icon={DollarSign}
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={(value) => setCurrency(value as CurrencyCode)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CURRENCY_CONFIGS).map((config) => (
                        <SelectItem key={config.code} value={config.code}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono">{config.symbol}</span>
                            <span>{config.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currency !== 'USD' && (
                  <div className="space-y-2">
                    <Label htmlFor="exchangeRate">Exchange Rate (1 USD =)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="exchangeRate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={customExchangeRate}
                        onChange={(e) => setCustomExchangeRate(e.target.value)}
                        className="font-mono"
                      />
                      <span className="text-sm text-muted-foreground">
                        {CURRENCY_CONFIGS[currency].symbol}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current rate: {CURRENCY_CONFIGS[currency].exchangeRate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* Timezone Settings */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="Timezone"
            description="Set your timezone for accurate date/time display"
            icon={Globe}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Time</Label>
                <div className="flex items-center h-10 text-sm text-muted-foreground">
                  {mounted && new Date().toLocaleString('en-US', { timeZone: timezone })}
                </div>
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* Theme Settings */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="Theme"
            description="Choose your preferred color scheme"
            icon={Palette}
          >
            {mounted && (
              <div className="grid grid-cols-3 gap-4">
                <ThemeOption
                  value="light"
                  label="Light"
                  icon={Sun}
                  currentTheme={theme}
                  onSelect={setTheme}
                />
                <ThemeOption
                  value="dark"
                  label="Dark"
                  icon={Moon}
                  currentTheme={theme}
                  onSelect={setTheme}
                />
                <ThemeOption
                  value="system"
                  label="System"
                  icon={Monitor}
                  currentTheme={theme}
                  onSelect={setTheme}
                />
              </div>
            )}
          </SettingsSection>
        </motion.div>

        {/* Display Settings */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="Display"
            description="Customize how data is displayed"
            icon={Settings}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a more condensed layout
                  </p>
                </div>
                <Switch
                  checked={display.compactMode}
                  onCheckedChange={toggleCompactMode}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Costs</Label>
                  <p className="text-sm text-muted-foreground">
                    Display cost information on cards
                  </p>
                </div>
                <Switch
                  checked={display.showCosts}
                  onCheckedChange={toggleShowCosts}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Charts</Label>
                  <p className="text-sm text-muted-foreground">
                    Display usage charts and graphs
                  </p>
                </div>
                <Switch
                  checked={display.showCharts}
                  onCheckedChange={toggleShowCharts}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="refreshInterval">Data Refresh Interval</Label>
                <Select
                  value={display.refreshInterval.toString()}
                  onValueChange={(value) => setRefreshInterval(parseInt(value))}
                >
                  <SelectTrigger id="refreshInterval" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_INTERVALS.map((interval) => (
                      <SelectItem
                        key={interval.value}
                        value={interval.value.toString()}
                      >
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often to automatically refresh dashboard data
                </p>
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* Notifications Settings */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="Notifications"
            description="Configure usage alerts and notifications"
            icon={Bell}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Usage Limit Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when approaching usage limits
                  </p>
                </div>
                <Switch
                  checked={notifications.usageLimitWarning}
                  onCheckedChange={toggleUsageLimitWarning}
                />
              </div>

              {notifications.usageLimitWarning && (
                <div className="ml-0 space-y-2">
                  <Label htmlFor="warningThreshold">Warning Threshold</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="warningThreshold"
                      type="number"
                      min={50}
                      max={99}
                      value={notifications.warningThreshold}
                      onChange={(e) =>
                        setWarningThreshold(parseInt(e.target.value) || 80)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      % of limit
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Expiry Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when session is about to expire
                  </p>
                </div>
                <Switch
                  checked={notifications.sessionExpiry}
                  onCheckedChange={toggleSessionExpiry}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily usage summary
                  </p>
                </div>
                <Switch
                  checked={notifications.dailySummary}
                  onCheckedChange={toggleDailySummary}
                />
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* About Section */}
        <motion.div variants={itemVariants}>
          <SettingsSection
            title="About"
            description="Application information and credits"
            icon={Info}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="secondary">1.0.0</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Last Updated
                </span>
                <span className="text-sm">December 2024</span>
              </div>

              <Separator />

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Links</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://www.anthropic.com/claude"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Claude
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://docs.anthropic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      API Docs
                    </a>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="text-destructive hover:text-destructive"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset All Settings
                </Button>
              </div>
            </div>
          </SettingsSection>
        </motion.div>
      </motion.div>
    </div>
  );
}
