import {
  createCheckoutSession,
  createPaymentIntent,
  createSetupIntent,
} from '@guepard/billing/services';
import type { Repositories } from '@guepard/domain/repositories';

import appConfig from '@/config/app.config';
import pathsConfig from '@/config/paths.config';

import type { OrganizationCheckoutPayload } from './org-billing.schema';

/**
 * Server-side orchestrator for billing checkout flows. Mirrors qwery's
 * `OrganizationBillingService` at apps/web/lib/billing/.server/org-billing.server.ts.
 *
 * Takes a `Repositories` object (typically created with an authenticated
 * Supabase server client) so RLS still applies when reading/writing billing
 * customers.
 */
export class OrganizationBillingService {
  constructor(private readonly repositories: Repositories) {}

  /**
   * @name createCheckout
   * @description Creates a Stripe checkout session (embedded mode).
   */
  async createCheckout(params: OrganizationCheckoutPayload) {
    const planId = process.env.STRIPE_PLAN_ID ?? '';
    const returnUrl = createOrganizationBillingPath(params.slug);
    const customerId = undefined;
    const customerEmail = 'test@test.com';

    try {
      const { checkoutToken } = await createCheckoutSession({
        organizationId: params.organizationId,
        planId,
        returnUrl,
        customerEmail,
        customerId,
      });

      return { checkoutToken };
    } catch (error) {
      console.error('[billing] createCheckout failed:', error);
      if (error instanceof Error) {
        throw new Error(`Checkout not created: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error('Checkout not created');
    }
  }

  /**
   * @name createSetupIntent
   * @description Creates a Stripe setup intent for saving a payment method.
   */
  async createSetupIntent(params: OrganizationCheckoutPayload) {
    const customerId = undefined;
    const customerEmail = 'test@test.com';

    try {
      const { clientSecret } = await createSetupIntent({
        organizationId: params.organizationId,
        customerEmail,
        customerId,
      });

      return { checkoutToken: clientSecret };
    } catch (error) {
      console.error('[billing] createSetupIntent failed:', error);
      if (error instanceof Error) {
        throw new Error(`Setup intent not created: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error('Setup intent not created');
    }
  }

  /**
   * @name createPaymentIntent
   * @description Creates a Stripe payment intent for purchasing credits.
   * Reuses any existing Stripe customer id we've previously seen for this
   * organization (pulled from the orders table) so repeat purchases land
   * on the same Stripe customer. The customer id for new orders is
   * persisted naturally when the order is upserted via the billing webhook
   * — no separate billing-customers table needed.
   */
  async createPaymentIntent(
    params: OrganizationCheckoutPayload & {
      amount: number;
      customerEmail: string;
    },
  ) {
    try {
      if (!params.customerEmail) {
        throw new Error('User email is required');
      }

      // Look up an existing Stripe customer id from any prior order for
      // this organization. Orders are populated by the billing webhook on
      // checkout.session.completed / payment_intent.succeeded — that's
      // where the customer_id lands and where we read it back from.
      const existingOrders = await this.repositories.order.findByOrganizationId(
        params.organizationId,
      );
      const customerId = existingOrders.find((o) =>
        Boolean(o.customerId),
      )?.customerId;

      const { clientSecret } = await createPaymentIntent({
        organizationId: params.organizationId,
        amount: params.amount,
        currency: 'usd',
        customerEmail: params.customerEmail,
        customerId,
        priceId: undefined,
      });

      return { checkoutToken: clientSecret };
    } catch (error) {
      // Surface the underlying error so the root cause is visible in logs
      // and bubbles up to the API route. Don't wrap it in a generic message.
      console.error('[billing] createPaymentIntent failed:', error);
      if (error instanceof Error) {
        throw new Error(`Payment intent not created: ${error.message}`, {
          cause: error,
        });
      }
      throw new Error('Payment intent not created');
    }
  }
}

export function createOrganizationBillingService(repositories: Repositories) {
  return new OrganizationBillingService(repositories);
}

/**
 * Build the fully-qualified URL Stripe should redirect back to after payment.
 *
 * Phase 1 of RFC 0024 removed the standalone `/org/<slug>/billing` page;
 * the org-settings app (story 009) will host the real billing section. Until
 * then, Stripe lands users on `/`, where `LastProjectRedirect` resolves the
 * active project. The `slug` parameter is retained for future wiring.
 */
export function createOrganizationBillingPath(_slug: string): string {
  const base = appConfig.url?.replace(/\/$/, '') ?? '';
  return `${base}${pathsConfig.app.home}`;
}
