import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { UserToken, UserTokenScope } from '@guepard/domain/entities';

import { UserTokensApiProvider } from '../hooks/user-tokens-api-context';
import { storybookI18n } from './story-helpers';
import { TokenListView } from './token-list-view';
import { I18nextProvider } from 'react-i18next';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const NOW_SECONDS = Math.floor(Date.now() / 1000);

function makeToken(overrides: Partial<UserToken> = {}): UserToken {
  return {
    id: '11111111-1111-4111-9111-111111111111',
    account_id: ACCOUNT_ID,
    token_name: 'CI deploy token',
    scopes: ['read', 'write'] as UserTokenScope[],
    expires_at: NOW_SECONDS + 30 * 86_400,
    revoked: false,
    revoked_at: null,
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-15T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
    ...overrides,
  };
}

type Mode = 'loading' | 'empty' | 'error' | 'with-rows';

function StoryHost({ mode, rows = [] }: { mode: Mode; rows?: UserToken[] }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: 0 },
          mutations: { retry: false },
        },
      }),
  );

  const api = {
    list: async () => {
      if (mode === 'loading') return new Promise<UserToken[]>(() => {});
      if (mode === 'error') throw new Error('boom');
      if (mode === 'empty') return [];
      return rows;
    },
    create: async () => {
      throw new Error('not used in this story');
    },
    revoke: async () => {
      throw new Error('not used in this story');
    },
  };

  return (
    <I18nextProvider i18n={storybookI18n}>
      <QueryClientProvider client={client}>
        <UserTokensApiProvider value={api}>
          <div className="bg-background w-[900px] rounded border p-6">
            <TokenListView onGenerateClick={fn()} onRevokeClick={fn()} />
          </div>
        </UserTokensApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const meta: Meta<typeof TokenListView> = {
  title: 'UserTokens/TokenListView',
  component: TokenListView,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof TokenListView>;

export const Loading: Story = {
  render: () => <StoryHost mode="loading" />,
};

export const Empty: Story = {
  render: () => <StoryHost mode="empty" />,
};

export const ErrorState: Story = {
  name: 'Error',
  render: () => <StoryHost mode="error" />,
};

export const WithThreeTokens: Story = {
  render: () => (
    <StoryHost
      mode="with-rows"
      rows={[
        makeToken({
          id: '11111111-1111-4111-9111-111111111111',
          token_name: 'CI deploy token',
          scopes: ['read', 'write'],
          expires_at: NOW_SECONDS + 90 * 86_400,
        }),
        makeToken({
          id: '22222222-2222-4222-9222-222222222222',
          token_name: 'Stale migration token',
          scopes: ['read'],
          expires_at: NOW_SECONDS - 86_400,
        }),
        makeToken({
          id: '33333333-3333-4333-9333-333333333333',
          token_name: 'Old admin token',
          scopes: ['read', 'write', 'admin'],
          revoked: true,
          revoked_at: '2026-04-10T12:00:00.000Z',
          expires_at: NOW_SECONDS + 30 * 86_400,
        }),
      ]}
    />
  ),
};
