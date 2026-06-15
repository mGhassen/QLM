import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import type { TeamMember } from '@guepard/domain/entities';
import {
  CreateOrganizationService,
  DeleteOrganizationService,
  GetOrganizationBySlugService,
  GetOrganizationService,
  GetOrganizationsService,
  GetTeamMembersService,
  RemoveTeamMemberService,
  UpdateOrganizationService,
  UpdateTeamMemberRoleService,
} from '@guepard/domain/services';
import type { Repositories } from '@guepard/domain/repositories';
import {
  handleDomainException,
  parseLimit,
  parsePositiveInt,
  isUUID,
} from '../lib/http-utils';

const listQuerySchema = z.object({
  q: z.string().optional(),
  offset: z.string().optional(),
  limit: z.string().optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });
const slugParamSchema = z.object({ slug: z.string().min(1) });
const memberParamsSchema = z.object({
  slug: z.string().min(1),
  userId: z.string().uuid(),
});

const createBodySchema = z.object({
  name: z.string().min(1),
  userId: z.string().min(1),
  createdBy: z.string().min(1),
});

const updateBodySchema = z.object({
  name: z.string().optional(),
  userId: z.string().optional(),
  hideSidebar: z.boolean().optional(),
  updatedBy: z.string().optional(),
});

const bulkBodySchema = z.object({
  operation: z.enum(['delete', 'export']),
  ids: z.array(z.string()).min(1),
});

const memberRoleBodySchema = z.object({
  role: z.string().trim().min(1),
});

function serializeMemberForWeb(m: TeamMember) {
  return {
    id: m.id,
    user_id: m.userId,
    organization_id: m.accountId,
    role: m.role,
    role_hierarchy_level: m.roleHierarchyLevel,
    organization_user_id: m.primaryOwnerUserId,
    name: m.name,
    email: m.email,
    picture_url: m.pictureUrl,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}

export function createOrganizationsRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', listQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const queryParams = c.req.valid('query');
      const q = (queryParams.q ?? '').trim().toLowerCase();
      const offset = parsePositiveInt(queryParams.offset ?? null, 0) ?? 0;
      const limit = parseLimit(queryParams.limit ?? null, 0, 200);

      const useCase = new GetOrganizationsService(repos.organization);
      const organizations = await useCase.execute();

      const filtered = q
        ? organizations.filter((org) => {
            const name = org.name?.toLowerCase() ?? '';
            const slug = org.slug?.toLowerCase() ?? '';
            return name.includes(q) || slug.includes(q);
          })
        : organizations;

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
      const useCase = new CreateOrganizationService(repos.organization);
      const organization = await useCase.execute(body);
      return c.json(organization, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/search', zValidator('query', listQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const queryParams = c.req.valid('query');
      const q = (queryParams.q ?? '').trim().toLowerCase();
      const limit = parseLimit(queryParams.limit ?? null, 10, 50);
      const offset = parsePositiveInt(queryParams.offset ?? null, 0) ?? 0;

      const useCase = new GetOrganizationsService(repos.organization);
      const organizations = await useCase.execute();

      const filtered = q
        ? organizations.filter((org) => {
            const name = org.name?.toLowerCase() ?? '';
            const slug = org.slug?.toLowerCase() ?? '';
            return name.includes(q) || slug.includes(q);
          })
        : organizations;

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
        const useCase = new DeleteOrganizationService(repos.organization);
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

      const useCase = new GetOrganizationService(repos.organization);
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
        ? new GetOrganizationService(repos.organization)
        : new GetOrganizationBySlugService(repos.organization);
      const organization = await useCase.execute(id);
      return c.json(organization);
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
        const useCase = new UpdateOrganizationService(repos.organization);
        const organization = await useCase.execute({ ...body, id });
        return c.json(organization);
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  app.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    try {
      const { id } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new DeleteOrganizationService(repos.organization);
      await useCase.execute(id);
      return c.json({ success: true });
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.get('/:slug/members', zValidator('param', slugParamSchema), async (c) => {
    try {
      const { slug } = c.req.valid('param');
      const repos = await getRepositories(c);
      const useCase = new GetTeamMembersService(repos.teamMember);
      const members = await useCase.execute({ organizationSlug: slug });
      return c.json(members.map(serializeMemberForWeb));
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.patch(
    '/:slug/members/:userId/role',
    zValidator('param', memberParamsSchema),
    zValidator('json', memberRoleBodySchema),
    async (c) => {
      try {
        const { slug, userId } = c.req.valid('param');
        const { role } = c.req.valid('json');
        const repos = await getRepositories(c);
        const useCase = new UpdateTeamMemberRoleService(repos.teamMember);
        const member = await useCase.execute({
          organizationSlug: slug,
          userId,
          role: role.trim(),
        });
        return c.json(serializeMemberForWeb(member));
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  app.delete(
    '/:slug/members/:userId',
    zValidator('param', memberParamsSchema),
    async (c) => {
      try {
        const { slug, userId } = c.req.valid('param');
        const repos = await getRepositories(c);
        const useCase = new RemoveTeamMemberService(repos.teamMember);
        await useCase.execute({ organizationSlug: slug, userId });
        return c.json({ success: true });
      } catch (error) {
        return handleDomainException(error);
      }
    },
  );

  return app;
}
