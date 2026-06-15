import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DirtyStateProvider } from '@guepard/settings-shell';

import { UserTokensApiProvider, type UserTokensApi } from '../src/hooks';
import { GenerateTokenForm } from '../src/components/generate-token-form';
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

function makeApi(overrides: Partial<UserTokensApi> = {}): UserTokensApi {
  return {
    list: async () => [],
    revoke: async () => {
      throw new Error('not used');
    },
    create: vi.fn(async (input) => ({
      row: {
        id: '11111111-1111-4111-9111-111111111111',
        account_id: '00000000-0000-4000-8000-000000000001',
        token_name: input.token_name,
        scopes: input.scopes,
        expires_at: input.expires_at,
        revoked: false,
        revoked_at: null,
        created_at: '2026-04-15T00:00:00.000Z',
        updated_at: '2026-04-15T00:00:00.000Z',
        created_by: '00000000-0000-4000-8000-000000000001',
        updated_by: '00000000-0000-4000-8000-000000000001',
      },
      rawJwt: 'demo.jwt.value',
    })),
    ...overrides,
  };
}

describe('GenerateTokenForm', () => {
  it('disables submit until name + at least one scope are provided', async () => {
    const api = makeApi();
    render(
      withProviders(
        <GenerateTokenForm onCancel={vi.fn()} onCreated={vi.fn()} />,
        api,
      ),
    );
    const submit = screen.getByTestId('generate-token-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Token Name'), {
      target: { value: 'CI deploy' },
    });
    await waitFor(() => expect(submit).toBeDisabled());

    fireEvent.click(screen.getByRole('checkbox', { name: /Read/i }));
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it('submit calls api.create with the form payload and emits onCreated', async () => {
    const onCreated = vi.fn();
    const create = vi.fn(async (input) => ({
      row: {
        id: '11111111-1111-4111-9111-111111111111',
        account_id: '00000000-0000-4000-8000-000000000001',
        token_name: input.token_name,
        scopes: input.scopes,
        expires_at: input.expires_at,
        revoked: false,
        revoked_at: null,
        created_at: '2026-04-15T00:00:00.000Z',
        updated_at: '2026-04-15T00:00:00.000Z',
        created_by: '00000000-0000-4000-8000-000000000001',
        updated_by: '00000000-0000-4000-8000-000000000001',
      },
      rawJwt: 'demo.jwt.value',
    }));
    const api = makeApi({ create });

    render(
      withProviders(
        <GenerateTokenForm onCancel={vi.fn()} onCreated={onCreated} />,
        api,
      ),
    );

    fireEvent.change(screen.getByLabelText('Token Name'), {
      target: { value: 'CI deploy' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Read/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Write/i }));

    const submit = screen.getByTestId('generate-token-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        token_name: 'CI deploy',
        scopes: ['read', 'write'],
      }),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onCreated.mock.calls[0]![0].rawJwt).toBe('demo.jwt.value');
  });

  it('cancel button fires onCancel', () => {
    const onCancel = vi.fn();
    render(
      withProviders(
        <GenerateTokenForm onCancel={onCancel} onCreated={vi.fn()} />,
        makeApi(),
      ),
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders an inline error banner when the mutation rejects', async () => {
    const api = makeApi({
      create: vi.fn(async () => {
        throw new Error('Server-side validation failed.');
      }),
    });
    render(
      withProviders(
        <GenerateTokenForm onCancel={vi.fn()} onCreated={vi.fn()} />,
        api,
      ),
    );
    fireEvent.change(screen.getByLabelText('Token Name'), {
      target: { value: 'CI deploy' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Read/i }));

    const submit = screen.getByTestId('generate-token-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    await waitFor(() =>
      expect(
        screen.getByText('Server-side validation failed.'),
      ).toBeInTheDocument(),
    );
  });
});
