import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import {
  CreateDatabaseService,
  DeleteDatabaseService,
  GetDatabaseService,
  ListDatabasesService,
  UpdateDatabaseService,
} from '@guepard/domain/services';
import type { Repositories } from '@guepard/domain/repositories';
import { handleDomainException } from '../lib/http-utils';

const idParamSchema = z.object({ id: z.string().min(1) });

const DEPLOYMENT_TYPES = ['repository', 'shadow', 'f2'] as const;
const DATABASE_STATUSES = [
  'init',
  'pending',
  'in_progress',
  'created',
  'error',
  'deleted',
] as const;

const createBodySchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  version: z.string().min(1),
  fqdn: z.string().min(1),
  deploymentType: z.enum(DEPLOYMENT_TYPES).optional(),
  port: z.number().optional(),
  nodeId: z.string().optional(),
  dbUserId: z.string().optional(),
});

const updateBodySchema = z.object({
  status: z.enum(DATABASE_STATUSES).optional(),
  nodeId: z.string().nullable().optional(),
  port: z.number().optional(),
});

export function createDatabasesRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', async (c) => {
    try {
      const repos = await getRepositories(c);
      const useCase = new ListDatabasesService(repos.database);
      const result = await useCase.execute({});
      return c.json(result);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new GetDatabaseService(repos.database);
      const db = await useCase.execute(id);
      return c.json(db);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', createBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = c.req.valid('json');
      const useCase = new CreateDatabaseService(repos.database);
      const db = await useCase.execute(body);
      return c.json(db, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.patch(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateBodySchema),
    async (c) => {
      try {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const repos = await getRepositories(c);
        const useCase = new UpdateDatabaseService(repos.database);
        const db = await useCase.execute({ ...body, id });
        return c.json(db);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new DeleteDatabaseService(repos.database);
      await useCase.execute(id);
      return new Response(null, { status: 204 });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
