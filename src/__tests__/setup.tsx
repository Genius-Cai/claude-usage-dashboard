import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock framer-motion to skip animations in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        // Remove animation props and render as regular div
        const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
      span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return <span {...rest}>{children}</span>;
      },
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useInView: () => true, // Always return "in view" for tests
  };
});

// Import React for JSX in mock
import React from 'react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();  // Clear all mock call history
  vi.resetAllMocks();  // Reset mock implementations to defaults
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver as a proper class for framer-motion compatibility
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver as a proper class for framer-motion compatibility
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    // Immediately call callback with empty entries to simulate "in view"
    setTimeout(() => {
      callback([], this);
    }, 0);
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

// Mock requestAnimationFrame - use setTimeout to avoid infinite recursion
// The animation loop in components calls requestAnimationFrame recursively,
// so we use setTimeout(0) to break the sync call stack
let rafId = 0;
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  rafId++;
  // Use setTimeout to break synchronous recursion but still execute animations
  setTimeout(() => callback(performance.now()), 0);
  return rafId;
});

global.cancelAnimationFrame = vi.fn();

// Mock performance.now for animation timing
if (typeof performance === 'undefined' || !performance.now) {
  (global as unknown as { performance: { now: () => number } }).performance = {
    now: () => Date.now(),
  };
}

// Suppress console errors/warnings in tests (optional)
// vi.spyOn(console, 'error').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
