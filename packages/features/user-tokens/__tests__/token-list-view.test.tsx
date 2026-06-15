import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UserToken, UserTokenScope } from '@guepard/domain/entities';

import { TokenListView } from '../src/components/token-list-view';
import { createTestProviders } from './test-providers';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const NOW_SECONDS = Math.floor(Date.now() / 1000);

function makeToken(id: string, overrides: Partial<UserToken> = {}): UserToken {
  return {
    id,
    account_id: ACCOUNT_ID,
    token_name: `tok-${id.slice(0, 4)}`,
    scopes: ['read'] as UserTokenScope[],
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

function renderWith({
  list,
  onGenerateClick = vi.fn(),
  onRevokeClick = vi.fn(),
}: {
  list: () => Promise<UserToken[]>;
  onGenerateClick?: () => void;
  onRevokeClick?: (token: UserToken) => void;
}) {
  const { wrapper } = createTestProviders({
    list,
    create: vi.fn(),
    revoke: vi.fn(),
  });
  return render(
    <TokenListView
      onGenerateClick={onGenerateClick}
      onRevokeClick={onRevokeClick}
    />,
    { wrapper },
  );
}

describe('TokenListView', () => {
  it('renders the loading skeleton while the query is pending', () => {
    renderWith({ list: () => new Promise<UserToken[]>(() => {}) });
    expect(screen.getByTestId('token-list-loading')).toBeInTheDocument();
  });

  it('renders the empty state when the query returns []', async () => {
    renderWith({ list: async () => [] });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-empty')).toBeInTheDocument(),
    );
    expect(screen.getByText('No access tokens yet')).toBeInTheDocument();
  });

  it('clicking the empty-state CTA fires onGenerateClick', async () => {
    const onGenerateClick = vi.fn();
    renderWith({ list: async () => [], onGenerateClick });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-empty')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Generate your first token'));
    expect(onGenerateClick).toHaveBeenCalledTimes(1);
  });

  it('renders the error state with a Retry button when the query rejects', async () => {
    renderWith({ list: async () => Promise.reject(new Error('boom')) });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-error')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders one row per token returned by the query', async () => {
    renderWith({
      list: async () => [
        makeToken('11111111-1111-4111-9111-111111111111', {
          token_name: 'first',
        }),
        makeToken('22222222-2222-4222-9222-222222222222', {
          token_name: 'second',
        }),
      ],
    });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-content')).toBeInTheDocument(),
    );
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('clicking the toolbar Generate Token button fires onGenerateClick', async () => {
    const onGenerateClick = vi.fn();
    renderWith({
      list: async () => [makeToken('11111111-1111-4111-9111-111111111111')],
      onGenerateClick,
    });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-generate')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('token-list-generate'));
    expect(onGenerateClick).toHaveBeenCalledTimes(1);
  });

  it('clicking the trash icon on an active row fires onRevokeClick(token)', async () => {
    const onRevokeClick = vi.fn();
    const target = makeToken('11111111-1111-4111-9111-111111111111', {
      token_name: 'to-revoke',
    });
    renderWith({
      list: async () => [target],
      onRevokeClick,
    });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-content')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }));
    expect(onRevokeClick).toHaveBeenCalledTimes(1);
    expect(onRevokeClick).toHaveBeenCalledWith(target);
  });

  it('search filters by token_name (case-insensitive substring match)', async () => {
    renderWith({
      list: async () => [
        makeToken('11111111-1111-4111-9111-111111111111', {
          token_name: 'CI deploy token',
        }),
        makeToken('22222222-2222-4222-9222-222222222222', {
          token_name: 'Local dev token',
        }),
      ],
    });
    await waitFor(() =>
      expect(screen.getByTestId('token-list-content')).toBeInTheDocument(),
    );
    const search = screen.getByPlaceholderText('Search tokens...');
    fireEvent.change(search, { target: { value: 'ci' } });
    expect(screen.getByText('CI deploy token')).toBeInTheDocument();
    expect(screen.queryByText('Local dev token')).not.toBeInTheDocument();
  });
});
