import { SupabaseClient } from '@supabase/supabase-js';

import { BillingWebhookHandlerService } from '../ports/billing-webhook-handler.service';
import { UpsertOrderParams, UpsertSubscriptionParams } from '../types';
import { getLogger } from '@qlm/shared/logger';
import { Database } from '@qlm/supabase/database';
import { StripeWebhookHandlerService } from './stripe-webhook-handler.service';
import { PlanTypeMap } from '../types/create-billing-schema';

/**
 * @name CustomHandlersParams
 * @description Allow consumers to provide custom handlers for the billing events
 * that are triggered by the webhook events.
 */
interface CustomHandlersParams {
  onSubscriptionDeleted: (subscriptionId: string) => Promise<unknown>;
  onSubscriptionUpdated: (
    subscription: UpsertSubscriptionParams,
  ) => Promise<unknown>;
  onCheckoutSessionCompleted: (
    subscription: UpsertSubscriptionParams | UpsertOrderParams,
    customerId: string,
  ) => Promise<unknown>;
  onPaymentSucceeded: (sessionId: string) => Promise<unknown>;
  onPaymentFailed: (sessionId: string) => Promise<unknown>;
  onInvoicePaid: (subscription: UpsertSubscriptionParams) => Promise<unknown>;
  onPaymentIntentSucceeded: (data: {
    paymentIntentId: string;
    organizationId: string;
    amount: number;
    currency: string;
    customerId: string;
    metadata: Record<string, string>;
  }) => Promise<unknown>;
  onPaymentIntentFailed?: (data: {
    paymentIntentId: string;
    organizationId: string;
    amount: number;
    currency: string;
    customerId: string;
    metadata: Record<string, string>;
  }) => Promise<unknown>;
  onEvent(event: unknown): Promise<unknown>;
}

/**
 * @name createBillingEventHandlerService
 * @description Create a new instance of the `BillingEventHandlerService` class
 * @param clientProvider
 * @param strategy
 */
export function createBillingEventHandlerService(
  clientProvider: () => SupabaseClient<Database>,
  planTypesMap: PlanTypeMap,
) {
  const strategy = new StripeWebhookHandlerService(planTypesMap);
  return new BillingEventHandlerService(clientProvider, strategy);
}

/**
 * @name BillingEventHandlerService
 * @description This class is used to handle the webhook events from the billing provider
 */
class BillingEventHandlerService {
  private readonly namespace = 'billing';

  constructor(
    private readonly clientProvider: () => SupabaseClient<Database>,
    private readonly strategy: BillingWebhookHandlerService,
  ) {}

  /**
   * @name handleWebhookEvent
   * @description Handle the webhook event from the billing provider
   * @param request
   * @param params
   */
  async handleWebhookEvent(
    request: Request,
    params: Partial<CustomHandlersParams> = {},
  ) {
    const event = await this.strategy.verifyWebhookSignature(request);

    if (!event) {
      throw new Error('Invalid signature');
    }

    return this.strategy.handleWebhookEvent(event, {
      onSubscriptionDeleted: async (subscriptionId: string) => {
        const client = this.clientProvider();
        const logger = await getLogger();

        const ctx = {
          namespace: this.namespace,
          subscriptionId,
        };

        // Handle the subscription deleted event
        // here we delete the subscription from the database
        logger.info(ctx, 'Processing subscription deleted event...');

        const { error } = await client
          .from('subscriptions')
          .delete()
          .match({ id: subscriptionId });

        if (error) {
          logger.error(
            {
              error,
              ...ctx,
            },
            `Failed to delete subscription`,
          );

          throw new Error('Failed to delete subscription');
        }

        if (params.onSubscriptionDeleted) {
          await params.onSubscriptionDeleted(subscriptionId);
        }

        logger.info(ctx, 'Successfully deleted subscription');
      },
      onSubscriptionUpdated: async (subscription) => {
        const client = this.clientProvider();
        const logger = await getLogger();

        const ctx = {
          namespace: this.namespace,
          subscriptionId: subscription.target_subscription_id,
          provider: subscription.billing_provider,
          organizationId: subscription.target_organization_id,
          customerId: subscription.target_customer_id,
        };

        logger.info(ctx, 'Processing subscription updated event ...');

        // Handle the subscription updated event
        // here we update the subscription in the database
        const { error } = await client.rpc('upsert_subscription', subscription);

        if (error) {
          logger.error(
            {
              error,
              ...ctx,
            },
            'Failed to update subscription',
          );

          throw new Error('Failed to update subscription');
        }

        if (params.onSubscriptionUpdated) {
          await params.onSubscriptionUpdated(subscription);
        }

        logger.info(ctx, 'Successfully updated subscription');
      },
      onCheckoutSessionCompleted: async (payload) => {
        // Handle the checkout session completed event
        // here we add the subscription to the database
        const client = this.clientProvider();
        const logger = await getLogger();

        // Check if the payload contains an order_id
        // if it does, we add an order, otherwise we add a subscription
        if ('target_order_id' in payload) {
          const ctx = {
            namespace: this.namespace,
            orderId: payload.target_order_id,
            provider: payload.billing_provider,
            organizationId: payload.target_organization_id,
            customerId: payload.target_customer_id,
          };

          logger.info(ctx, 'Processing order completed event...');

          const { error } = await client.rpc('upsert_order', payload);

          if (error) {
            logger.error({ ...ctx, error }, 'Failed to add order');

            throw new Error('Failed to add order');
          }

          if (params.onCheckoutSessionCompleted) {
            await params.onCheckoutSessionCompleted(
              payload,
              payload.target_customer_id,
            );
          }

          logger.info(ctx, 'Successfully added order');
        } else {
          const ctx = {
            namespace: this.namespace,
            subscriptionId: payload.target_subscription_id,
            provider: payload.billing_provider,
            organizationId: payload.target_organization_id,
            customerId: payload.target_customer_id,
          };

          logger.info(ctx, 'Processing checkout session completed event...');

          const { error } = await client.rpc('upsert_subscription', payload);

          // handle the error
          if (error) {
            logger.error({ ...ctx, error }, 'Failed to add subscription');

            throw new Error('Failed to add subscription');
          }

          // allow consumers to provide custom handlers for the event
          if (params.onCheckoutSessionCompleted) {
            await params.onCheckoutSessionCompleted(
              payload,
              payload.target_customer_id,
            );
          }

          // all good
          logger.info(ctx, 'Successfully added subscription');
        }
      },
      onPaymentSucceeded: async (sessionId: string) => {
        const client = this.clientProvider();
        const logger = await getLogger();

        const ctx = {
          namespace: this.namespace,
          sessionId,
        };

        // Handle the payment succeeded event
        // here we update the payment status in the database
        logger.info(ctx, 'Processing payment succeeded event...');

        const { error } = await client
          .from('orders')
          .update({ status: 'succeeded' })
          .match({ id: sessionId });

        // handle the error
        if (error) {
          logger.error({ error, ...ctx }, 'Failed to update payment status');

          throw new Error('Failed to update payment status');
        }

        // allow consumers to provide custom handlers for the event
        if (params.onPaymentSucceeded) {
          await params.onPaymentSucceeded(sessionId);
        }

        logger.info(ctx, 'Successfully updated payment status');
      },
      onPaymentFailed: async (sessionId: string) => {
        const client = this.clientProvider();
        const logger = await getLogger();

        const ctx = {
          namespace: this.namespace,
          sessionId,
        };

        // Handle the payment failed event
        // here we update the payment status in the database
        logger.info(ctx, 'Processing payment failed event');

        const { error } = await client
          .from('orders')
          .update({ status: 'failed' })
          .match({ id: sessionId });

        if (error) {
          logger.error({ error, ...ctx }, 'Failed to update payment status');

          throw new Error('Failed to update payment status');
        }

        // allow consumers to provide custom handlers for the event
        if (params.onPaymentFailed) {
          await params.onPaymentFailed(sessionId);
        }

        logger.info(ctx, 'Successfully updated payment status');
      },
      onInvoicePaid: async (payload) => {
        if (params.onInvoicePaid) {
          return params.onInvoicePaid(payload);
        }
      },
      onPaymentIntentSucceeded: async (data) => {
        const client = this.clientProvider();
        const logger = await getLogger();

        const ctx = {
          namespace: this.namespace,
          paymentIntentId: data.paymentIntentId,
          organizationId: data.organizationId,
          amount: data.amount,
        };

        logger.info(ctx, 'Processing payment intent succeeded event...');

        try {
          // 1. Calculate credits from amount using volume pricing
          const { data: creditsAmount, error: creditsError } = await client.rpc(
            'calculate_credits_from_amount',
            {
              amount_cents: data.amount,
            },
          );

          if (creditsError) {
            logger.error(
              { ...ctx, error: creditsError },
              'Failed to calculate credits',
            );
            throw new Error('Failed to calculate credits');
          }

          // 2. Create order record
          // Note: data.amount is in cents from Stripe
          // Use payment intent ID directly as order ID (it already starts with 'pi_')
          const orderId = data.paymentIntentId;
          const { error: orderError } = await client.rpc('upsert_order', {
            target_organization_id: data.organizationId,
            target_customer_id: data.customerId,
            target_order_id: orderId,
            billing_provider: 'stripe',
            status: 'succeeded',
            currency: data.currency,
            total_amount: data.amount, // Amount in cents
            line_items: [
              {
                id: orderId,
                product_id: data.metadata.productId || '',
                variant_id: data.metadata.priceId || '',
                price_amount: data.amount, // Amount in cents
                quantity: 1,
              },
            ],
          });

          if (orderError) {
            logger.error(
              { ...ctx, error: orderError },
              'Failed to create order',
            );
            throw new Error('Failed to create order');
          }

          // 3. Create Stripe invoice
          const { createInvoiceFromPaymentIntent } =
            await import('./create-invoice-from-payment-intent');
          let invoiceId: string | undefined;
          try {
            invoiceId = await createInvoiceFromPaymentIntent(
              data.paymentIntentId,
              data.customerId,
              data.amount,
              data.currency,
              `Credits purchase: ${creditsAmount} credits`,
              {
                organizationId: data.organizationId,
                orderId,
                creditsAmount: creditsAmount.toString(),
              },
            );
            logger.info({ ...ctx, invoiceId }, 'Created Stripe invoice');
          } catch (invoiceError) {
            logger.warn(
              { ...ctx, error: invoiceError },
              'Failed to create invoice, continuing without it',
            );
          }

          // Credits are added by trigger_on_order_credits_purchase when upsert_order creates the order
          logger.info(
            { ...ctx, creditsAmount, invoiceId },
            'Successfully processed payment intent',
          );

          // Allow custom handler
          if (params.onPaymentIntentSucceeded) {
            await params.onPaymentIntentSucceeded(data);
          }
        } catch (error) {
          logger.error({ ...ctx, error }, 'Failed to process payment intent');
          throw error;
        }
      },
      onPaymentIntentFailed: async (data) => {
        const client = this.clientProvider();
        const logger = await getLogger();
        const ctx = {
          namespace: this.namespace,
          paymentIntentId: data.paymentIntentId,
          organizationId: data.organizationId,
        };
        logger.info(ctx, 'Processing payment intent failed event...');
        try {
          const orderId = data.paymentIntentId;
          const { error: orderError } = await client.rpc('upsert_order', {
            target_organization_id: data.organizationId,
            target_customer_id: data.customerId,
            target_order_id: orderId,
            billing_provider: 'stripe',
            status: 'failed',
            currency: data.currency,
            total_amount: data.amount,
            line_items: [
              {
                id: orderId,
                product_id: data.metadata?.productId ?? '',
                variant_id: data.metadata?.priceId ?? '',
                price_amount: data.amount,
                quantity: 1,
              },
            ],
          });
          if (orderError) {
            logger.error(
              { ...ctx, error: orderError },
              'Failed to upsert failed order',
            );
            throw new Error('Failed to upsert failed order');
          }
          logger.info(ctx, 'Recorded payment intent failure');
          if (params.onPaymentIntentFailed) {
            await params.onPaymentIntentFailed(data);
          }
        } catch (error) {
          logger.error(
            { ...ctx, error },
            'Failed to process payment intent failure',
          );
          throw error;
        }
      },
      onEvent: params.onEvent,
    });
  }
}
