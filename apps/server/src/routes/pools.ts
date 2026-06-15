import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';

import type { Repositories } from '@qlm/domain/repositories';
import { ListPoolsByProjectService } from '@qlm/domain/services';

import { handleDomainException } from '../lib/http-utils';

const poolsQuerySchema = z.object({ projectId: z.string().min(1) });

/**
 * GET /api/pools?projectId=<id>
 *
 * Returns the list of compute pools that aggregate the project's nodes.
 * `projectId` is resolved to its owning organization id (nodes are
 * org-scoped); the pool repository finds pools by org.
 */
export function createPoolsRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', poolsQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const { projectId } = c.req.valid('query');

      const project = await repos.project.findById(projectId);
      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }

      const result = await new ListPoolsByProjectService(repos.pool).execute({
        projectId: project.organizationId,
      });

      return c.json(result, 200);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
