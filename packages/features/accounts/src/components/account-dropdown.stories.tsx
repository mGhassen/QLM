import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { JwtPayload } from '@supabase/supabase-js';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { AccountDropdown } from './account-dropdown';

const enCommon = {
  signedInAs: 'Signed in as',
  theme: 'Theme',
};

const enAuth = {
  signOut: 'Sign out',
};

const storybookI18n = i18next.createInstance();

storybookI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
    },
  },
  react: { useSuspense: false },
} as Parameters<typeof storybookI18n.init>[0]);

const meta: Meta<typeof AccountDropdown> = {
  title: 'Features/Accounts/Account menu',
  component: AccountDropdown,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <I18nextProvider i18n={storybookI18n as unknown as never}>
        <div className="bg-background flex w-full justify-start p-8">
          <Story />
        </div>
      </I18nextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AccountDropdown>;

const user = {
  // Intentionally empty so `usePersonalAccountData` is disabled in Storybook.
  id: '',
  email: 'aziz@qlm.dev',
  phone: null,
  aal: 'aal2',
  app_metadata: { role: 'super-admin' },
} as unknown as JwtPayload;

export const Default: Story = {
  args: {
    user,
    account: {
      id: 'acc-1',
      name: 'Mohamed Aziz',
      picture_url: 'https://i.pravatar.cc/96?img=12',
    },
    signOutRequested: () => {},
    showProfileName: true,
  },
};

export const MinimalTrigger: Story = {
  args: {
    ...Default.args,
    showProfileName: false,
  },
};
