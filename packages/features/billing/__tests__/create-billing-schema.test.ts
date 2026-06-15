import { describe, expect, it } from 'vitest';

import {
  createBillingSchema,
  getPlanTypesMap,
  getPrimaryLineItem,
  getProductPlanPair,
  getProductPlanPairByVariantId,
  type BillingConfig,
} from '../src/schema/create-billing-schema';

/**
 * A minimal valid BillingConfig: one product, two recurring plans (monthly
 * and yearly), each plan with a single flat line item. Every test either
 * passes this through unchanged (happy path) or mutates a deep clone to
 * exercise a specific validation or helper branch.
 */
function makeConfig(): BillingConfig {
  return {
    provider: 'stripe',
    products: [
      {
        id: 'prod_pro',
        name: 'Pro',
        description: 'Pro tier',
        currency: 'USD',
        features: ['feature-1'],
        plans: [
          {
            id: 'plan_pro_monthly',
            name: 'Pro Monthly',
            interval: 'month',
            paymentType: 'recurring',
            lineItems: [
              {
                id: 'price_pro_monthly_flat',
                name: 'Pro Monthly Flat',
                cost: 19,
                type: 'flat',
              },
            ],
          },
          {
            id: 'plan_pro_yearly',
            name: 'Pro Yearly',
            interval: 'year',
            paymentType: 'recurring',
            lineItems: [
              {
                id: 'price_pro_yearly_flat',
                name: 'Pro Yearly Flat',
                cost: 199,
                type: 'flat',
              },
            ],
          },
        ],
      },
    ],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('createBillingSchema (BillingSchema.parse)', () => {
  it('accepts a valid config unchanged', () => {
    const config = makeConfig();
    const parsed = createBillingSchema(config);
    expect(parsed.provider).toBe('stripe');
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0]!.plans).toHaveLength(2);
  });

  it('rejects duplicate plan IDs within a product', () => {
    const config = clone(makeConfig());
    config.products[0]!.plans[1]!.id = config.products[0]!.plans[0]!.id;
    expect(() => createBillingSchema(config)).toThrowError(
      /Plan IDs must be unique/,
    );
  });

  it('rejects duplicate line item IDs across the config', () => {
    const config = clone(makeConfig());
    config.products[0]!.plans[1]!.lineItems[0]!.id =
      config.products[0]!.plans[0]!.lineItems[0]!.id;
    expect(() => createBillingSchema(config)).toThrowError(
      /Line item IDs must be unique/,
    );
  });

  it('rejects a one-time plan that also carries an interval', () => {
    const config = clone(makeConfig());
    const plan = config.products[0]!.plans[0]!;
    plan.paymentType = 'one-time';
    // interval is already set to 'month' from the fixture — that's the conflict.
    expect(() => createBillingSchema(config)).toThrowError(
      /One-time plans must not have an interval/,
    );
  });

  it('rejects a recurring plan without an interval', () => {
    const config = clone(makeConfig());
    delete config.products[0]!.plans[0]!.interval;
    expect(() => createBillingSchema(config)).toThrowError(
      /Recurring plans must have an interval/,
    );
  });

  it('rejects a metered line item with a non-zero cost', () => {
    const config = clone(makeConfig());
    config.products[0]!.plans[0]!.lineItems[0] = {
      id: 'price_metered',
      name: 'Metered',
      cost: 5, // must be 0 for metered
      type: 'metered',
      unit: 'request',
      tiers: [{ cost: 0, upTo: 'unlimited' }],
    };
    expect(() => createBillingSchema(config)).toThrowError(
      /Metered line items must have a cost of 0/,
    );
  });

  it('rejects a plan with two flat line items', () => {
    const config = clone(makeConfig());
    config.products[0]!.plans[0]!.lineItems = [
      {
        id: 'price_flat_a',
        name: 'Flat A',
        cost: 10,
        type: 'flat',
      },
      {
        id: 'price_flat_b',
        name: 'Flat B',
        cost: 20,
        type: 'flat',
      },
    ];
    expect(() => createBillingSchema(config)).toThrowError(
      /Plans can only have one per-seat and one flat line item/,
    );
  });
});

describe('getPlanTypesMap', () => {
  it('maps every line item id to its type across all plans and products', () => {
    const config = createBillingSchema(makeConfig());
    const map = getPlanTypesMap(config);

    expect(map.size).toBe(2);
    expect(map.get('price_pro_monthly_flat')).toBe('flat');
    expect(map.get('price_pro_yearly_flat')).toBe('flat');
  });

  it('preserves metered and per_seat types', () => {
    const config = createBillingSchema({
      provider: 'stripe',
      products: [
        {
          id: 'prod_mix',
          name: 'Mix',
          description: 'Mix',
          currency: 'USD',
          features: ['x'],
          plans: [
            {
              id: 'plan_mix',
              name: 'Mix',
              interval: 'month',
              paymentType: 'recurring',
              lineItems: [
                {
                  id: 'price_flat',
                  name: 'Flat',
                  cost: 10,
                  type: 'flat',
                },
                {
                  id: 'price_seat',
                  name: 'Per seat',
                  cost: 5,
                  type: 'per_seat',
                },
                {
                  id: 'price_metered',
                  name: 'Metered',
                  cost: 0,
                  type: 'metered',
                  unit: 'request',
                  tiers: [{ cost: 0, upTo: 'unlimited' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const map = getPlanTypesMap(config);
    expect(map.get('price_flat')).toBe('flat');
    expect(map.get('price_seat')).toBe('per_seat');
    expect(map.get('price_metered')).toBe('metered');
  });
});

describe('getPrimaryLineItem', () => {
  it('returns the flat line item when one is present on the plan', () => {
    const config = createBillingSchema(makeConfig());
    const primary = getPrimaryLineItem(config, 'plan_pro_monthly');
    expect(primary).toMatchObject({
      id: 'price_pro_monthly_flat',
      type: 'flat',
    });
  });

  it('returns the first line item when no flat is present', () => {
    const config = createBillingSchema({
      provider: 'stripe',
      products: [
        {
          id: 'prod_metered_only',
          name: 'Metered Only',
          description: 'Metered Only',
          currency: 'USD',
          features: ['x'],
          plans: [
            {
              id: 'plan_metered_only',
              name: 'Metered Only',
              interval: 'month',
              paymentType: 'recurring',
              lineItems: [
                {
                  id: 'price_m1',
                  name: 'First',
                  cost: 0,
                  type: 'metered',
                  unit: 'req',
                  tiers: [{ cost: 0, upTo: 'unlimited' }],
                },
                {
                  id: 'price_s1',
                  name: 'Seat',
                  cost: 5,
                  type: 'per_seat',
                },
              ],
            },
          ],
        },
      ],
    });
    const primary = getPrimaryLineItem(config, 'plan_metered_only');
    expect(primary).toMatchObject({ id: 'price_m1', type: 'metered' });
  });

  it('throws when the plan id is not found', () => {
    const config = createBillingSchema(makeConfig());
    expect(() =>
      getPrimaryLineItem(config, 'plan_does_not_exist'),
    ).toThrowError(/Base line item not found/);
  });
});

describe('getProductPlanPair', () => {
  it('returns the matching product and plan for a known plan id', () => {
    const config = createBillingSchema(makeConfig());
    const pair = getProductPlanPair(config, 'plan_pro_yearly');
    expect(pair.product.id).toBe('prod_pro');
    expect(pair.plan.id).toBe('plan_pro_yearly');
  });

  it('throws when the plan id is not found', () => {
    const config = createBillingSchema(makeConfig());
    expect(() => getProductPlanPair(config, 'plan_unknown')).toThrowError(
      /Plan not found/,
    );
  });
});

describe('getProductPlanPairByVariantId', () => {
  it('returns the matching product and plan for a known line-item (variant) id', () => {
    const config = createBillingSchema(makeConfig());
    const pair = getProductPlanPairByVariantId(config, 'price_pro_yearly_flat');
    expect(pair.product.id).toBe('prod_pro');
    expect(pair.plan.id).toBe('plan_pro_yearly');
  });

  it('throws when the variant id is not found on any plan', () => {
    const config = createBillingSchema(makeConfig());
    expect(() =>
      getProductPlanPairByVariantId(config, 'price_unknown'),
    ).toThrowError(/Plan not found/);
  });
});
