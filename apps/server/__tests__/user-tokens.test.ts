import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { createUserTokensRoutes } from '../src/routes/user-tokens.js';
import { createMockRepositories } from './helpers/mock-repositories';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_ACCOUNT_ID = '00000000-0000-4000-8000-000000000002';
const ONE_HOUR_SECONDS = 3600;
const ONE_YEAR_SECONDS = 365 * 86_400;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Build a fresh app + mock-repos pair for each test so state doesn't bleed
 * across tests. We mount only the user-tokens route — sidesteps the chat
 * route's `@mlc-ai/web-llm` ESM import that breaks the broader `createApp`
 * in the test runner today.
 */
function makeTestApp() {
  const repos = createMockRepositories();
  const app = new Hono();
  // The route reads `JWT_SECRET` via `getJwtSecret()`; set it once before
  // any route handler resolves it.
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ??
    'qlm-test-jwt-secret-with-enough-bits-to-sign-HS256';
  app.route(
    '/user-tokens',
    createUserTokensRoutes(
      async () => repos,
      async (c) => c.req.header('x-test-account-id') ?? null,
    ),
  );
  return { app, repos };
}

describe('Server API – user-tokens', () => {
  let app: Hono;

  beforeAll(() => {
    const out = makeTestApp();
    app = out.app;
  });

  afterAll(() => {
    /* nothing to cleanup */
  });

  describe('POST /user-tokens', () => {
    it('creates a token and returns { row, rawJwt }', async () => {
      const { app: localApp } = makeTestApp();
      const res = await localApp.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-account-id': ACCOUNT_ID,
        },
        body: JSON.stringify({
          token_name: 'CI deploy token',
          scopes: ['read', 'write'],
          expires_at: nowSeconds() + 30 * 86_400,
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        row: {
          id: string;
          account_id: string;
          token_name: string;
          scopes: string[];
          revoked: boolean;
          revoked_at: string | null;
        };
        rawJwt: string;
      };
      expect(body.row.account_id).toBe(ACCOUNT_ID);
      expect(body.row.token_name).toBe('CI deploy token');
      expect(body.row.scopes).toEqual(['read', 'write']);
      expect(body.row.revoked).toBe(false);
      expect(body.row.revoked_at).toBeNull();
      expect(body.rawJwt).toBe(`mock.jwt.${body.row.id}`);
    });

    it('returns 401 with no session header', async () => {
      const res = await app.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token_name: 't',
          scopes: ['read'],
          expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        }),
      });
      expect(res.status).toBe(401);
    });

    it.each([
      ['empty token_name', { token_name: '', scopes: ['read'] }],
      ['empty scopes', { token_name: 't', scopes: [] }],
      [
        'past expires_at',
        {
          token_name: 't',
          scopes: ['read'],
          expires_at: nowSeconds() - 1,
        },
      ],
      [
        'expires_at beyond 365 days',
        {
          token_name: 't',
          scopes: ['read'],
          expires_at: nowSeconds() + ONE_YEAR_SECONDS + 100,
        },
      ],
    ])('returns 400 for %s', async (_label, partial) => {
      const body = {
        token_name: 't',
        scopes: ['read'],
        expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        ...partial,
      };
      const res = await app.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-account-id': ACCOUNT_ID,
        },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /user-tokens', () => {
    it('returns only rows owned by the requesting account', async () => {
      const { app: localApp } = makeTestApp();

      // Seed a row for ACCOUNT_ID.
      await localApp.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-account-id': ACCOUNT_ID,
        },
        body: JSON.stringify({
          token_name: 'mine',
          scopes: ['read'],
          expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        }),
      });
      // Seed a row for the OTHER account.
      await localApp.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-account-id': OTHER_ACCOUNT_ID,
        },
        body: JSON.stringify({
          token_name: 'theirs',
          scopes: ['admin'],
          expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        }),
      });

      const res = await localApp.request('http://localhost/user-tokens', {
        headers: { 'x-test-account-id': ACCOUNT_ID },
      });
      expect(res.status).toBe(200);
      const rows = (await res.json()) as Array<{
        account_id: string;
        token_name: string;
      }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]!.account_id).toBe(ACCOUNT_ID);
      expect(rows[0]!.token_name).toBe('mine');
    });

    it('returns 401 with no session header', async () => {
      const res = await app.request('http://localhost/user-tokens');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /user-tokens/:id/revoke', () => {
    it('flips revoked + revoked_at on success', async () => {
      const { app: localApp } = makeTestApp();
      const create = await localApp.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-account-id': ACCOUNT_ID,
        },
        body: JSON.stringify({
          token_name: 'to revoke',
          scopes: ['read'],
          expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        }),
      });
      const created = (await create.json()) as { row: { id: string } };

      const res = await localApp.request(
        `http://localhost/user-tokens/${created.row.id}/revoke`,
        {
          method: 'POST',
          headers: { 'x-test-account-id': ACCOUNT_ID },
        },
      );
      expect(res.status).toBe(200);
      const row = (await res.json()) as {
        revoked: boolean;
        revoked_at: string | null;
      };
      expect(row.revoked).toBe(true);
      expect(typeof row.revoked_at).toBe('string');
    });

    it('returns 404 for unknown id', async () => {
      const { app: localApp } = makeTestApp();
      const res = await localApp.request(
        'http://localhost/user-tokens/99999999-9999-4999-9999-999999999999/revoke',
        {
          method: 'POST',
          headers: { 'x-test-account-id': ACCOUNT_ID },
        },
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as { code: number };
      expect(body.code).toBe(3000);
    });

    it('returns 404 on a second revoke of the same id (already-revoked folded into not-found in phase 1)', async () => {
      const { app: localApp } = makeTestApp();
      const create = await localApp.request('http://localhost/user-tokens', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-test-account-id': ACCOUNT_ID,
        },
        body: JSON.stringify({
          token_name: 'double revoke',
          scopes: ['read'],
          expires_at: nowSeconds() + ONE_HOUR_SECONDS,
        }),
      });
      const created = (await create.json()) as { row: { id: string } };

      const first = await localApp.request(
        `http://localhost/user-tokens/${created.row.id}/revoke`,
        {
          method: 'POST',
          headers: { 'x-test-account-id': ACCOUNT_ID },
        },
      );
      expect(first.status).toBe(200);

      const second = await localApp.request(
        `http://localhost/user-tokens/${created.row.id}/revoke`,
        {
          method: 'POST',
          headers: { 'x-test-account-id': ACCOUNT_ID },
        },
      );
      expect(second.status).toBe(404);
    });

    it('returns 401 with no session header', async () => {
      const res = await app.request(
        'http://localhost/user-tokens/00000000-0000-4000-8000-000000000099/revoke',
        { method: 'POST' },
      );
      expect(res.status).toBe(401);
    });
  });
});
