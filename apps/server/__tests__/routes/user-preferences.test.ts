import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { createUserPreferencesRoutes } from '../../src/routes/user-preferences.js';
import { createRateLimiter } from '../../src/lib/rate-limiter.js';
import { createMockRepositories } from '../helpers/mock-repositories';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const ORG_A = '33333333-3333-4333-8333-333333333333';
const ORG_B = '44444444-4444-4444-8444-444444444444';
const PROJECT_A = '55555555-5555-4555-8555-555555555555';
const PROJECT_B = '66666666-6666-4666-8666-666666666666';

/**
 * Mount only the user-preferences route on a minimal Hono app. Avoids
 * `createApp()` which pulls in the chat route's `@mlc-ai/web-llm` import and
 * explodes under vitest.
 */
function makeTestApp() {
  const repos = createMockRepositories();
  const app = new Hono();
  app.route(
    '/me/preferences',
    createUserPreferencesRoutes(
      async () => repos,
      async (c) => c.req.header('x-test-user-id') ?? null,
      {
        rateLimiter: createRateLimiter({ windowMs: 60_000, max: 1_000 }),
      },
    ),
  );
  return { app, repos };
}

describe('Server API – /me/preferences', () => {
  describe('GET', () => {
    it('returns empty preferences with created/updated null when no row exists', async () => {
      const { app } = makeTestApp();
      const res = await app.request('http://localhost/me/preferences', {
        headers: { 'x-test-user-id': USER_ID },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        user_id: string;
        preferences: Record<string, unknown>;
        created_at: string | null;
        updated_at: string | null;
      };
      expect(body.user_id).toBe(USER_ID);
      expect(body.preferences).toEqual({});
      expect(body.created_at).toBeNull();
      expect(body.updated_at).toBeNull();
    });

    it('returns the stored row when one exists', async () => {
      const { app } = makeTestApp();
      await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-test-user-id': USER_ID,
        },
        body: JSON.stringify({ last_project_by_org: { [ORG_A]: PROJECT_A } }),
      });

      const res = await app.request('http://localhost/me/preferences', {
        headers: { 'x-test-user-id': USER_ID },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        user_id: string;
        preferences: { last_project_by_org: Record<string, string> };
      };
      expect(body.user_id).toBe(USER_ID);
      expect(body.preferences.last_project_by_org).toEqual({
        [ORG_A]: PROJECT_A,
      });
    });

    it('returns 401 without a session header', async () => {
      const { app } = makeTestApp();
      const res = await app.request('http://localhost/me/preferences');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH', () => {
    it('merges into existing preferences preserving sibling top-level keys', async () => {
      // jsonb `||` is shallow: top-level keys from the patch replace matching
      // keys in the row, but keys present only in the row are preserved.
      // Callers that mutate a nested map (e.g. add one org to
      // last_project_by_org) must submit the full merged map themselves.
      const { app } = makeTestApp();

      const first = await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-test-user-id': USER_ID,
        },
        body: JSON.stringify({
          last_project_by_org: { [ORG_A]: PROJECT_A },
          experimental_future_key: 'sentinel',
        }),
      });
      expect(first.status).toBe(200);

      const second = await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-test-user-id': USER_ID,
        },
        body: JSON.stringify({
          last_project_by_org: { [ORG_A]: PROJECT_A, [ORG_B]: PROJECT_B },
        }),
      });
      expect(second.status).toBe(200);

      const res = await app.request('http://localhost/me/preferences', {
        headers: { 'x-test-user-id': USER_ID },
      });
      const body = (await res.json()) as {
        preferences: {
          last_project_by_org: Record<string, string>;
          experimental_future_key?: string;
        };
      };
      expect(body.preferences.last_project_by_org).toEqual({
        [ORG_A]: PROJECT_A,
        [ORG_B]: PROJECT_B,
      });
      expect(body.preferences.experimental_future_key).toBe('sentinel');
    });

    it('does not leak one user row into another', async () => {
      const { app } = makeTestApp();
      await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-test-user-id': USER_ID,
        },
        body: JSON.stringify({ last_project_by_org: { [ORG_A]: PROJECT_A } }),
      });

      const res = await app.request('http://localhost/me/preferences', {
        headers: { 'x-test-user-id': OTHER_USER_ID },
      });
      const body = (await res.json()) as {
        preferences: Record<string, unknown>;
      };
      expect(body.preferences).toEqual({});
    });

    it('returns 400 when last_project_by_org values are not valid UUIDs', async () => {
      const { app } = makeTestApp();
      const res = await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-test-user-id': USER_ID,
        },
        body: JSON.stringify({
          last_project_by_org: { [ORG_A]: 'not-a-uuid' },
        }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 without a session header', async () => {
      const { app } = makeTestApp();
      const res = await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });

    it('returns 429 with Retry-After once the rate limit is exceeded', async () => {
      const repos = createMockRepositories();
      const app = new Hono();
      app.route(
        '/me/preferences',
        createUserPreferencesRoutes(
          async () => repos,
          async (c) => c.req.header('x-test-user-id') ?? null,
          { rateLimiter: createRateLimiter({ windowMs: 60_000, max: 2 }) },
        ),
      );

      const body = JSON.stringify({
        last_project_by_org: { [ORG_A]: PROJECT_A },
      });
      const headers = {
        'content-type': 'application/json',
        'x-test-user-id': USER_ID,
      };

      for (let i = 0; i < 2; i++) {
        const res = await app.request('http://localhost/me/preferences', {
          method: 'PATCH',
          headers,
          body,
        });
        expect(res.status).toBe(200);
      }

      const limited = await app.request('http://localhost/me/preferences', {
        method: 'PATCH',
        headers,
        body,
      });
      expect(limited.status).toBe(429);
      expect(limited.headers.get('retry-after')).not.toBeNull();
    });
  });
});
