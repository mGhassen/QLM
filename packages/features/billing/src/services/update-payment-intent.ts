import type { Stripe } from 'stripe';
import { createStripeClient } from './stripe-sdk';

/**
 * Update a payment intent's amount
 * @param paymentIntentId - The payment intent ID (e.g., "pi_xxx")
 * @param amount - The new amount in dollars (will be converted to cents)
 * @returns The updated payment intent
 */
export async function updatePaymentIntentAmount(
  paymentIntentId: string,
  amount: number,
): Promise<Stripe.PaymentIntent> {
  const stripe = await createStripeClient();

  // Update the payment intent amount (convert dollars to cents)
  const updatedPaymentIntent = await stripe.paymentIntents.update(
    paymentIntentId,
    {
      amount: Math.round(amount * 100), // Convert to cents
      metadata: {
        amount: amount.toString(),
      },
    },
  );

  return updatedPaymentIntent;
}
