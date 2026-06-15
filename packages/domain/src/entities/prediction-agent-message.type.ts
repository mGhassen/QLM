import { z } from 'zod';

export const PredictionAgentMessageRoleSchema = z.enum([
  'user',
  'assistant',
  'system',
]);

export type PredictionAgentMessageRole = z.infer<
  typeof PredictionAgentMessageRoleSchema
>;

export const PredictionAgentMessageZodSchema = z.object({
  id: z.uuid(),
  conversationId: z.string().uuid(),
  role: PredictionAgentMessageRoleSchema,
  content: z.string(),
  createdAt: z.date(),
});

export type PredictionAgentMessage = z.infer<
  typeof PredictionAgentMessageZodSchema
>;
