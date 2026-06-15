import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

import { StripeClientEnvSchema } from './schema/stripe-client-env.schema';

const parsed = StripeClientEnvSchema.safeParse({
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
});

/** True when `VITE_STRIPE_PUBLISHABLE_KEY` is a valid `pk_` key. */
export const stripePublishableKeyConfigured = parsed.success;

/**
 * Promise from `loadStripe`, or `null` if the publishable key is missing/invalid.
 * Avoids throwing at module load when Stripe is not configured (e.g. local dev).
 */
export const stripePromise: Promise<Stripe | null> | null = parsed.success
  ? loadStripe(parsed.data.publishableKey)
  : null;
