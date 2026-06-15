import { z } from 'zod';

import { CsrfTokenSchema } from '@guepard/csrf/schema';

export const LeaveOrganizationSchema = z.object({
  intent: z.literal('leave-organization'),
  payload: CsrfTokenSchema.extend({
    organizationId: z.uuid(),
    confirmation: z.custom((value) => value === 'LEAVE'),
  }),
});
