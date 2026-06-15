import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver, but several Radix-based primitives
// (and `input-otp`) consume it during mount. Provide a no-op polyfill.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as { ResizeObserver: unknown }).ResizeObserver =
    NoopResizeObserver;
}
