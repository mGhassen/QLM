import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UserToken } from '@qlm/domain/entities';

import {
  USER_TOKENS_LIST_QUERY_KEY,
  useRevokeUserTokenMutation,
} from '../src/hooks';
import { createTestProviders } from './test-providers';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const TOKEN_ID = '11111111-1111-4111-9111-111111111111';

function makeRevokedRow(): UserToken {
  return {
    id: TOKEN_ID,
    account_id: ACCOUNT_ID,
    token_name: 'CI deploy',
    scopes: ['read'],
    expires_at: 9_999_999_999,
    revoked: true,
    revoked_at: '2026-04-16T00:00:00.000Z',
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-16T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
  };
}

describe('useRevokeUserTokenMutation', () => {
  it('forwards the id to api.revoke and resolves with the updated row', async () => {
    const revoke = vi.fn().mockResolvedValue(makeRevokedRow());
    const { wrapper } = createTestProviders({
      list: vi.fn(),
      create: vi.fn(),
      revoke,
    });

    const { result } = renderHook(() => useRevokeUserTokenMutation(), {
      wrapper,
    });

    const row = await result.current.mutateAsync({ id: TOKEN_ID });

    expect(revoke).toHaveBeenCalledWith(TOKEN_ID);
    expect(row.revoked).toBe(true);
    expect(row.revoked_at).toBe('2026-04-16T00:00:00.000Z');
  });

  it('invalidates the list query on success', async () => {
    const revoke = vi.fn().mockResolvedValue(makeRevokedRow());
    const { wrapper, queryClient } = createTestProviders({
      list: vi.fn(),
      create: vi.fn(),
      revoke,
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRevokeUserTokenMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({ id: TOKEN_ID });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: USER_TOKENS_LIST_QUERY_KEY,
      }),
    );
  });

  it('does NOT invalidate when the mutation rejects', async () => {
    const revoke = vi.fn().mockRejectedValue(new Error('not found'));
    const { wrapper, queryClient } = createTestProviders({
      list: vi.fn(),
      create: vi.fn(),
      revoke,
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRevokeUserTokenMutation(), {
      wrapper,
    });

    await expect(result.current.mutateAsync({ id: TOKEN_ID })).rejects.toThrow(
      'not found',
    );

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
