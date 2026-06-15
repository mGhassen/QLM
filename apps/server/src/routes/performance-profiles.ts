import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import type { Repositories } from '@guepard/domain/repositories';
import { handleDomainException } from '../lib/http-utils';

const listQuerySchema = z.object({ accountId: z.string().optional() });
const idParamSchema = z.object({ id: z.string().min(1) });

export function createPerformanceProfilesRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', listQuerySchema), async (c) => {
    try {
      const { accountId } = c.req.valid('query');
      const repos = await getRepositories(c);
      const profiles = accountId
        ? await repos.performanceProfile.findByAccountId(accountId)
        : await repos.performanceProfile.findPublicCatalog();
      return c.json(profiles);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const profile = await repos.performanceProfile.findById(id);
      if (!profile) {
        return c.json({ error: 'Performance profile not found' }, 404);
      }
      return c.json(profile);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
