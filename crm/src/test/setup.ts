import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';

// Start MSW mock server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock localStorage globally
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    length: 0,
    key: vi.fn(),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

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

// Mock window.ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console.error to avoid noise in tests (re-enable if debugging)
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress React prop-type warnings in tests
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
  originalConsoleError(...args);
};
