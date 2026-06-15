import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import { InitWorkspaceService } from '@qlm/domain/services';
import { WorkspaceRuntimeEnum } from '@qlm/domain/enums';
import type { Repositories } from '@qlm/domain/repositories';
import type { WorkspaceRuntimeUseCase } from '@qlm/domain/usecases';
import { handleDomainException } from '../lib/http-utils';

const initBodySchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  mode: z.string().optional(),
  runtime: z.nativeEnum(WorkspaceRuntimeEnum).optional(),
});

export function createInitRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.post('/', zValidator('json', initBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const body = c.req.valid('json');

      const workspaceInput = {
        userId: body.userId ?? '',
        organizationId: body.organizationId,
        projectId: body.projectId,
        mode: body.mode,
      };

      const runtime = body.runtime ?? WorkspaceRuntimeEnum.BROWSER;

      const workspaceRuntimeUseCase: WorkspaceRuntimeUseCase = {
        execute: async () => runtime,
      };

      const initWorkspaceService = new InitWorkspaceService(
        repos.user,
        workspaceRuntimeUseCase,
        repos.organization,
        repos.project,
      );

      const workspace = await initWorkspaceService.execute(workspaceInput);
      return c.json(workspace, 200);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
