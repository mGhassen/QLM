import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SupabaseUserTokenRepository } from '../src/user-token.repository';
import type { SupabaseClientType } from '../src/types';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const TOKEN_ID = '11111111-1111-4111-9111-111111111111';

type Row = {
  id: string;
  account_id: string;
  token_name: string;
  scopes: string[];
  expires_at: number;
  revoked: boolean | null;
  revoked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: TOKEN_ID,
    account_id: ACCOUNT_ID,
    token_name: 'CI deploy token',
    scopes: ['read', 'write'],
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

/**
 * Build a chainable Supabase query mock. Each chainable method returns the
 * same builder so calls can be inspected. Resolution methods (`single`,
 * `maybeSingle`, the trailing `await` on `order`) return the configured
 * `data` / `error`.
 */
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'in',
  ];
  for (const method of chainMethods) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }
  // Resolution methods — return the configured result.
  (builder as { single: () => Promise<unknown> }).single = vi.fn(async () => {
    calls.push({ method: 'single', args: [] });
    return result;
  });
  (builder as { maybeSingle: () => Promise<unknown> }).maybeSingle = vi.fn(
    async () => {
      calls.push({ method: 'maybeSingle', args: [] });
      return result;
    },
  );
  // For `order(...)` followed by an `await` (no .single()), mark the builder
  // as a thenable so it resolves with the raw result.
  (builder as { then: (cb: (value: unknown) => unknown) => unknown }).then = (
    cb,
  ) => Promise.resolve(result).then(cb);

  return { builder, calls };
}

function makeClient(builderResult: { data: unknown; error: unknown }): {
  client: SupabaseClientType;
  fromCalls: string[];
  builder: Record<string, unknown>;
  builderCalls: Array<{ method: string; args: unknown[] }>;
} {
  const { builder, calls } = makeQueryBuilder(builderResult);
  const fromCalls: string[] = [];
  const client = {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      return builder;
    }),
  } as unknown as SupabaseClientType;
  return { client, fromCalls, builder, builderCalls: calls };
}

describe('SupabaseUserTokenRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByAccountId', () => {
    it('queries user_tokens with the right filter and order', async () => {
      const row = makeRow();
      const { client, fromCalls, builderCalls } = makeClient({
        data: [row],
        error: null,
      });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.findByAccountId(ACCOUNT_ID);

      expect(fromCalls).toEqual(['user_tokens']);
      expect(builderCalls).toEqual([
        { method: 'select', args: ['*'] },
        { method: 'eq', args: ['account_id', ACCOUNT_ID] },
        { method: 'order', args: ['created_at', { ascending: false }] },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(TOKEN_ID);
      expect(result[0]!.revoked).toBe(false);
    });

    it('returns [] when data is null', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.findByAccountId(ACCOUNT_ID);
      expect(result).toEqual([]);
    });

    it('throws when the query errors', async () => {
      const { client } = makeClient({
        data: null,
        error: { message: 'boom' },
      });
      const repo = new SupabaseUserTokenRepository(client);

      await expect(repo.findByAccountId(ACCOUNT_ID)).rejects.toThrow(/boom/);
    });
  });

  describe('findById', () => {
    it('returns the parsed row on success', async () => {
      const row = makeRow();
      const { client, builderCalls } = makeClient({ data: row, error: null });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.findById(TOKEN_ID);

      expect(builderCalls).toEqual([
        { method: 'select', args: ['*'] },
        { method: 'eq', args: ['id', TOKEN_ID] },
        { method: 'single', args: [] },
      ]);
      expect(result?.id).toBe(TOKEN_ID);
    });

    it('returns null on PGRST116', async () => {
      const { client } = makeClient({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.findById(TOKEN_ID);
      expect(result).toBeNull();
    });

    it('throws on a non-PGRST116 error', async () => {
      const { client } = makeClient({
        data: null,
        error: { code: 'OTHER', message: 'fatal' },
      });
      const repo = new SupabaseUserTokenRepository(client);

      await expect(repo.findById(TOKEN_ID)).rejects.toThrow(/fatal/);
    });
  });

  describe('create', () => {
    it('inserts only the four allowed fields and returns the parsed row', async () => {
      const row = makeRow();
      const { client, builderCalls } = makeClient({ data: row, error: null });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.create({
        account_id: ACCOUNT_ID,
        token_name: 'CI deploy token',
        scopes: ['read', 'write'],
        expires_at: 9_999_999_999,
      });

      const insertCall = builderCalls.find((c) => c.method === 'insert');
      expect(insertCall).toBeDefined();
      expect(insertCall!.args[0]).toEqual({
        account_id: ACCOUNT_ID,
        token_name: 'CI deploy token',
        scopes: ['read', 'write'],
        expires_at: 9_999_999_999,
      });
      // No timestamp / tracking fields in the insert payload — triggers own those.
      const inserted = insertCall!.args[0] as Record<string, unknown>;
      expect(inserted).not.toHaveProperty('created_at');
      expect(inserted).not.toHaveProperty('updated_at');
      expect(inserted).not.toHaveProperty('created_by');
      expect(inserted).not.toHaveProperty('updated_by');
      expect(result.id).toBe(TOKEN_ID);
    });

    it('throws when the insert errors', async () => {
      const { client } = makeClient({
        data: null,
        error: { message: 'duplicate' },
      });
      const repo = new SupabaseUserTokenRepository(client);

      await expect(
        repo.create({
          account_id: ACCOUNT_ID,
          token_name: 't',
          scopes: ['read'],
          expires_at: 9_999_999_999,
        }),
      ).rejects.toThrow(/duplicate/);
    });
  });

  describe('revoke', () => {
    it('updates with revoked=true and the correct triple-narrowing WHERE clause', async () => {
      const row = makeRow({
        revoked: true,
        revoked_at: '2026-04-16T00:00:00.000Z',
      });
      const { client, builderCalls } = makeClient({ data: row, error: null });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.revoke(TOKEN_ID, ACCOUNT_ID);

      const updateCall = builderCalls.find((c) => c.method === 'update');
      expect(updateCall).toBeDefined();
      const updateArg = updateCall!.args[0] as Record<string, unknown>;
      expect(updateArg.revoked).toBe(true);
      expect(typeof updateArg.revoked_at).toBe('string');

      const eqCalls = builderCalls.filter((c) => c.method === 'eq');
      expect(eqCalls).toHaveLength(3);
      expect(eqCalls[0]!.args).toEqual(['id', TOKEN_ID]);
      expect(eqCalls[1]!.args).toEqual(['account_id', ACCOUNT_ID]);
      expect(eqCalls[2]!.args).toEqual(['revoked', false]);

      expect(result?.revoked).toBe(true);
    });

    it('returns null when no row matched (already-revoked or unknown id)', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserTokenRepository(client);

      const result = await repo.revoke(TOKEN_ID, ACCOUNT_ID);
      expect(result).toBeNull();
    });

    it('throws on a real DB error', async () => {
      const { client } = makeClient({
        data: null,
        error: { message: 'connection lost' },
      });
      const repo = new SupabaseUserTokenRepository(client);

      await expect(repo.revoke(TOKEN_ID, ACCOUNT_ID)).rejects.toThrow(
        /connection lost/,
      );
    });
  });

  describe('unsupported base-port methods', () => {
    it('findAll throws (cross-account leak guard)', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserTokenRepository(client);
      await expect(repo.findAll()).rejects.toThrow(/findAll is not supported/);
    });

    it('findBySlug throws', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserTokenRepository(client);
      await expect(repo.findBySlug()).rejects.toThrow(
        /findBySlug is not supported/,
      );
    });

    it('update throws', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserTokenRepository(client);
      await expect(repo.update()).rejects.toThrow(/update is not supported/);
    });

    it('delete throws', async () => {
      const { client } = makeClient({ data: null, error: null });
      const repo = new SupabaseUserTokenRepository(client);
      await expect(repo.delete()).rejects.toThrow(/delete is not supported/);
    });
  });
});
