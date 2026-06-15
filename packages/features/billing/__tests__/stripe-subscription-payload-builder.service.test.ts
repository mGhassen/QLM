import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';

import { createStripeSubscriptionPayloadBuilderService } from '../src/services/stripe-subscription-payload-builder.service';

/**
 * Local fixture factories for Stripe `Price` / line item / subscription
 * shapes. Kept inline so adding tests doesn't require a shared fixtures
 * module — mirrors the "inline factory" pattern in
 * stripe-webhook-handler.service.test.ts.
 */
function makePrice(overrides?: Partial<Stripe.Price>): Stripe.Price {
  return {
    id: 'price_flat_monthly',
    product: 'prod_abc',
    unit_amount: 1999,
    currency: 'usd',
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    ...overrides,
  } as Stripe.Price;
}

type LineItemFixture = {
  id: string;
  quantity?: number;
  price?: Stripe.Price;
  type: 'flat' | 'metered' | 'per_seat';
};

function makeLineItem(overrides?: Partial<LineItemFixture>): LineItemFixture {
  return {
    id: 'si_abc',
    quantity: 1,
    price: makePrice(),
    type: 'flat',
    ...overrides,
  };
}

function buildBaseParams(
  overrides?: Partial<
    Parameters<
      ReturnType<typeof createStripeSubscriptionPayloadBuilderService>['build']
    >[0]
  >,
) {
  return {
    id: 'sub_123',
    organizationId: 'org_123',
    customerId: 'cus_123',
    lineItems: [makeLineItem()],
    status: 'active' as Stripe.Subscription.Status,
    currency: 'usd',
    cancelAtPeriodEnd: false,
    periodStartsAt: 1_700_000_000,
    periodEndsAt: 1_702_592_000,
    trialStartsAt: null,
    trialEndsAt: null,
    ...overrides,
  };
}

describe('StripeSubscriptionPayloadBuilderService.build', () => {
  it('projects an active flat-plan subscription into UpsertSubscriptionParams', () => {
    // Arrange
    const builder = createStripeSubscriptionPayloadBuilderService();

    // Act
    const payload = builder.build(buildBaseParams());

    // Assert — top-level subscription fields.
    expect(payload).toEqual(
      expect.objectContaining({
        target_subscription_id: 'sub_123',
        target_organization_id: 'org_123',
        target_customer_id: 'cus_123',
        billing_provider: 'stripe',
        status: 'active',
        active: true,
        currency: 'usd',
        cancel_at_period_end: false,
        // 1_700_000_000 s → 2023-11-14T22:13:20.000Z
        period_starts_at: '2023-11-14T22:13:20.000Z',
        // 1_702_592_000 s → 2023-12-14T22:13:20.000Z
        period_ends_at: '2023-12-14T22:13:20.000Z',
        trial_starts_at: undefined,
        trial_ends_at: undefined,
      }),
    );

    // And the single line-item projection.
    expect(payload.line_items).toHaveLength(1);
    expect(payload.line_items[0]).toEqual({
      id: 'si_abc',
      quantity: 1,
      subscription_id: 'sub_123',
      subscription_item_id: 'si_abc',
      product_id: 'prod_abc',
      variant_id: 'price_flat_monthly',
      price_amount: 1999,
      interval: 'month',
      interval_count: 1,
      type: 'flat',
    });
  });

  describe('active flag', () => {
    const activeStatuses: Stripe.Subscription.Status[] = ['active', 'trialing'];
    const inactiveStatuses: Stripe.Subscription.Status[] = [
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'unpaid',
      'paused',
    ];

    it.each(activeStatuses)('marks %s as active=true', (status) => {
      const builder = createStripeSubscriptionPayloadBuilderService();
      const payload = builder.build(buildBaseParams({ status }));
      expect(payload.active).toBe(true);
      expect(payload.status).toBe(status);
    });

    it.each(inactiveStatuses)('marks %s as active=false', (status) => {
      const builder = createStripeSubscriptionPayloadBuilderService();
      const payload = builder.build(buildBaseParams({ status }));
      expect(payload.active).toBe(false);
      expect(payload.status).toBe(status);
    });
  });

  it('passes cancelAtPeriodEnd through unchanged', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const payload = builder.build(buildBaseParams({ cancelAtPeriodEnd: true }));
    expect(payload.cancel_at_period_end).toBe(true);
  });

  describe('trial timestamps', () => {
    it('returns undefined trial fields when both trial timestamps are null', () => {
      const builder = createStripeSubscriptionPayloadBuilderService();
      const payload = builder.build(
        buildBaseParams({ trialStartsAt: null, trialEndsAt: null }),
      );
      expect(payload.trial_starts_at).toBeUndefined();
      expect(payload.trial_ends_at).toBeUndefined();
    });

    it('projects non-null trial timestamps as ISO strings', () => {
      const builder = createStripeSubscriptionPayloadBuilderService();
      const payload = builder.build(
        buildBaseParams({
          trialStartsAt: 1_700_000_000,
          trialEndsAt: 1_702_592_000,
        }),
      );
      expect(payload.trial_starts_at).toBe('2023-11-14T22:13:20.000Z');
      expect(payload.trial_ends_at).toBe('2023-12-14T22:13:20.000Z');
    });
  });

  it('defaults line item quantity to 1 when undefined', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const payload = builder.build(
      buildBaseParams({
        lineItems: [{ id: 'si_noqty', type: 'flat', price: makePrice() }],
      }),
    );
    expect(payload.line_items[0]!.quantity).toBe(1);
  });

  it('projects mixed line-item types (flat / metered / per_seat) in order', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const payload = builder.build(
      buildBaseParams({
        lineItems: [
          makeLineItem({ id: 'si_1', type: 'flat' }),
          makeLineItem({
            id: 'si_2',
            type: 'metered',
            quantity: 3,
            price: makePrice({ id: 'price_metered', product: 'prod_m' }),
          }),
          makeLineItem({
            id: 'si_3',
            type: 'per_seat',
            quantity: 7,
            price: makePrice({ id: 'price_per_seat', product: 'prod_s' }),
          }),
        ],
      }),
    );

    expect(payload.line_items).toHaveLength(3);
    expect(payload.line_items.map((li) => li.type)).toEqual([
      'flat',
      'metered',
      'per_seat',
    ]);
    expect(payload.line_items[1]!.quantity).toBe(3);
    expect(payload.line_items[1]!.variant_id).toBe('price_metered');
    expect(payload.line_items[1]!.product_id).toBe('prod_m');
    expect(payload.line_items[2]!.quantity).toBe(7);
    expect(payload.line_items[2]!.variant_id).toBe('price_per_seat');
  });
});

describe('StripeSubscriptionPayloadBuilderService period getters', () => {
  /**
   * Stripe 17 and below expose `current_period_start` / `current_period_end`
   * directly on the subscription. Stripe 18+ removed those in favour of
   * `items.data[i].current_period_*`. The builder must handle both so we
   * don't break on an SDK bump.
   */
  it('getPeriodStartsAt reads from the subscription for Stripe ≤17', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const subscription = {
      current_period_start: 1_700_000_000,
      items: { data: [{ current_period_start: 42 }] },
    } as unknown as Stripe.Subscription;
    expect(builder.getPeriodStartsAt(subscription)).toBe(1_700_000_000);
  });

  it('getPeriodStartsAt falls back to items[0].current_period_start for Stripe 18+', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const subscription = {
      items: { data: [{ current_period_start: 1_700_000_000 }] },
    } as unknown as Stripe.Subscription;
    expect(builder.getPeriodStartsAt(subscription)).toBe(1_700_000_000);
  });

  it('getPeriodEndsAt reads from the subscription for Stripe ≤17', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const subscription = {
      current_period_end: 1_702_592_000,
      items: { data: [{ current_period_end: 42 }] },
    } as unknown as Stripe.Subscription;
    expect(builder.getPeriodEndsAt(subscription)).toBe(1_702_592_000);
  });

  it('getPeriodEndsAt falls back to items[0].current_period_end for Stripe 18+', () => {
    const builder = createStripeSubscriptionPayloadBuilderService();
    const subscription = {
      items: { data: [{ current_period_end: 1_702_592_000 }] },
    } as unknown as Stripe.Subscription;
    expect(builder.getPeriodEndsAt(subscription)).toBe(1_702_592_000);
  });
});
