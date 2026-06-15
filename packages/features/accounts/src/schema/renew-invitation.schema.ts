import { z } from 'zod';

import { CsrfTokenSchema } from '@qlm/csrf/schema';

export const RenewInvitationSchema = z.object({
  intent: z.literal('renew-invitation'),
  payload: CsrfTokenSchema.extend({
    invitationId: z.number().positive(),
  }),
});
