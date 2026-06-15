import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import type { CreateUsageInput } from '@guepard/domain/usecases';
import {
  CreateUsageService,
  GetUsageByConversationSlugService,
} from '@guepard/domain/services';
import type { Repositories } from '@guepard/domain/repositories';
import { handleDomainException } from '../lib/http-utils';

const usageQuerySchema = z.object({
  conversationSlug: z.string().min(1),
  userId: z.string().optional().default(''),
});

const usageBodySchema = z
  .object({
    conversationSlug: z.string().optional(),
    conversationId: z.string().optional(),
  })
  .passthrough()
  .refine(
    (data) =>
      (data.conversationSlug && data.conversationSlug.length > 0) ||
      (data.conversationId && data.conversationId.length > 0),
    { message: 'conversationSlug or conversationId is required' },
  );

export function createUsageRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', usageQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const { conversationSlug, userId } = c.req.valid('query');

      const useCase = new GetUsageByConversationSlugService(
        repos.usage,
        repos.conversation,
      );
      const usage = await useCase.execute({ conversationSlug, userId });
      return c.json(usage);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  app.post('/', zValidator('json', usageBodySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const { conversationSlug, conversationId, ...input } =
        c.req.valid('json');

      let slug = conversationSlug;
      if (!slug && conversationId) {
        const conversation = await repos.conversation.findById(conversationId);
        if (!conversation) {
          return c.json(
            { error: `Conversation with id '${conversationId}' not found` },
            404,
          );
        }
        slug = conversation.slug;
      }

      if (!slug) {
        return c.json(
          { error: 'conversationSlug or conversationId is required' },
          400,
        );
      }

      const useCase = new CreateUsageService(
        repos.usage,
        repos.conversation,
        repos.project,
      );
      const usage = await useCase.execute({
        input: input as CreateUsageInput,
        conversationSlug: slug,
      });

      return c.json(usage, 201);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
