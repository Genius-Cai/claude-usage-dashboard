'use client';

/**
 * Combined providers component
 * Wraps all application providers in a single component
 */

import * as React from 'react';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Application providers wrapper
 * Combines all providers in the correct order
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryProvider>
  );
}

export { ThemeProvider } from './theme-provider';
export { QueryProvider } from './query-provider';
