/**
 * Zustand store for user settings
 * Handles plan selection, currency, timezone, and display preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type PlanType,
  type CurrencyCode,
  type UserSettings,
  type NotificationSettings,
  type DisplaySettings,
  PLAN_CONFIGS,
  CURRENCY_CONFIGS,
} from '@/types';

// ============================================================================
// Store State Interface
// ============================================================================

interface SettingsState extends UserSettings {
  // Actions for plan
  setPlan: (plan: PlanType) => void;

  // Actions for currency
  setCurrency: (currency: CurrencyCode) => void;

  // Actions for timezone
  setTimezone: (timezone: string) => void;

  // Actions for theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Actions for notifications
  setNotifications: (notifications: Partial<NotificationSettings>) => void;
  toggleUsageLimitWarning: () => void;
  toggleSessionExpiry: () => void;
  toggleDailySummary: () => void;
  setWarningThreshold: (threshold: number) => void;

  // Actions for display
  setDisplay: (display: Partial<DisplaySettings>) => void;
  toggleCompactMode: () => void;
  toggleShowCosts: () => void;
  toggleShowCharts: () => void;
  setRefreshInterval: (interval: number) => void;

  // Utility actions
  reset: () => void;

  // Computed values
  getPlanConfig: () => typeof PLAN_CONFIGS[PlanType];
  getCurrencyConfig: () => typeof CURRENCY_CONFIGS[CurrencyCode];
  formatCurrency: (amountUSD: number) => string;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultNotifications: NotificationSettings = {
  usageLimitWarning: true,
  sessionExpiry: true,
  dailySummary: false,
  warningThreshold: 80,
};

const defaultDisplay: DisplaySettings = {
  compactMode: false,
  showCosts: true,
  showCharts: true,
  refreshInterval: 30,
};

const defaultSettings: UserSettings = {
  plan: 'pro',
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  theme: 'system',
  notifications: defaultNotifications,
  display: defaultDisplay,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultSettings,

      // Plan actions
      setPlan: (plan: PlanType) => {
        if (!PLAN_CONFIGS[plan]) {
          console.error(`Invalid plan: ${plan}`);
          return;
        }
        set({ plan });
      },

      // Currency actions
      setCurrency: (currency: CurrencyCode) => {
        if (!CURRENCY_CONFIGS[currency]) {
          console.error(`Invalid currency: ${currency}`);
          return;
        }
        set({ currency });
      },

      // Timezone actions
      setTimezone: (timezone: string) => {
        try {
          // Validate timezone
          Intl.DateTimeFormat(undefined, { timeZone: timezone });
          set({ timezone });
        } catch {
          console.error(`Invalid timezone: ${timezone}`);
        }
      },

      // Theme actions
      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });
      },

      // Notification actions
      setNotifications: (notifications: Partial<NotificationSettings>) => {
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        }));
      },

      toggleUsageLimitWarning: () => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            usageLimitWarning: !state.notifications.usageLimitWarning,
          },
        }));
      },

      toggleSessionExpiry: () => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            sessionExpiry: !state.notifications.sessionExpiry,
          },
        }));
      },

      toggleDailySummary: () => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            dailySummary: !state.notifications.dailySummary,
          },
        }));
      },

      setWarningThreshold: (threshold: number) => {
        if (threshold < 0 || threshold > 100) {
          console.error(`Invalid threshold: ${threshold}. Must be between 0 and 100.`);
          return;
        }
        set((state) => ({
          notifications: {
            ...state.notifications,
            warningThreshold: threshold,
          },
        }));
      },

      // Display actions
      setDisplay: (display: Partial<DisplaySettings>) => {
        set((state) => ({
          display: { ...state.display, ...display },
        }));
      },

      toggleCompactMode: () => {
        set((state) => ({
          display: {
            ...state.display,
            compactMode: !state.display.compactMode,
          },
        }));
      },

      toggleShowCosts: () => {
        set((state) => ({
          display: {
            ...state.display,
            showCosts: !state.display.showCosts,
          },
        }));
      },

      toggleShowCharts: () => {
        set((state) => ({
          display: {
            ...state.display,
            showCharts: !state.display.showCharts,
          },
        }));
      },

      setRefreshInterval: (interval: number) => {
        if (interval < 5 || interval > 300) {
          console.error(`Invalid interval: ${interval}. Must be between 5 and 300 seconds.`);
          return;
        }
        set((state) => ({
          display: {
            ...state.display,
            refreshInterval: interval,
          },
        }));
      },

      // Reset to defaults
      reset: () => {
        set(defaultSettings);
      },

      // Computed values
      getPlanConfig: () => {
        const { plan } = get();
        return PLAN_CONFIGS[plan];
      },

      getCurrencyConfig: () => {
        const { currency } = get();
        return CURRENCY_CONFIGS[currency];
      },

      formatCurrency: (amountUSD: number) => {
        const { currency } = get();
        const config = CURRENCY_CONFIGS[currency];
        const convertedAmount = amountUSD * config.exchangeRate;

        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: config.code,
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }).format(convertedAmount);
      },
    }),
    {
      name: 'claude-usage-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        plan: state.plan,
        currency: state.currency,
        timezone: state.timezone,
        theme: state.theme,
        notifications: state.notifications,
        display: state.display,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select only the plan from the store
 */
export const usePlan = () => useSettingsStore((state) => state.plan);

/**
 * Select only the currency from the store
 */
export const useCurrency = () => useSettingsStore((state) => state.currency);

/**
 * Select only the theme from the store
 */
export const useTheme = () => useSettingsStore((state) => state.theme);

/**
 * Select display settings from the store
 */
export const useDisplaySettings = () => useSettingsStore((state) => state.display);

/**
 * Select notification settings from the store
 */
export const useNotificationSettings = () => useSettingsStore((state) => state.notifications);

/**
 * Get the format currency function
 */
export const useFormatCurrency = () => useSettingsStore((state) => state.formatCurrency);
