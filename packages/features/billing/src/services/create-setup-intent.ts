import { z } from 'zod';
import { createStripeClient } from './stripe-sdk';

export const CreateSetupIntentSchema = z.object({
  organizationId: z.uuid(),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

/**
 * @name createSetupIntent
 * @description Creates a Stripe Setup Intent for payment method collection
 */
export async function createSetupIntent(
  params: z.infer<typeof CreateSetupIntentSchema>,
) {
  const stripe = await createStripeClient();

  // Setup Intents require a customer ID, not customer_email
  // If we don't have a customer ID, create a customer first
  let customerId = params.customerId;

  if (!customerId && params.customerEmail) {
    const customer = await stripe.customers.create({
      email: params.customerEmail,
      metadata: {
        organizationId: params.organizationId,
      },
    });
    customerId = customer.id;
  }

  if (!customerId) {
    throw new Error('Customer ID or email is required to create setup intent');
  }

  const setupIntent = await stripe.setupIntents.create({
    payment_method_types: ['card'],
    customer: customerId,
    metadata: {
      organizationId: params.organizationId,
    },
  });

  if (!setupIntent.client_secret) {
    throw new Error('Failed to create setup intent');
  }

  return { clientSecret: setupIntent.client_secret };
}
