import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '../lib/zod-validator.js';
import { z } from 'zod';
import type { Repositories } from '@qlm/domain/repositories';
import { handleDomainException } from '../lib/http-utils';
import { getLogger } from '@qlm/shared/logger';

const POSITIVE_TYPES = [
  'fastAndAccurate',
  'goodQueryDecomposition',
  'efficientResourceUse',
  'helpfulVisualization',
  'savedCredits',
  'betterThanExpected',
] as const;
const ISSUE_TYPES = [
  'uiBug',
  'didNotFollowRequest',
  'incorrectResult',
  'responseIncomplete',
  'poorQueryDecomposition',
  'slowResponse',
  'incorrectDataSource',
  'inefficientQuery',
  'creditsWasted',
  'hallucination',
  'other',
] as const;

const feedbackBodySchema = z
  .object({
    messageId: z.string().min(1),
    type: z.enum(['positive', 'negative']),
    comment: z.string(),
    positiveType: z.enum(POSITIVE_TYPES).optional(),
    issueType: z.enum(ISSUE_TYPES).optional(),
  })
  .refine(
    (data) =>
      (data.type === 'positive' && data.positiveType !== undefined) ||
      (data.type === 'negative' && data.issueType !== undefined),
    {
      message:
        'positiveType is required for positive feedback; issueType is required for negative feedback',
    },
  );

export function createFeedbackRoutes(
  getRepositories: (c: Context) => Promise<Repositories>,
) {
  const app = new Hono();

  app.post('/', zValidator('json', feedbackBodySchema), async (c) => {
    const logger = await getLogger();
    try {
      const { messageId, type, comment, positiveType, issueType } =
        c.req.valid('json');

      const repos = await getRepositories(c);
      const message = await repos.message.findById(messageId);

      if (!message) {
        return c.json({ error: 'Message not found' }, 404);
      }

      const feedback = {
        messageId,
        type,
        comment: comment.trim(),
        ...(type === 'positive' && positiveType ? { positiveType } : {}),
        ...(type === 'negative' && issueType ? { issueType } : {}),
        updatedAt: new Date().toISOString(),
      };

      const existingMetadata: Record<string, unknown> =
        message.metadata && typeof message.metadata === 'object'
          ? (message.metadata as Record<string, unknown>)
          : {};
      const updatedMetadata = {
        ...existingMetadata,
        feedback,
      };

      const updatedMessage = {
        ...message,
        metadata: updatedMetadata,
        updatedAt: new Date(),
        updatedBy: '',
      };

      await repos.message.update(updatedMessage);

      return c.json({ success: true });
    } catch (error) {
      logger.error({ error }, 'Error creating feedback');
      return handleDomainException(error);
    }
  });

  return app;
}
