import { z } from 'zod';

import { CsrfTokenSchema } from '@qlm/csrf/schema';

/**
 * Payload schema for organization billing checkout / setup-intent /
 * payment-intent requests. Matches qwery's `OrganizationCheckoutSchema`.
 */
export const OrganizationCheckoutSchema = CsrfTokenSchema.extend({
  slug: z.string().min(1),
  organizationId: z.uuid(),
});

export type OrganizationCheckoutPayload = z.infer<
  typeof OrganizationCheckoutSchema
>;
