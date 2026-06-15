import { z } from 'zod';

export const UserQuotaSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  userId: z.uuid(),
  creditsAllocated: z.number().int().min(0),
  creditsUsed: z.number().int().min(0),
  creditsRemaining: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UserQuota = z.infer<typeof UserQuotaSchema>;
