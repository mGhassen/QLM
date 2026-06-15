import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { UserToken } from '@guepard/domain/entities';

import { RevokeConfirmInline } from '../src/components/revoke-confirm-inline';
import { UserTokensApiProvider, type UserTokensApi } from '../src/hooks';
import { storybookI18n } from '../src/components/story-helpers';

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

const TOKEN: UserToken = {
  id: '11111111-1111-4111-9111-111111111111',
  account_id: '00000000-0000-4000-8000-000000000001',
  token_name: 'CI deploy',
  scopes: ['read'],
  expires_at: 9_999_999_999,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-15T00:00:00.000Z',
  updated_at: '2026-04-15T00:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000001',
  updated_by: '00000000-0000-4000-8000-000000000001',
};

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
        <UserTokensApiProvider value={api}>{ui}</UserTokensApiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

describe('RevokeConfirmInline', () => {
  it('uses role="alertdialog" + aria-modal="true"', () => {
    const api: UserTokensApi = {
      list: async () => [],
      create: async () => {
        throw new Error('not used');
      },
      revoke: async () => TOKEN,
    };
    render(
      withProviders(
        <RevokeConfirmInline
          token={TOKEN}
          onCancel={vi.fn()}
          onRevoked={vi.fn()}
        />,
        api,
      ),
    );
    const alertdialog = screen.getByRole('alertdialog');
    expect(alertdialog).toHaveAttribute('aria-modal', 'true');
    expect(alertdialog).toHaveAttribute(
      'aria-labelledby',
      'revoke-confirm-heading',
    );
    expect(alertdialog).toHaveAttribute(
      'aria-describedby',
      'revoke-confirm-body',
    );
  });

  it('Cancel calls onCancel exactly once', () => {
    const onCancel = vi.fn();
    render(
      withProviders(
        <RevokeConfirmInline
          token={TOKEN}
          onCancel={onCancel}
          onRevoked={vi.fn()}
        />,
        {
          list: async () => [],
          create: async () => {
            throw new Error('not used');
          },
          revoke: async () => TOKEN,
        },
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Revoke calls api.revoke with the token id and emits onRevoked on success', async () => {
    const onRevoked = vi.fn();
    const revoke = vi.fn().mockResolvedValue({ ...TOKEN, revoked: true });
    render(
      withProviders(
        <RevokeConfirmInline
          token={TOKEN}
          onCancel={vi.fn()}
          onRevoked={onRevoked}
        />,
        {
          list: async () => [],
          create: async () => {
            throw new Error('not used');
          },
          revoke,
        },
      ),
    );
    fireEvent.click(screen.getByTestId('revoke-confirm-submit'));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith(TOKEN.id));
    await waitFor(() => expect(onRevoked).toHaveBeenCalledTimes(1));
  });

  it('renders an inline error and does NOT emit onRevoked when the mutation rejects', async () => {
    const onRevoked = vi.fn();
    render(
      withProviders(
        <RevokeConfirmInline
          token={TOKEN}
          onCancel={vi.fn()}
          onRevoked={onRevoked}
        />,
        {
          list: async () => [],
          create: async () => {
            throw new Error('not used');
          },
          revoke: vi.fn().mockRejectedValue(new Error('Network error.')),
        },
      ),
    );
    fireEvent.click(screen.getByTestId('revoke-confirm-submit'));
    await waitFor(() =>
      expect(screen.getByText('Network error.')).toBeInTheDocument(),
    );
    expect(onRevoked).not.toHaveBeenCalled();
  });
});
