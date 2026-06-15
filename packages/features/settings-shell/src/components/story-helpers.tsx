import * as React from 'react';

import type { Decorator } from '@storybook/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

const settingsEn = {
  menu: { label: 'Settings' },
  dialog: {
    title: 'Settings',
    close: 'Close settings',
    discardGuard: 'Discard unsaved changes?',
  },
  nav: { personalTokens: 'Personal tokens' },
};

export const storybookI18n = i18next.createInstance();

storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['settings'],
  defaultNS: 'settings',
  interpolation: { escapeValue: false },
  resources: { en: { settings: settingsEn } },
} as Parameters<typeof storybookI18n.init>[0]);

export const withSettingsShellProviders: Decorator = (
  Story: React.ComponentType,
) => (
  <I18nextProvider i18n={storybookI18n}>
    <Story />
  </I18nextProvider>
);
