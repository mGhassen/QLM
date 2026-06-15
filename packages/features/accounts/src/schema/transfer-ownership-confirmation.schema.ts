import { z } from 'zod';

import { CsrfTokenSchema } from '@guepard/csrf/schema';

export const TransferOwnershipConfirmationSchema = CsrfTokenSchema.extend({
  userId: z.uuid(),
  otp: z.string().min(6),
  organizationId: z.uuid(),
});

export const TransferOwnershipSchema = z.object({
  intent: z.literal('transfer-ownership'),
  payload: TransferOwnershipConfirmationSchema,
});
