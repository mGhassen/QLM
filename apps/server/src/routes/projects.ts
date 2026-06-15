import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import { ProjectOutput } from '@qlm/domain/usecases';
import {
  CreateProjectService,
  DeleteProjectService,
  GetProjectBySlugService,
  GetProjectService,
  GetProjectsByOrganizationIdService,
  UpdateProjectService,
} from '@qlm/domain/services';
import type { Repositories } from '@qlm/domain/repositories';
import {
  handleDomainException,
  parseLimit,
  parsePositiveInt,
  isUUID,
} from '../lib/http-utils';

const listQuerySchema = z.object({
  orgId: z.string().min(1),
  q: z.string().optional(),
  offset: z.string().optional(),
  limit: z.string().optional(),
});

const searchQuerySchema = z.object({
  q: z.string().optional(),
  orgId: z.string().optional(),
  offset: z.string().optional(),
  limit: z.string().optional(),
});

const createBodySchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  createdBy: z.string().min(1),
});

const updateBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  updatedBy: z.string().optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

const bulkBodySchema = z.object({
  operation: z.enum(['delete', 'export']),
  ids: z.array(z.string()).min(1),
});

export function createProjectsRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', listQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const queryParams = c.req.valid('query');
      const orgId = queryParams.orgId;
      const q = (queryParams.q ?? '').trim().toLowerCase();
      const offset = parsePositiveInt(queryParams.offset ?? null, 0) ?? 0;
      const limit = parseLimit(queryParams.limit ?? null, 0, 200);

      const useCase = new GetProjectsByOrganizationIdService(repos.project);
      const projects = await useCase.execute(orgId);

      const filtered = q
        ? projects.filter((project) => {
            const name = project.name?.toLowerCase() ?? '';
            const slug = project.slug?.toLowerCase() ?? '';
            const description = project.description?.toLowerCase() ?? '';
            return (
              name.includes(q) || slug.includes(q) || description.includes(q)
            );
          })
        : projects;

      const paginated =
        limit > 0
          ? filtered.slice(offset, offset + limit)
          : filtered.slice(offset);

      return c.json(paginated);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', createBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = c.req.valid('json');
      const useCase = new CreateProjectService(repos.project);
      const project = await useCase.execute(body);
      return c.json(project, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/search', zValidator('query', searchQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const queryParams = c.req.valid('query');
      const q = (queryParams.q ?? '').trim().toLowerCase();
      const orgId = (queryParams.orgId ?? '').trim();
      const limit = parseLimit(queryParams.limit ?? null, 10, 50);
      const offset = parsePositiveInt(queryParams.offset ?? null, 0) ?? 0;

      const projects = orgId
        ? await new GetProjectsByOrganizationIdService(repos.project).execute(
            orgId,
          )
        : (await repos.project.findAll()).map((p) => ProjectOutput.new(p));

      const filtered = q
        ? projects.filter((project) => {
            const name = project.name?.toLowerCase() ?? '';
            const slug = project.slug?.toLowerCase() ?? '';
            const description = project.description?.toLowerCase() ?? '';
            return (
              name.includes(q) || slug.includes(q) || description.includes(q)
            );
          })
        : projects;

      return c.json({
        results: filtered.slice(offset, offset + limit),
        total: filtered.length,
      });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/bulk', zValidator('json', bulkBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = c.req.valid('json');

      const ids = body.ids.map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return c.json({ error: 'ids cannot be empty' }, 400);
      }

      if (body.operation === 'delete') {
        const useCase = new DeleteProjectService(repos.project);
        const results = await Promise.allSettled(
          ids.map((id) => useCase.execute(id)),
        );
        const deletedCount = results.filter(
          (r) => r.status === 'fulfilled',
        ).length;
        const failedIds = results
          .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
          .filter((id): id is string => id !== null);
        return c.json({
          success: deletedCount > 0,
          deletedCount,
          failedIds: failedIds.length > 0 ? failedIds : undefined,
        });
      }

      const useCase = new GetProjectService(repos.project);
      const results = await Promise.allSettled(
        ids.map((id) => useCase.execute(id)),
      );
      const items = results
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<
            Awaited<ReturnType<typeof useCase.execute>>
          > => r.status === 'fulfilled',
        )
        .map((r) => r.value);
      return c.json({ success: true, items });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = isUUID(id)
        ? new GetProjectService(repos.project)
        : new GetProjectBySlugService(repos.project);
      const project = await useCase.execute(id);
      return c.json(project);
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
        const useCase = new UpdateProjectService(repos.project);
        const project = await useCase.execute({ ...body, id });
        return c.json(project);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new DeleteProjectService(repos.project);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
