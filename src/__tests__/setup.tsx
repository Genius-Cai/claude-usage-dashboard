import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Import React before mocking
import React from 'react';

// Mock framer-motion with minimal implementation - DO NOT import actual module
// Importing the real framer-motion causes massive memory usage
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
      return React.createElement('div', rest, children);
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
      return React.createElement('span', rest, children);
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  useInView: () => true,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useMotionValue: (initial: number) => ({ get: () => initial, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
}));

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
// Do NOT use setTimeout in constructor - it prevents vitest from exiting cleanly
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

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

// Mock requestAnimationFrame - DO NOT execute callbacks to prevent infinite loops
// Since we mock framer-motion, we don't need actual animation frames
// Executing callbacks causes memory leaks in CI due to recursive animation loops
let rafId = 0;
global.requestAnimationFrame = vi.fn(() => {
  rafId++;
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
