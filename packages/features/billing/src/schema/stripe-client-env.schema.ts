import { z } from 'zod';

export const StripeClientEnvSchema = z.object({
  publishableKey: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine((v) => v.length === 0 || v.startsWith('pk_'), {
      message: `Stripe publishable key must start with 'pk_'`,
    }),
});

export function getStripePublishableKeyFromEnv(
  env: Record<string, unknown>,
): string | null {
  const parsed = StripeClientEnvSchema.safeParse({
    publishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined,
  });

  if (!parsed.success) return null;

  const key = parsed.data.publishableKey;
  return key.length > 0 ? key : null;
}
