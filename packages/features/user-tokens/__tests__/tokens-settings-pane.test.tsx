import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DirtyStateProvider } from '@qlm/settings-shell';
import type { UserToken } from '@qlm/domain/entities';

import { TokensSettingsPane } from '../src/components/tokens-settings-pane';
import { UserTokensApiProvider, type UserTokensApi } from '../src/hooks';
import { storybookI18n } from '../src/components/story-helpers';

function withProviders(ui: ReactNode, api: UserTokensApi) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return (
    <I18nextProvider i18n={storybookI18n}>
      <QueryClientProvider client={client}>
        <UserTokensApiProvider value={api}>
          <DirtyStateProvider>{ui}</DirtyStateProvider>
        </UserTokensApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const NEW_TOKEN: UserToken = {
  id: '11111111-1111-4111-9111-111111111111',
  account_id: ACCOUNT_ID,
  token_name: 'CI deploy',
  scopes: ['read'],
  expires_at: 9_999_999_999,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-15T00:00:00.000Z',
  updated_at: '2026-04-15T00:00:00.000Z',
  created_by: ACCOUNT_ID,
  updated_by: ACCOUNT_ID,
};

function makeApi(initialList: UserToken[] = []): UserTokensApi {
  return {
    list: vi.fn().mockResolvedValue(initialList),
    create: vi.fn(async () => ({
      row: NEW_TOKEN,
      rawJwt: 'demo.jwt.value',
    })),
    revoke: vi.fn(async () => NEW_TOKEN),
  };
}

describe('TokensSettingsPane (with TokenListView + GenerateTokenForm wired)', () => {
  it('starts in the list state', async () => {
    render(withProviders(<TokensSettingsPane />, makeApi()));
    await waitFor(() =>
      expect(screen.getByTestId('pane-state-list')).toBeInTheDocument(),
    );
  });

  it('clicking Generate (empty-state CTA) opens the create state', async () => {
    render(withProviders(<TokensSettingsPane />, makeApi()));
    await waitFor(() =>
      expect(screen.getByText('Generate your first token')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Generate your first token'));
    expect(screen.getByTestId('pane-state-create')).toBeInTheDocument();
    expect(screen.queryByTestId('pane-state-list')).not.toBeInTheDocument();
  });

  it('list → create → list (cancel)', async () => {
    render(withProviders(<TokensSettingsPane />, makeApi()));
    await waitFor(() =>
      expect(screen.getByText('Generate your first token')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Generate your first token'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByTestId('pane-state-list')).toBeInTheDocument();
  });

  it('list → create → reveal (created) and back via close', async () => {
    render(withProviders(<TokensSettingsPane />, makeApi()));
    await waitFor(() =>
      expect(screen.getByText('Generate your first token')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Generate your first token'));

    // Fill the form and submit to reach the reveal state.
    fireEvent.change(screen.getByLabelText('Token Name'), {
      target: { value: 'CI deploy' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Read/i }));

    const submit = screen.getByTestId('generate-token-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() =>
      expect(screen.getByTestId('pane-state-reveal')).toBeInTheDocument(),
    );
    // Real RevealTokenView surfaces the JWT in the readonly input value.
    expect(
      (screen.getByTestId('reveal-jwt-input') as HTMLInputElement).value,
    ).toBe('demo.jwt.value');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('pane-state-list')).toBeInTheDocument();
    expect(screen.queryByTestId('reveal-jwt-input')).not.toBeInTheDocument();
  });
});
