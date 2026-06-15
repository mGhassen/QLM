import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { UserToken } from '@guepard/domain/entities';

import { UserTokensApiProvider, type UserTokensApi } from '../hooks';
import { RevokeConfirmInline } from './revoke-confirm-inline';
import { storybookI18n } from './story-helpers';

const TOKEN: UserToken = {
  id: '11111111-1111-4111-9111-111111111111',
  account_id: '00000000-0000-4000-8000-000000000001',
  token_name: 'CI deploy token',
  scopes: ['read', 'write'],
  expires_at: 9_999_999_999,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-15T00:00:00.000Z',
  updated_at: '2026-04-15T00:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000001',
  updated_by: '00000000-0000-4000-8000-000000000001',
};

type Mode = 'idle' | 'submitting' | 'error';

function StoryHost({ mode }: { mode: Mode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: 0 },
          mutations: { retry: false },
        },
      }),
  );

  const api: UserTokensApi = {
    list: async () => [],
    create: async () => {
      throw new Error('not used');
    },
    revoke: async (id) => {
      if (mode === 'submitting') return new Promise(() => {});
      if (mode === 'error') throw new Error('Network error.');
      return {
        ...TOKEN,
        id,
        revoked: true,
        revoked_at: new Date().toISOString(),
      };
    },
  };

  return (
    <I18nextProvider i18n={storybookI18n}>
      <QueryClientProvider client={client}>
        <UserTokensApiProvider value={api}>
          <div className="bg-background relative w-[760px] rounded border p-6">
            <RevokeConfirmInline
              token={TOKEN}
              onCancel={fn()}
              onRevoked={fn()}
            />
          </div>
        </UserTokensApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const meta: Meta<typeof RevokeConfirmInline> = {
  title: 'UserTokens/RevokeConfirmInline',
  component: RevokeConfirmInline,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof RevokeConfirmInline>;

export const Pristine: Story = { render: () => <StoryHost mode="idle" /> };
export const Submitting: Story = {
  render: () => <StoryHost mode="submitting" />,
};
export const ErrorState: Story = {
  name: 'Error',
  render: () => <StoryHost mode="error" />,
};
