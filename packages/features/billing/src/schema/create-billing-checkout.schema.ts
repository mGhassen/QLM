import { z } from 'zod';

export const CreateBillingCheckoutSchema = z.object({
  returnUrl: z.string().url(),
  organizationId: z.uuid(),
  planId: z.string().min(1),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});
