import { z } from 'zod';

import { CsrfTokenSchema } from '@qlm/csrf/schema';

export const RemoveMemberSchema = z.object({
  payload: CsrfTokenSchema.extend({
    organizationId: z.uuid(),
    userId: z.uuid(),
  }),
  intent: z.literal('remove-member'),
});
