import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import {
  GetMessagesByConversationSlugService,
  GetMessagesPaginatedService,
} from '@guepard/domain/services';
import type { Repositories } from '@guepard/domain/repositories';
import { handleDomainException } from '../lib/http-utils';

const messagesQuerySchema = z.object({
  conversationSlug: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.string().optional(),
});

export function createMessagesRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.get('/', zValidator('query', messagesQuerySchema), async (c) => {
    try {
      const repos = await getRepositories(c);
      const {
        conversationSlug,
        cursor,
        limit: limitParam,
      } = c.req.valid('query');
      const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

      if (cursor !== undefined && cursor !== null && cursor !== '') {
        const useCase = new GetMessagesPaginatedService(
          repos.message,
          repos.conversation,
        );
        const result = await useCase.execute({
          conversationSlug,
          cursor,
          limit,
        });
        return c.json(result);
      }

      const useCase = new GetMessagesByConversationSlugService(
        repos.message,
        repos.conversation,
      );
      const messages = await useCase.execute({ conversationSlug });
      return c.json(messages);
    } catch (error) {
      return handleDomainException(error);
    }
  });

  return app;
}
