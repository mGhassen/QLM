/**
 * Shared helpers for user-tokens Storybook stories.
 *
 * Mirrors `packages/features/auth/src/components/story-helpers.tsx`:
 *  - inline English translations for the `tokens.*` and `settings.*`
 *    namespaces (mirrors `apps/web/src/lib/i18n/locales/en/{tokens,settings}.json`)
 *  - `withUserTokensProviders` decorator that wraps each story in
 *    `QueryClientProvider` + `I18nextProvider`.
 *
 * Subsequent tasks (010, 011) extend `tokensEn` / `settingsEn` here as new
 * keys land — keep this file the single i18n source for the storybook side.
 */
import * as React from 'react';

import type { Decorator } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';

const tokensEn = {
  page: {
    title: 'Your Access Tokens List',
    subtitle:
      'Here you can find all your Access Tokens. You can manage them or revoke a token.',
  },
  toolbar: {
    searchPlaceholder: 'Search tokens...',
    status: 'Status',
    scopes: 'Scopes',
    generate: 'Generate Token',
  },
  table: {
    name: 'Name',
    expires: 'Expires',
    status: 'Status',
    createdAt: 'Created At',
    revokedAt: 'Revoked At',
    scopes: 'Scopes',
    actions: 'Actions',
    notApplicable: 'N/A',
    revokeAriaLabel: 'Revoke token',
  },
  status: {
    active: 'Active',
    expired: 'Expired',
    revoked: 'Revoked',
  },
  scopes: {
    read: 'Read',
    write: 'Write',
    admin: 'Admin',
    readHelp: 'Read-only access — permits HTTP GET requests.',
    writeHelp: 'Write access — permits HTTP POST, PUT, and DELETE requests.',
    adminHelp: 'Full access — permits all HTTP methods.',
  },
  pane: {
    create: {
      title: 'Create a New Token',
      subtitle:
        'Your new access token will be generated with the settings below.',
      back: 'Back to token list',
      nameLabel: 'Token Name',
      namePlaceholder: 'Enter token name',
      scopesLabel: 'Scopes',
      expiresLabel: 'Expiration Date',
      cancel: 'Cancel',
      submit: 'Create Token',
    },
    reveal: {
      heading: 'Your new access token',
      warning: 'This token will not be shown again. Copy it now.',
      jwtLabel: 'Token',
      curlLabel: 'Example curl command',
      copyJwt: 'Copy token',
      copyCurl: 'Copy curl command',
      copied: 'Copied to clipboard',
      showJwt: 'Show token',
      hideJwt: 'Hide token',
      close: 'Close',
    },
    revoke: {
      heading: 'Revoke this token?',
      body: 'Any process using this token will stop working immediately. This cannot be undone.',
      cancel: 'Cancel',
      confirm: 'Revoke',
      toastSuccess: 'Token revoked.',
    },
  },
  empty: {
    heading: 'No access tokens yet',
    body: 'Generate a token to authenticate CLI tools, CI pipelines, or scripts against the QLM public API.',
    action: 'Generate your first token',
  },
  errors: {
    listHeading: "Couldn't load your tokens",
    retry: 'Retry',
    generic: 'Something went wrong. Please try again.',
    invalidName: 'Token name is required (1–255 characters).',
    invalidScopes: 'Select at least one scope.',
    expirationTooFar: 'Expiration must be within 365 days from today.',
    expirationInPast: 'Expiration must be in the future.',
    notFound: 'Token not found.',
    alreadyRevoked: 'This token is already revoked.',
  },
};

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
  ns: ['tokens', 'settings'],
  defaultNS: 'tokens',
  interpolation: { escapeValue: false },
  resources: {
    en: { tokens: tokensEn, settings: settingsEn },
  },
} as Parameters<typeof storybookI18n.init>[0]);

export function createStoryQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Single Storybook decorator for every user-tokens story file. Wraps with
 * a fresh `QueryClient` and the i18n instance above — no router, no
 * supabase, no app shell.
 */
function UserTokensProviders({ Story }: { Story: React.ComponentType }) {
  const queryClient = React.useMemo(() => createStoryQueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={storybookI18n}>
        <Story />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export const withUserTokensProviders: Decorator = (
  Story: React.ComponentType,
) => <UserTokensProviders Story={Story} />;
