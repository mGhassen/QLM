import { z } from 'zod';

export const RoleSchema = z.object({
  role: z.string().min(1),
});

export const UpdateMemberRoleSchema = z.object({
  intent: z.literal('update-member-role'),
  payload: RoleSchema.extend({
    organizationId: z.uuid(),
    userId: z.uuid(),
    csrfToken: z.string(),
  }),
});
