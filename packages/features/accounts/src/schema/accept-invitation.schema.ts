import { z } from 'zod';

import { CsrfTokenSchema } from '@guepard/csrf/schema';
import { isSafeRedirectPath } from '@guepard/shared/utils';

export const AcceptInvitationSchema = CsrfTokenSchema.extend({
  inviteToken: z.uuid(),
  nextPath: z.string().min(1).refine(isSafeRedirectPath, {
    message: 'Invalid redirect path',
  }),
});
