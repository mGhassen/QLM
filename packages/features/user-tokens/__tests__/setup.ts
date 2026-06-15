import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Repo convention is `data-test`, not the testing-library default
// `data-testid`. Align here so components stay consistent with the rest
// of the codebase.
configure({ testIdAttribute: 'data-test' });

// jsdom doesn't ship `ResizeObserver` — Radix UI components reach for it
// on mount and crash without a polyfill.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
