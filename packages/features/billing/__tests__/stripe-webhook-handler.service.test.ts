import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StripeWebhookHandlerService } from '../src/services/stripe-webhook-handler.service';

/**
 * Module mocks. `getLogger` + `createStripeClient` are the only non-pure
 * dependencies the handler reaches for. Both are mocked here so the tests
 * stay in-process and do not require a live Stripe account or real env.
 *
 * The Stripe client is a hoisted shared instance so individual tests can
 * configure its method stubs via `setStripeStub(...)` before invoking the
 * handler, while a reset runs in `beforeEach` to keep tests independent.
 */
const stripeStub = {
  checkout: {
    sessions: {
      retrieve: vi.fn(),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
  },
};

vi.mock('@qlm/shared/logger', () => ({
  getLogger: vi.fn().mockResolvedValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../src/services/stripe-sdk', () => ({
  createStripeClient: vi.fn(async () => stripeStub),
}));

const noop = async () => {};

let planTypesMap: Map<string, 'flat' | 'metered' | 'per_seat'>;

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function createSucceededEvent(overrides?: {
  organizationId?: string;
  amount?: number;
  currency?: string;
  customerId?: string;
}) {
  return {
    id: 'evt_test',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
        amount: overrides?.amount ?? 1000,
        currency: overrides?.currency ?? 'usd',
        customer: overrides?.customerId ?? 'cus_test',
        metadata: {
          organizationId: overrides?.organizationId ?? 'org_uuid_123',
          productId: 'prod_1',
          priceId: 'price_1',
        },
      },
    },
  } as unknown as import('stripe').Stripe.Event;
}

function createPaymentFailedEvent(overrides?: {
  organizationId?: string;
  amount?: number;
  currency?: string;
  customerId?: string;
}) {
  return {
    id: 'evt_test_failed',
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test_456',
        amount: overrides?.amount ?? 500,
        currency: overrides?.currency ?? 'usd',
        customer: overrides?.customerId ?? 'cus_test_2',
        metadata: {
          organizationId: overrides?.organizationId ?? 'org_uuid_456',
          productId: 'prod_2',
          priceId: 'price_2',
        },
      },
    },
  } as unknown as import('stripe').Stripe.Event;
}

function createCheckoutSessionCompletedEvent(overrides?: {
  sessionId?: string;
  organizationId?: string;
  customerId?: string;
  currency?: string;
}) {
  return {
    id: 'evt_checkout',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: overrides?.sessionId ?? 'cs_test_123',
        client_reference_id: overrides?.organizationId ?? 'org_checkout',
        customer: overrides?.customerId ?? 'cus_checkout',
        currency: overrides?.currency ?? 'usd',
      },
    },
  } as unknown as import('stripe').Stripe.Event;
}

function createSubscriptionUpdatedEvent(overrides?: {
  subscriptionId?: string;
  organizationId?: string;
  customerId?: string;
  currency?: string;
  status?: import('stripe').Stripe.Subscription.Status;
  cancelAtPeriodEnd?: boolean;
  trialStart?: number | null;
  trialEnd?: number | null;
  items?: Array<{
    id: string;
    priceId: string;
    productId: string;
    unitAmount: number;
    interval: 'month' | 'year';
    intervalCount?: number;
    currentPeriodStart?: number;
    currentPeriodEnd?: number;
  }>;
}) {
  const items = overrides?.items ?? [
    {
      id: 'si_sub_item',
      priceId: 'price_sub',
      productId: 'prod_sub',
      unitAmount: 2500,
      interval: 'month',
      intervalCount: 1,
      currentPeriodStart: 1_700_000_000,
      currentPeriodEnd: 1_702_592_000,
    },
  ];

  return {
    id: 'evt_sub_updated',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: overrides?.subscriptionId ?? 'sub_updated_123',
        customer: overrides?.customerId ?? 'cus_sub',
        currency: overrides?.currency ?? 'usd',
        status: overrides?.status ?? 'active',
        cancel_at_period_end: overrides?.cancelAtPeriodEnd ?? false,
        trial_start: overrides?.trialStart ?? null,
        trial_end: overrides?.trialEnd ?? null,
        current_period_start: items[0]!.currentPeriodStart,
        current_period_end: items[0]!.currentPeriodEnd,
        metadata: {
          organizationId: overrides?.organizationId ?? 'org_sub',
        },
        items: {
          data: items.map((i) => ({
            id: i.id,
            quantity: 1,
            price: {
              id: i.priceId,
              product: i.productId,
              unit_amount: i.unitAmount,
              recurring: {
                interval: i.interval,
                interval_count: i.intervalCount ?? 1,
              },
            },
            current_period_start: i.currentPeriodStart,
            current_period_end: i.currentPeriodEnd,
          })),
        },
      },
    },
  } as unknown as import('stripe').Stripe.Event;
}

function createSubscriptionDeletedEvent(subscriptionId = 'sub_deleted_123') {
  return {
    id: 'evt_sub_deleted',
    type: 'customer.subscription.deleted',
    data: { object: { id: subscriptionId } },
  } as unknown as import('stripe').Stripe.Event;
}

function createAsyncPaymentSucceededEvent(sessionId = 'cs_async_ok') {
  return {
    id: 'evt_async_ok',
    type: 'checkout.session.async_payment_succeeded',
    data: { object: { id: sessionId } },
  } as unknown as import('stripe').Stripe.Event;
}

function createAsyncPaymentFailedEvent(sessionId = 'cs_async_fail') {
  return {
    id: 'evt_async_fail',
    type: 'checkout.session.async_payment_failed',
    data: { object: { id: sessionId } },
  } as unknown as import('stripe').Stripe.Event;
}

function createInvoicePaidEvent(overrides?: {
  invoiceId?: string;
  customerId?: string;
  subscriptionId?: string;
}) {
  return {
    id: 'evt_invoice_paid',
    type: 'invoice.paid',
    data: {
      object: {
        id: overrides?.invoiceId ?? 'in_123',
        customer: overrides?.customerId ?? 'cus_invoice',
        subscription: overrides?.subscriptionId ?? 'sub_invoice_123',
      },
    },
  } as unknown as import('stripe').Stripe.Event;
}

function createUnknownEvent(type = 'some.unknown.event') {
  return {
    id: 'evt_unknown',
    type,
    data: { object: {} },
  } as unknown as import('stripe').Stripe.Event;
}

// ---------------------------------------------------------------------------
// Default callback object — tests that only care about one handler still pass
// a full set so TypeScript is happy.
// ---------------------------------------------------------------------------

function defaultCallbacks(
  overrides: Partial<
    Parameters<StripeWebhookHandlerService['handleWebhookEvent']>[1]
  > = {},
) {
  return {
    onCheckoutSessionCompleted: noop,
    onSubscriptionUpdated: noop,
    onSubscriptionDeleted: noop,
    onPaymentSucceeded: noop,
    onPaymentFailed: noop,
    onInvoicePaid: noop,
    onPaymentIntentSucceeded: noop,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StripeWebhookHandlerService', () => {
  let handler: StripeWebhookHandlerService;

  beforeEach(() => {
    planTypesMap = new Map<string, 'flat' | 'metered' | 'per_seat'>();
    handler = new StripeWebhookHandlerService(planTypesMap);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('payment_intent.succeeded', () => {
    it('calls onPaymentIntentSucceeded with expected payload', async () => {
      const onPaymentIntentSucceeded = vi.fn().mockResolvedValue(undefined);
      const event = createSucceededEvent({
        organizationId: 'org_abc',
        amount: 2000,
        currency: 'eur',
        customerId: 'cus_xyz',
      });

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onPaymentIntentSucceeded }),
      );

      expect(onPaymentIntentSucceeded).toHaveBeenCalledTimes(1);
      expect(onPaymentIntentSucceeded).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test_123',
        organizationId: 'org_abc',
        amount: 2000,
        currency: 'eur',
        customerId: 'cus_xyz',
        metadata: expect.objectContaining({
          organizationId: 'org_abc',
          productId: 'prod_1',
          priceId: 'price_1',
        }),
      });
    });

    it('delegates to onEvent when no onPaymentIntentSucceeded is provided', async () => {
      const onEvent = vi.fn().mockResolvedValue(undefined);
      // `onPaymentIntentSucceeded` in the param type is not optional, but the
      // handler code reads it as `params.onPaymentIntentSucceeded` and checks
      // truthiness; stub it as undefined via a cast to exercise the fallback.
      const event = createSucceededEvent();

      await handler.handleWebhookEvent(event, {
        ...defaultCallbacks(),
        onPaymentIntentSucceeded: undefined as unknown as typeof noop,
        onEvent,
      });

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('payment_intent.payment_failed', () => {
    it('calls onPaymentIntentFailed with expected payload when handler is provided', async () => {
      const onPaymentIntentFailed = vi.fn().mockResolvedValue(undefined);
      const event = createPaymentFailedEvent({
        organizationId: 'org_fail',
        amount: 750,
        currency: 'usd',
        customerId: 'cus_fail',
      });

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onPaymentIntentFailed }),
      );

      expect(onPaymentIntentFailed).toHaveBeenCalledTimes(1);
      expect(onPaymentIntentFailed).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test_456',
        organizationId: 'org_fail',
        amount: 750,
        currency: 'usd',
        customerId: 'cus_fail',
        metadata: expect.objectContaining({
          organizationId: 'org_fail',
          productId: 'prod_2',
          priceId: 'price_2',
        }),
      });
    });

    it('does not call onPaymentIntentFailed when organizationId is missing', async () => {
      const onPaymentIntentFailed = vi.fn().mockResolvedValue(undefined);
      const event = createPaymentFailedEvent();
      (
        event.data as { object: { metadata: Record<string, string> } }
      ).object.metadata = {};

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onPaymentIntentFailed }),
      );

      expect(onPaymentIntentFailed).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('projects the subscription and fires onSubscriptionUpdated', async () => {
      planTypesMap.set('price_sub', 'flat');
      const onSubscriptionUpdated = vi.fn().mockResolvedValue(undefined);
      const event = createSubscriptionUpdatedEvent();

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onSubscriptionUpdated }),
      );

      expect(onSubscriptionUpdated).toHaveBeenCalledTimes(1);
      const payload = onSubscriptionUpdated.mock.calls[0]![0];
      expect(payload).toMatchObject({
        target_subscription_id: 'sub_updated_123',
        target_organization_id: 'org_sub',
        target_customer_id: 'cus_sub',
        billing_provider: 'stripe',
        status: 'active',
        active: true,
        currency: 'usd',
        cancel_at_period_end: false,
        period_starts_at: '2023-11-14T22:13:20.000Z',
        period_ends_at: '2023-12-14T22:13:20.000Z',
      });
      expect(payload.line_items).toHaveLength(1);
      expect(payload.line_items[0]).toMatchObject({
        id: 'si_sub_item',
        type: 'flat',
        product_id: 'prod_sub',
        variant_id: 'price_sub',
      });
    });

    it('defaults unknown line-item types to "flat" and warns', async () => {
      // planTypesMap is intentionally empty — the line item's price_id won't be there.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const onSubscriptionUpdated = vi.fn().mockResolvedValue(undefined);
      const event = createSubscriptionUpdatedEvent();

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onSubscriptionUpdated }),
      );

      const payload = onSubscriptionUpdated.mock.calls[0]![0];
      expect(payload.line_items[0]!.type).toBe('flat');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('fires onSubscriptionDeleted with the subscription id', async () => {
      const onSubscriptionDeleted = vi.fn().mockResolvedValue(undefined);
      const event = createSubscriptionDeletedEvent('sub_deleted_xyz');

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onSubscriptionDeleted }),
      );

      expect(onSubscriptionDeleted).toHaveBeenCalledWith('sub_deleted_xyz');
    });
  });

  describe('checkout.session.async_payment_*', () => {
    it('fires onPaymentSucceeded with the session id on async_payment_succeeded', async () => {
      const onPaymentSucceeded = vi.fn().mockResolvedValue(undefined);
      const event = createAsyncPaymentSucceededEvent('cs_async_42');

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onPaymentSucceeded }),
      );

      expect(onPaymentSucceeded).toHaveBeenCalledWith('cs_async_42');
    });

    it('fires onPaymentFailed with the session id on async_payment_failed', async () => {
      const onPaymentFailed = vi.fn().mockResolvedValue(undefined);
      const event = createAsyncPaymentFailedEvent('cs_async_99');

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onPaymentFailed }),
      );

      expect(onPaymentFailed).toHaveBeenCalledWith('cs_async_99');
    });
  });

  describe('checkout.session.completed', () => {
    it('fires onCheckoutSessionCompleted with the built order payload', async () => {
      stripeStub.checkout.sessions.retrieve.mockResolvedValueOnce({
        id: 'cs_test_123',
        amount_total: 1500,
        payment_status: 'paid',
        line_items: {
          data: [
            {
              id: 'li_1',
              quantity: 2,
              price: {
                id: 'price_co',
                product: 'prod_co',
                unit_amount: 750,
              },
            },
          ],
        },
      });
      const onCheckoutSessionCompleted = vi.fn().mockResolvedValue(undefined);
      const event = createCheckoutSessionCompletedEvent();

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onCheckoutSessionCompleted }),
      );

      expect(stripeStub.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test_123',
        { expand: ['line_items'] },
      );
      expect(onCheckoutSessionCompleted).toHaveBeenCalledTimes(1);
      const payload = onCheckoutSessionCompleted.mock.calls[0]![0];
      expect(payload).toMatchObject({
        target_organization_id: 'org_checkout',
        target_customer_id: 'cus_checkout',
        target_order_id: 'cs_test_123',
        billing_provider: 'stripe',
        status: 'succeeded',
        currency: 'usd',
        total_amount: 1500,
      });
      expect(payload.line_items).toHaveLength(1);
      expect(payload.line_items[0]).toMatchObject({
        id: 'li_1',
        quantity: 2,
        product_id: 'prod_co',
        variant_id: 'price_co',
        price_amount: 750,
      });
    });

    it('marks the order as pending when payment_status is unpaid', async () => {
      stripeStub.checkout.sessions.retrieve.mockResolvedValueOnce({
        id: 'cs_test_unpaid',
        amount_total: 1000,
        payment_status: 'unpaid',
        line_items: { data: [] },
      });
      const onCheckoutSessionCompleted = vi.fn().mockResolvedValue(undefined);
      const event = createCheckoutSessionCompletedEvent({
        sessionId: 'cs_test_unpaid',
      });

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onCheckoutSessionCompleted }),
      );

      expect(onCheckoutSessionCompleted.mock.calls[0]![0].status).toBe(
        'pending',
      );
    });
  });

  describe('invoice.paid', () => {
    it('retrieves the subscription and fires onInvoicePaid with the built payload', async () => {
      planTypesMap.set('price_inv', 'flat');
      stripeStub.subscriptions.retrieve.mockResolvedValueOnce({
        id: 'sub_invoice_123',
        customer: 'cus_invoice',
        currency: 'usd',
        status: 'active',
        cancel_at_period_end: false,
        trial_start: null,
        trial_end: null,
        current_period_start: 1_700_000_000,
        current_period_end: 1_702_592_000,
        metadata: { organizationId: 'org_invoice' },
        items: {
          data: [
            {
              id: 'si_inv',
              quantity: 1,
              price: {
                id: 'price_inv',
                product: 'prod_inv',
                unit_amount: 3000,
                recurring: { interval: 'month', interval_count: 1 },
              },
              current_period_start: 1_700_000_000,
              current_period_end: 1_702_592_000,
            },
          ],
        },
      });
      const onInvoicePaid = vi.fn().mockResolvedValue(undefined);
      const event = createInvoicePaidEvent();

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onInvoicePaid }),
      );

      expect(stripeStub.subscriptions.retrieve).toHaveBeenCalledWith(
        'sub_invoice_123',
      );
      expect(onInvoicePaid).toHaveBeenCalledTimes(1);
      const payload = onInvoicePaid.mock.calls[0]![0];
      expect(payload).toMatchObject({
        target_subscription_id: 'sub_invoice_123',
        target_organization_id: 'org_invoice',
        target_customer_id: 'cus_invoice',
        status: 'active',
        active: true,
        period_starts_at: '2023-11-14T22:13:20.000Z',
        period_ends_at: '2023-12-14T22:13:20.000Z',
      });
      expect(payload.line_items[0]).toMatchObject({
        id: 'si_inv',
        product_id: 'prod_inv',
        variant_id: 'price_inv',
        type: 'flat',
      });
    });

    it('skips processing when the invoice carries no subscription', async () => {
      const onInvoicePaid = vi.fn().mockResolvedValue(undefined);
      const event = createInvoicePaidEvent();
      // Strip the subscription field so the handler takes the "no subscription" path.
      (
        event.data as { object: { subscription?: string } }
      ).object.subscription = undefined;

      await handler.handleWebhookEvent(
        event,
        defaultCallbacks({ onInvoicePaid }),
      );

      expect(stripeStub.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(onInvoicePaid).not.toHaveBeenCalled();
    });
  });

  describe('unknown events', () => {
    it('delegates to onEvent when an unknown event type arrives', async () => {
      const onEvent = vi.fn().mockResolvedValue(undefined);
      const event = createUnknownEvent('charge.disputed');

      await handler.handleWebhookEvent(event, {
        ...defaultCallbacks(),
        onEvent,
      });

      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(event);
    });

    it('falls through silently when no onEvent is provided', async () => {
      const event = createUnknownEvent('some.obscure.event');
      await expect(
        handler.handleWebhookEvent(event, defaultCallbacks()),
      ).resolves.toBeUndefined();
    });
  });
});
