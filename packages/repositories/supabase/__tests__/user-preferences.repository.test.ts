import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SupabaseUserPreferencesRepository } from '../src/user-preferences.repository';
import type { SupabaseClientType } from '../src/types';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';

type Row = {
  user_id: string;
  preferences: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    user_id: USER_ID,
    preferences: { last_project_by_org: { [ORG_ID]: PROJECT_ID } },
    created_at: '2026-04-18T00:00:00.000Z',
    updated_at: '2026-04-18T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Same chainable mock shape used by `user-token.repository.test.ts`: the
 * chainable `from().select().eq()` calls resolve via `maybeSingle()`. The
 * RPC path bypasses the builder and goes through `client.rpc(...)` which
 * is mocked on the root client.
 */
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq']) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }
  (builder as { maybeSingle: () => Promise<unknown> }).maybeSingle = vi.fn(
    async () => {
      calls.push({ method: 'maybeSingle', args: [] });
      return result;
    },
  );
  return { builder, calls };
}

function makeClient(
  selectResult: { data: unknown; error: unknown },
  rpcResult: { data: unknown; error: unknown } = { data: null, error: null },
): {
  client: SupabaseClientType;
  fromCalls: string[];
  rpcCalls: Array<{ fn: string; args: unknown }>;
  builderCalls: Array<{ method: string; args: unknown[] }>;
} {
  const { builder, calls } = makeQueryBuilder(selectResult);
  const fromCalls: string[] = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const client = {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      return builder;
    }),
    rpc: vi.fn(async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return rpcResult;
    }),
  } as unknown as SupabaseClientType;
  return { client, fromCalls, rpcCalls, builderCalls: calls };
}

describe('SupabaseUserPreferencesRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('returns null when the row does not exist', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserPreferencesRepository(client);

      const result = await repo.get(USER_ID);
      expect(result).toBeNull();
    });

    it('returns the parsed row when it exists', async () => {
      const row = makeRow();
      const { client, fromCalls, builderCalls } = makeClient({
        data: row,
        error: null,
      });
      const repo = new SupabaseUserPreferencesRepository(client);

      const result = await repo.get(USER_ID);

      expect(fromCalls).toEqual(['user_preferences']);
      expect(builderCalls).toEqual([
        { method: 'select', args: ['*'] },
        { method: 'eq', args: ['user_id', USER_ID] },
        { method: 'maybeSingle', args: [] },
      ]);
      expect(result).not.toBeNull();
      expect(result!.user_id).toBe(USER_ID);
      expect(result!.preferences.last_project_by_org).toEqual({
        [ORG_ID]: PROJECT_ID,
      });
    });

    it('throws when the select errors', async () => {
      const { client } = makeClient({
        data: null,
        error: { message: 'boom' },
      });
      const repo = new SupabaseUserPreferencesRepository(client);

      await expect(repo.get(USER_ID)).rejects.toThrow(/boom/);
    });
  });

  describe('patch', () => {
    it('calls merge_user_preferences RPC and parses the returned row', async () => {
      const row = makeRow();
      const { client, rpcCalls } = makeClient(
        { data: null, error: null },
        { data: row, error: null },
      );
      const repo = new SupabaseUserPreferencesRepository(client);

      const patch = { last_project_by_org: { [ORG_ID]: PROJECT_ID } };
      const result = await repo.patch(USER_ID, patch);

      expect(rpcCalls).toEqual([
        { fn: 'merge_user_preferences', args: { p_patch: patch } },
      ]);
      expect(result.user_id).toBe(USER_ID);
      expect(result.preferences.last_project_by_org).toEqual({
        [ORG_ID]: PROJECT_ID,
      });
    });

    it('throws when the RPC errors', async () => {
      const { client } = makeClient(
        { data: null, error: null },
        { data: null, error: { message: 'rpc failed' } },
      );
      const repo = new SupabaseUserPreferencesRepository(client);

      await expect(repo.patch(USER_ID, {})).rejects.toThrow(/rpc failed/);
    });
  });
});
