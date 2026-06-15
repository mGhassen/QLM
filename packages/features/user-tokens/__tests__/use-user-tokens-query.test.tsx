import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UserToken } from '@guepard/domain/entities';

import { useUserTokensQuery } from '../src/hooks';
import { createTestProviders } from './test-providers';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

function makeRow(id: string, overrides: Partial<UserToken> = {}): UserToken {
  return {
    id,
    account_id: ACCOUNT_ID,
    token_name: `tok-${id}`,
    scopes: ['read'],
    expires_at: 9_999_999_999,
    revoked: false,
    revoked_at: null,
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-15T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
    ...overrides,
  };
}

describe('useUserTokensQuery', () => {
  it('fetches via api.list() and exposes the rows', async () => {
    const rows = [
      makeRow('11111111-1111-4111-9111-111111111111'),
      makeRow('22222222-2222-4222-9222-222222222222'),
    ];
    const list = vi.fn().mockResolvedValue(rows);
    const { wrapper } = createTestProviders({
      list,
      create: vi.fn(),
      revoke: vi.fn(),
    });

    const { result } = renderHook(() => useUserTokensQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(list).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(rows);
  });

  it('surfaces errors via the standard react-query error path', async () => {
    const list = vi.fn().mockRejectedValue(new Error('boom'));
    const { wrapper } = createTestProviders({
      list,
      create: vi.fn(),
      revoke: vi.fn(),
    });

    const { result } = renderHook(() => useUserTokensQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('boom');
  });
});
