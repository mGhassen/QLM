import { zValidator } from '../lib/zod-validator.js';
import { Hono } from 'hono';
import type { Context } from 'hono';

import type { Repositories } from '@qlm/domain/repositories';
import {
  CreateUserTokenService,
  ListUserTokensService,
  RevokeUserTokenService,
} from '@qlm/domain/services';
import { CreateUserTokenInputSchema } from '@qlm/domain/usecases';

import { getCurrentAccountId } from '../lib/current-account';
import { handleDomainException } from '../lib/http-utils';
import { getJwtSecret } from '../lib/repositories';

/**
 * Hono route factory for the three session-gated user-token endpoints.
 *
 * Auth model: every route resolves `accountId` from the request's bearer
 * token via `getCurrentAccountIdResolver` (defaults to the prod helper).
 * No `accountId` ever appears in a request body or query — the server is
 * the sole source of truth.
 *
 * Tests inject a custom resolver to bypass the supabase round-trip:
 *   `createApp({ getRepositories, getCurrentAccountId: () => 'acc-id' })`.
 */
export function createUserTokensRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
  getCurrentAccountIdResolver: (
    c: Context,
  ) => Promise<string | null> = getCurrentAccountId,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const accountId = await getCurrentAccountIdResolver(c);
      if (!accountId) return c.json({ error: 'Unauthorized' }, 401);

      const repos = await getRepositories(c);
      const useCase = new ListUserTokensService(repos.userToken);
      const rows = await useCase.execute({ accountId });
      return c.json(rows);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', CreateUserTokenInputSchema), async (c) => {
    try {
      const accountId = await getCurrentAccountIdResolver(c);
      if (!accountId) return c.json({ error: 'Unauthorized' }, 401);

      const repos = await getRepositories(c);
      const input = c.req.valid('json');
      const useCase = new CreateUserTokenService(
        repos.userToken,
        repos.jwtSigner,
        getJwtSecret(),
      );
      const result = await useCase.execute({ accountId, ...input });
      return c.json(result, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/:id/revoke', async (c) => {
    try {
      const accountId = await getCurrentAccountIdResolver(c);
      if (!accountId) return c.json({ error: 'Unauthorized' }, 401);

      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Not found' }, 404);

      const repos = await getRepositories(c);
      const useCase = new RevokeUserTokenService(repos.userToken);
      const row = await useCase.execute({ id, accountId });
      return c.json(row);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
