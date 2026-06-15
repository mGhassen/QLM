import { z } from 'zod';

import { CsrfTokenSchema } from '@qlm/csrf/schema';
import { isSafeRedirectPath } from '@qlm/shared/utils';

export const AcceptInvitationSchema = CsrfTokenSchema.extend({
  inviteToken: z.uuid(),
  nextPath: z.string().min(1).refine(isSafeRedirectPath, {
    message: 'Invalid redirect path',
  }),
});
