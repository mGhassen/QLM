import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { DirtyStateProvider } from '@qlm/settings-shell';

import { UserTokensApiProvider, type UserTokensApi } from '../hooks';
import { GenerateTokenForm } from './generate-token-form';
import { storybookI18n } from './story-helpers';

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
    revoke: async () => {
      throw new Error('not used');
    },
    create: async (input) => {
      if (mode === 'submitting') {
        return new Promise(() => {});
      }
      if (mode === 'error') throw new Error('Server-side validation failed.');
      return {
        row: {
          id: '11111111-1111-4111-9111-111111111111',
          account_id: '00000000-0000-4000-8000-000000000001',
          token_name: input.token_name,
          scopes: input.scopes,
          expires_at: input.expires_at,
          revoked: false,
          revoked_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: '00000000-0000-4000-8000-000000000001',
          updated_by: '00000000-0000-4000-8000-000000000001',
        },
        rawJwt: 'demo.jwt.signature.value',
      };
    },
  };

  return (
    <I18nextProvider i18n={storybookI18n}>
      <QueryClientProvider client={client}>
        <UserTokensApiProvider value={api}>
          <DirtyStateProvider>
            <div className="bg-background w-[760px] rounded border p-6">
              <GenerateTokenForm onCancel={fn()} onCreated={fn()} />
            </div>
          </DirtyStateProvider>
        </UserTokensApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const meta: Meta<typeof GenerateTokenForm> = {
  title: 'UserTokens/GenerateTokenForm',
  component: GenerateTokenForm,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof GenerateTokenForm>;

export const Pristine: Story = { render: () => <StoryHost mode="idle" /> };
export const Submitting: Story = {
  render: () => <StoryHost mode="submitting" />,
};
export const ErrorState: Story = {
  name: 'Error',
  render: () => <StoryHost mode="error" />,
};
