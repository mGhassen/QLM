import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

import { createTestApp, cleanupTestDir } from './helpers/setup';

describe('Server API – Datasources', () => {
  let app: Hono;
  let testDir: string;

  beforeAll(async () => {
    const out = await createTestApp();
    app = out.app;
    testDir = out.testDir;
  });

  afterAll(async () => {
    await cleanupTestDir(testDir);
  });

  describe('Datasources', () => {
    it('GET /api/datasources without projectId returns 400', async () => {
      const res = await app.request('http://localhost/api/datasources');
      expect(res.status).toBe(400);
      // zValidator returns Zod's `{success:false, error:{issues:[...]}}`
      // shape rather than `{error: 'message...'}`. Stringify and assert
      // the missing field is named anywhere in the response.
      expect(JSON.stringify(await res.json())).toContain('projectId');
    });
  });
});
