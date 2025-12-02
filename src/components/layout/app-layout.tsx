'use client';

/**
 * App Layout Component
 * Main layout wrapper with sidebar for desktop and mobile navigation
 */

import * as React from 'react';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout with responsive navigation
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
