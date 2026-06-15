import { z } from 'zod';

export const VolumePricingTierSchema = z.object({
  id: z.uuid(),
  minAmountCents: z.number().int().min(0),
  maxAmountCents: z.number().int().min(0).nullable(),
  creditsMultiplier: z.number().min(0),
  tierName: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  priority: z.number().int(),
  createdAt: z.coerce.date(),
});

export type VolumePricingTier = z.infer<typeof VolumePricingTierSchema>;
