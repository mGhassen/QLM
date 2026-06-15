import { z } from 'zod';

import { CsrfTokenSchema } from '@guepard/csrf/schema';

export const DeleteOrganizationSchema = z.object({
  payload: CsrfTokenSchema.extend({
    organizationId: z.uuid(),
    otp: z.string().min(6),
  }),
  intent: z.literal('delete-organization'),
});
