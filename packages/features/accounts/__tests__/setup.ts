import '@testing-library/jest-dom';
import React from 'react';
import { afterEach, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  Trans: ({
    i18nKey,
    defaults,
    children,
  }: {
    i18nKey?: string;
    defaults?: string;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      React.Fragment,
      null,
      defaults ?? i18nKey ?? children ?? null,
    ),
  I18nextProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
}

afterEach(() => {
  vi.clearAllMocks();
});
