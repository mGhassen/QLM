import {
  BillingProviderSchema,
  createBillingSchema,
} from '@qlm/billing/services';

/**
 * Static billing configuration.
 *
 * Mirrors the structure of qwery's `billing.sample.config.ts`. Price / product
 * IDs are read from environment variables so this file can live under VCS.
 *
 * Env vars:
 * - VITE_BILLING_PROVIDER=stripe
 * - STRIPE_PRODUCT_ID=prod_...
 * - STRIPE_PRICE_ID=price_...
 */
const provider = BillingProviderSchema.parse(
  import.meta.env.VITE_BILLING_PROVIDER ?? 'stripe',
);

const STRIPE_PRODUCT_ID =
  (typeof process !== 'undefined' && process.env.STRIPE_PRODUCT_ID) ||
  'prod_placeholder';
const STRIPE_PRICE_ID =
  (typeof process !== 'undefined' && process.env.STRIPE_PRICE_ID) ||
  'price_placeholder';

export default createBillingSchema({
  provider,
  products: [
    {
      id: 'starter',
      name: 'billing:plans.starter.name',
      description: 'billing:plans.starter.description',
      currency: 'USD',
      badge: 'billing:plans.starter.badge',
      plans: [
        {
          name: 'Credits',
          id: STRIPE_PRODUCT_ID,
          paymentType: 'one-time',
          lineItems: [
            {
              id: STRIPE_PRICE_ID,
              name: 'billing:plans.starter.base',
              cost: 100,
              type: 'flat' as const,
            },
          ],
        },
      ],
      features: [
        'billing:plans.starter.features.maxTokens',
        'billing:plans.features.chatSupport',
      ],
    },
  ],
});
