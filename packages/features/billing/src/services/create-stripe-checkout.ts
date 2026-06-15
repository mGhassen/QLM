import type { Stripe } from 'stripe';
import { z } from 'zod';

import type { CreateBillingCheckoutSchema } from '../schema/create-billing-checkout.schema';
import { createStripeClient } from './stripe-sdk';

/**
 * @name createStripeCheckout
 * @description Creates a Stripe Checkout session, and returns an Object
 * containing the session, which you can use to redirect the user to the
 * checkout page
 */
export async function createStripeCheckout(
  stripe: Stripe,
  params: z.infer<typeof CreateBillingCheckoutSchema>,
) {
  // in MakerKit, a subscription belongs to an organization,
  // rather than to a user
  // if you wish to change it, use the current user ID instead
  const clientReferenceId = params.organizationId;

  // we pass an optional customer ID, so we do not duplicate the Stripe
  // customers if an organization subscribes multiple times
  const customer = params.customerId ?? undefined;

  // docs: https://stripe.com/docs/billing/subscriptions/build-subscription
  const mode: Stripe.Checkout.SessionCreateParams.Mode = 'payment';

  const urls = getUrls({
    returnUrl: params.returnUrl,
  });

  // we use the embedded mode, so the user does not leave the page
  const uiMode = 'embedded';

  const customerData = customer
    ? {
        customer,
      }
    : {
        customer_email: params.customerEmail,
      };

  const customerCreation = customer
    ? ({} as Record<string, string>)
    : { customer_creation: 'always' };

  const lineItems = [
    {
      price: params.planId,
      quantity: 1,
    },
  ];
  return stripe.checkout.sessions.create({
    mode,
    allow_promotion_codes: false,
    ui_mode: uiMode,
    line_items: lineItems,
    client_reference_id: clientReferenceId,
    ...customerCreation,
    ...customerData,
    ...urls,
  });
}

export async function createCheckoutSession(
  params: z.infer<typeof CreateBillingCheckoutSchema>,
) {
  const stripe = await createStripeClient();

  const { client_secret } = await createStripeCheckout(stripe, params);

  if (!client_secret) {
    throw new Error('Failed to create checkout session');
  }

  return { checkoutToken: client_secret };
}

function getUrls(params: { returnUrl: string }) {
  const returnUrl = `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}`;

  return {
    return_url: returnUrl,
  };
}
