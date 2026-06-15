import { z } from 'zod';

export const PredictionAgentConversationZodSchema = z.object({
  id: z.uuid().describe('The unique identifier of the conversation'),
  snapshotId: z
    .string()
    .uuid()
    .describe('The snapshot this conversation is pinned to (immutable)'),
  projectId: z
    .string()
    .uuid()
    .describe('The project the conversation belongs to (RLS scope key)'),
  createdBy: z
    .string()
    .uuid()
    .describe('The user who created the conversation'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PredictionAgentConversation = z.infer<
  typeof PredictionAgentConversationZodSchema
>;
