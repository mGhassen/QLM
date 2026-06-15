import { zValidator } from '../lib/zod-validator.js';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import {
  BulkDeleteNodesService,
  CreateNodeService,
  DeleteNodeService,
  DrainCancelNodeService,
  DrainNodeService,
  GetNodeMetricsService,
  GetNodeService,
  ListNodesByProjectService,
  SetNodeEligibilityService,
  SetNodeLifecycleService,
  UpdateNodeService,
} from '@qlm/domain/services';
import type { Repositories } from '@qlm/domain/repositories';
import type {
  ListNodesInput,
  NodeSort,
  NodeSortKey,
} from '@qlm/domain/usecases';
import {
  NODE_ELIGIBILITY_STATES,
  NODE_LIFECYCLE_STATES,
  NodeDrainSchema,
} from '@qlm/domain/entities';
import type {
  NodeEligibility,
  NodeLifecycleState,
  NodeProvider,
  NodeRegion,
} from '@qlm/domain/entities';
import { handleDomainException, parseLimit } from '../lib/http-utils';

const setLifecycleSchema = z.object({
  lifecycle: z.enum(NODE_LIFECYCLE_STATES),
  expectedVersion: z.number().int().nonnegative(),
});

const setEligibilitySchema = z.object({
  eligibility: z.enum(NODE_ELIGIBILITY_STATES),
  expectedVersion: z.number().int().nonnegative(),
});

const drainStartSchema = z.object({
  drain: NodeDrainSchema,
  expectedVersion: z.number().int().nonnegative(),
  setIneligibleOnStart: z.boolean().optional(),
});

const drainCancelSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  keepIneligible: z.boolean().optional(),
});

export function createNodesRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  // GET /api/nodes?projectId=<id>&cursor=&limit=&search=&lifecycle[]=&eligibility[]=&region[]=&provider[]=&sortKey=&sortDir=
  app.get('/', async (c) => {
    try {
      const repos = await getRepositories(c);
      const projectId = c.req.query('projectId');
      if (!projectId) {
        return c.json({ error: 'projectId is required' }, 400);
      }

      // Resolve project → organizationId (nodes are org-scoped)
      const project = await repos.project.findById(projectId);
      if (!project) {
        return c.json({ error: 'Project not found' }, 404);
      }
      const organizationId = project.organizationId;

      const input: ListNodesInput = {
        projectId: organizationId, // passed as org ID to the repository
        cursor: c.req.query('cursor') ?? null,
        limit: parseLimit(c.req.query('limit') ?? null, 1, 200) ?? 50,
        search: c.req.query('search') ?? undefined,
        lifecycle: c.req.queries('lifecycle') as
          | NodeLifecycleState[]
          | undefined,
        eligibility: c.req.queries('eligibility') as
          | NodeEligibility[]
          | undefined,
        region: c.req.queries('region') as NodeRegion[] | undefined,
        provider: c.req.queries('provider') as NodeProvider[] | undefined,
      };

      const sortKey = c.req.query('sortKey') as NodeSortKey | undefined;
      const sortDir = c.req.query('sortDir') as 'asc' | 'desc' | undefined;
      if (sortKey) {
        input.sort = {
          key: sortKey,
          direction: sortDir ?? 'asc',
        } satisfies NodeSort;
      }

      const useCase = new ListNodesByProjectService(repos.node);
      const result = await useCase.execute(input);
      return c.json(result);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // GET /api/nodes/:id
  app.get('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const useCase = new GetNodeService(repos.node);
      const node = await useCase.execute(id);
      return c.json(node);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // GET /api/nodes/:id/metrics?range=24h
  app.get('/:id/metrics', async (c) => {
    try {
      const id = c.req.param('id');
      const range = (c.req.query('range') ?? '24h') as '24h' | '7d';
      const repos = await getRepositories(c);
      const useCase = new GetNodeMetricsService(repos.node);
      const metrics = await useCase.execute({ id, range });
      return c.json(metrics);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/nodes
  app.post('/', async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = await c.req.json();

      // Resolve projectId → organizationId for create
      const projectId = body.projectId as string | undefined;
      if (projectId) {
        const project = await repos.project.findById(projectId);
        if (project) {
          body.projectId = project.organizationId;
        }
      }

      const useCase = new CreateNodeService(repos.node);
      const node = await useCase.execute(body);
      return c.json(node, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // PATCH /api/nodes/:id
  app.patch('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const body = await c.req.json();
      const useCase = new UpdateNodeService(repos.node);
      const node = await useCase.execute({ ...body, id });
      return c.json(node);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // DELETE /api/nodes/:id
  app.delete('/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const useCase = new DeleteNodeService(repos.node);
      await useCase.execute(id);
      return new Response(null, { status: 204 });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/nodes/bulk-delete
  app.post('/bulk-delete', async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = (await c.req.json()) as { ids: string[] };
      const useCase = new BulkDeleteNodesService(repos.node);
      const result = await useCase.execute({ ids: body.ids ?? [] });
      return c.json(result);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // ─── RFC 0026 5-axis state mutations ─────────────────────────────────────

  // POST /api/nodes/:id/lifecycle
  app.post(
    '/:id/lifecycle',
    zValidator('json', setLifecycleSchema),
    async (c) => {
      try {
        const id = c.req.param('id');
        const repos = await getRepositories(c);
        const body = c.req.valid('json');
        const useCase = new SetNodeLifecycleService(repos.node);
        const node = await useCase.execute({
          id,
          lifecycle: body.lifecycle,
          expectedVersion: body.expectedVersion,
        });
        return c.json(node);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // POST /api/nodes/:id/eligibility
  app.post(
    '/:id/eligibility',
    zValidator('json', setEligibilitySchema),
    async (c) => {
      try {
        const id = c.req.param('id');
        const repos = await getRepositories(c);
        const body = c.req.valid('json');
        const useCase = new SetNodeEligibilityService(repos.node);
        const node = await useCase.execute({
          id,
          eligibility: body.eligibility,
          expectedVersion: body.expectedVersion,
        });
        return c.json(node);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  // POST /api/nodes/:id/drain
  app.post('/:id/drain', zValidator('json', drainStartSchema), async (c) => {
    try {
      const id = c.req.param('id');
      const repos = await getRepositories(c);
      const body = c.req.valid('json');
      const useCase = new DrainNodeService(repos.node);
      const node = await useCase.execute({
        id,
        deadline: body.drain.deadline,
        ignoreSystemJobs: body.drain.ignoreSystemJobs,
        force: body.drain.force,
        setIneligibleOnStart: body.setIneligibleOnStart,
        expectedVersion: body.expectedVersion,
      });
      return c.json(node);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  // POST /api/nodes/:id/drain/cancel
  app.post(
    '/:id/drain/cancel',
    zValidator('json', drainCancelSchema),
    async (c) => {
      try {
        const id = c.req.param('id');
        const repos = await getRepositories(c);
        const body = c.req.valid('json');
        const useCase = new DrainCancelNodeService(repos.node);
        const node = await useCase.execute({
          id,
          keepIneligible: body.keepIneligible,
          expectedVersion: body.expectedVersion,
        });
        return c.json(node);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  return app;
}
