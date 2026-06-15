import { z } from 'zod';
import { createStripeClient } from './stripe-sdk';

export const CreatePaymentIntentSchema = z.object({
  organizationId: z.uuid(),
  amount: z.number().min(1),
  currency: z.string().default('usd'),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  priceId: z.string().optional(),
});

/**
 * @name createPaymentIntent
 * @description Creates a Stripe Payment Intent for purchasing credits
 * The payment method will be saved for future use (setup_future_usage)
 */
export async function createPaymentIntent(
  params: z.infer<typeof CreatePaymentIntentSchema>,
) {
  const stripe = await createStripeClient();

  // Payment Intents require a customer ID
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
    throw new Error(
      'Customer ID or email is required to create payment intent',
    );
  }

  // Create payment intent with setup_future_usage to save payment method
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(params.amount * 100), // Convert to cents
    currency: params.currency,
    customer: customerId,
    setup_future_usage: 'off_session', // Save payment method for future use
    metadata: {
      organizationId: params.organizationId,
      amount: params.amount.toString(),
      priceId: params.priceId || '',
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Failed to create payment intent');
  }

  return {
    clientSecret: paymentIntent.client_secret,
    customerId, // Return customer ID so it can be saved
  };
}
