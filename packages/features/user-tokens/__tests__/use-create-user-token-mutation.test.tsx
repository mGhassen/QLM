import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UserToken } from '@qlm/domain/entities';
import type { CreateUserTokenOutput } from '@qlm/domain/usecases';

import {
  USER_TOKENS_LIST_QUERY_KEY,
  useCreateUserTokenMutation,
} from '../src/hooks';
import { createTestProviders } from './test-providers';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

function makeOutput(): CreateUserTokenOutput {
  const row: UserToken = {
    id: '11111111-1111-4111-9111-111111111111',
    account_id: ACCOUNT_ID,
    token_name: 'CI deploy',
    scopes: ['read', 'write'],
    expires_at: 9_999_999_999,
    revoked: false,
    revoked_at: null,
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-15T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
  };
  return { row, rawJwt: 'mock.jwt.value' };
}

describe('useCreateUserTokenMutation', () => {
  it('forwards input to api.create and resolves with { row, rawJwt }', async () => {
    const create = vi.fn().mockResolvedValue(makeOutput());
    const { wrapper } = createTestProviders({
      list: vi.fn(),
      create,
      revoke: vi.fn(),
    });

    const { result } = renderHook(() => useCreateUserTokenMutation(), {
      wrapper,
    });

    const input = {
      token_name: 'CI deploy',
      scopes: ['read', 'write'] as const,
      expires_at: 9_999_999_999,
    };
    const output = await result.current.mutateAsync(input);

    expect(create).toHaveBeenCalledWith(input);
    expect(output.row.token_name).toBe('CI deploy');
    expect(output.rawJwt).toBe('mock.jwt.value');
  });

  it('invalidates the list query on success', async () => {
    const create = vi.fn().mockResolvedValue(makeOutput());
    const { wrapper, queryClient } = createTestProviders({
      list: vi.fn(),
      create,
      revoke: vi.fn(),
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateUserTokenMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      token_name: 't',
      scopes: ['read'],
      expires_at: 9_999_999_999,
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: USER_TOKENS_LIST_QUERY_KEY,
      }),
    );
  });

  it('does NOT invalidate when the mutation rejects', async () => {
    const create = vi.fn().mockRejectedValue(new Error('boom'));
    const { wrapper, queryClient } = createTestProviders({
      list: vi.fn(),
      create,
      revoke: vi.fn(),
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateUserTokenMutation(), {
      wrapper,
    });

    await expect(
      result.current.mutateAsync({
        token_name: 't',
        scopes: ['read'],
        expires_at: 9_999_999_999,
      }),
    ).rejects.toThrow('boom');

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
