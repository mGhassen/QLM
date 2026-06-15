import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import {
  CreateDatasourceService,
  DeleteDatasourceService,
  GetDatasourceBySlugService,
  GetDatasourceService,
  UpdateDatasourceService,
} from '@guepard/domain/services';
import type { Repositories } from '@guepard/domain/repositories';
import { handleDomainException, isUUID } from '../lib/http-utils';

const listQuerySchema = z.object({ projectId: z.string().min(1) });
const idParamSchema = z.object({ id: z.string().min(1) });

const createBodySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  datasource_provider: z.string().min(1),
  datasource_driver: z.string().min(1),
  datasource_kind: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
  createdBy: z.string().min(1),
});

const updateBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  datasource_provider: z.string().optional(),
  datasource_driver: z.string().optional(),
  datasource_kind: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  updatedBy: z.string().optional(),
});

export function createDatasourcesRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', listQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const { projectId } = c.req.valid('query');
      const datasources = await repos.datasource.findByProjectId(projectId);
      return c.json(datasources ?? []);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = isUUID(id)
        ? new GetDatasourceService(repos.datasource)
        : new GetDatasourceBySlugService(repos.datasource);
      const datasource = await useCase.execute(id);
      return c.json(datasource);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', createBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = c.req.valid('json');
      const useCase = new CreateDatasourceService(repos.datasource);
      const datasource = await useCase.execute(body);
      return c.json(datasource, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.put(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateBodySchema),
    async (c) => {
      try {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        const repos = await getRepositories(c);
        const useCase = new UpdateDatasourceService(repos.datasource);
        const datasource = await useCase.execute({ ...body, id });
        return c.json(datasource);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new DeleteDatasourceService(repos.datasource);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
