import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@qlm/supabase/database';

import type { BillingWebhookHandlerService } from '../src/ports/billing-webhook-handler.service';
import { createBillingEventHandlerService } from '../src/services/billing-event-handler.service';

vi.mock('@qlm/shared/logger', () => ({
  getLogger: vi.fn().mockResolvedValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

/**
 * The orchestrator imports `./create-invoice-from-payment-intent` *dynamically*
 * inside `onPaymentIntentSucceeded`. Hoist a vi.fn so tests can stub it.
 */
const createInvoiceFromPaymentIntent = vi.fn();
vi.mock('../src/services/create-invoice-from-payment-intent', () => ({
  createInvoiceFromPaymentIntent,
}));

// ---------------------------------------------------------------------------
// Fake Supabase client — only the surface the orchestrator exercises.
// ---------------------------------------------------------------------------

type SupabaseResult<T = null> = { data: T; error: null | { message: string } };

function buildFakeClient(overrides?: {
  rpc?: (name: string, args: unknown) => Promise<SupabaseResult<unknown>>;
  deleteResult?: SupabaseResult;
  updateResult?: SupabaseResult;
}) {
  const rpc = vi.fn(
    overrides?.rpc ??
      (() => Promise.resolve({ data: null, error: null } as SupabaseResult)),
  );
  const deleteMatch = vi
    .fn()
    .mockResolvedValue(overrides?.deleteResult ?? { data: null, error: null });
  const updateMatch = vi
    .fn()
    .mockResolvedValue(overrides?.updateResult ?? { data: null, error: null });

  const from = vi.fn().mockReturnValue({
    delete: () => ({ match: deleteMatch }),
    update: () => ({ match: updateMatch }),
  });

  const client = { rpc, from } as unknown as SupabaseClient<Database>;
  return { client, rpc, from, deleteMatch, updateMatch };
}

/**
 * Fake webhook-handler strategy: `verifyWebhookSignature` returns whatever
 * the test wants to stand in for the event, and `handleWebhookEvent` is
 * a `vi.fn()` the test drives — it either fires none of the wrappers (to
 * assert pass-through) or invokes a specific wrapper with test data.
 */
function buildFakeStrategy(): BillingWebhookHandlerService & {
  _handle: ReturnType<typeof vi.fn>;
} {
  const _handle = vi.fn();
  return {
    verifyWebhookSignature: vi.fn().mockResolvedValue({ type: 'test.event' }),
    handleWebhookEvent: _handle,
    _handle,
  } as unknown as BillingWebhookHandlerService & {
    _handle: ReturnType<typeof vi.fn>;
  };
}

function buildRequest() {
  return new Request('https://test.local/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    body: '{}',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createBillingEventHandlerService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when the strategy returns no event from verifyWebhookSignature', async () => {
    const { client } = buildFakeClient();
    const strategy = buildFakeStrategy();
    (strategy.verifyWebhookSignature as ReturnType<typeof vi.fn>)
      .mockReset()
      .mockResolvedValue(undefined);

    const svc = createBillingEventHandlerServiceWith(() => client, strategy);

    await expect(svc.handleWebhookEvent(buildRequest())).rejects.toThrow(
      'Invalid signature',
    );
  });

  it('onPaymentIntentSucceeded: calls calculate + upsert_order + invoice + user callback', async () => {
    createInvoiceFromPaymentIntent.mockResolvedValueOnce('in_created_123');
    const { client, rpc } = buildFakeClient({
      rpc: (name) => {
        if (name === 'calculate_credits_from_amount') {
          return Promise.resolve({
            data: 250,
            error: null,
          } as SupabaseResult<number>);
        }
        return Promise.resolve({ data: null, error: null } as SupabaseResult);
      },
    });

    const onPaymentIntentSucceeded = vi.fn().mockResolvedValue(undefined);
    const strategy = buildFakeStrategy();
    strategy._handle.mockImplementationOnce(async (_event, wrappers) => {
      await wrappers.onPaymentIntentSucceeded({
        paymentIntentId: 'pi_test_999',
        organizationId: 'org_999',
        amount: 2500,
        currency: 'usd',
        customerId: 'cus_999',
        metadata: { productId: 'prod_x', priceId: 'price_x' },
      });
    });

    const svc = createBillingEventHandlerServiceWith(() => client, strategy);
    await svc.handleWebhookEvent(buildRequest(), { onPaymentIntentSucceeded });

    // 1. calculate_credits_from_amount called with the cents amount
    expect(rpc).toHaveBeenCalledWith('calculate_credits_from_amount', {
      amount_cents: 2500,
    });

    // 2. upsert_order called with the built payload (payment-intent id as order id,
    //    status=succeeded, line items carrying metadata)
    const upsertOrderCall = rpc.mock.calls.find((c) => c[0] === 'upsert_order');
    expect(upsertOrderCall).toBeDefined();
    const upsertOrderPayload = upsertOrderCall![1] as Record<string, unknown>;
    expect(upsertOrderPayload).toMatchObject({
      target_order_id: 'pi_test_999',
      target_organization_id: 'org_999',
      target_customer_id: 'cus_999',
      status: 'succeeded',
      currency: 'usd',
      total_amount: 2500,
    });

    // 3. Stripe invoice creation called with the credits amount from step 1
    expect(createInvoiceFromPaymentIntent).toHaveBeenCalledWith(
      'pi_test_999',
      'cus_999',
      2500,
      'usd',
      'Credits purchase: 250 credits',
      expect.objectContaining({
        organizationId: 'org_999',
        orderId: 'pi_test_999',
        creditsAmount: '250',
      }),
    );

    // 4. user callback ran last with the original data
    expect(onPaymentIntentSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 'pi_test_999',
        organizationId: 'org_999',
      }),
    );
  });

  it('onPaymentIntentSucceeded: continues past invoice creation failure (logged, not thrown)', async () => {
    createInvoiceFromPaymentIntent.mockRejectedValueOnce(
      new Error('stripe-api-down'),
    );
    const { client } = buildFakeClient({
      rpc: (name) => {
        if (name === 'calculate_credits_from_amount') {
          return Promise.resolve({
            data: 100,
            error: null,
          } as SupabaseResult<number>);
        }
        return Promise.resolve({ data: null, error: null } as SupabaseResult);
      },
    });
    const onPaymentIntentSucceeded = vi.fn().mockResolvedValue(undefined);

    const strategy = buildFakeStrategy();
    strategy._handle.mockImplementationOnce(async (_event, wrappers) => {
      await wrappers.onPaymentIntentSucceeded({
        paymentIntentId: 'pi_invoice_fail',
        organizationId: 'org_1',
        amount: 1000,
        currency: 'usd',
        customerId: 'cus_1',
        metadata: {},
      });
    });

    const svc = createBillingEventHandlerServiceWith(() => client, strategy);

    await expect(
      svc.handleWebhookEvent(buildRequest(), { onPaymentIntentSucceeded }),
    ).resolves.toBeUndefined();

    // user callback still runs — invoice failure is non-fatal by design
    expect(onPaymentIntentSucceeded).toHaveBeenCalledTimes(1);
  });

  it('onPaymentIntentSucceeded: throws when calculate_credits_from_amount returns an error', async () => {
    const { client } = buildFakeClient({
      rpc: (name) => {
        if (name === 'calculate_credits_from_amount') {
          return Promise.resolve({
            data: null,
            error: { message: 'bad amount' },
          } as SupabaseResult);
        }
        return Promise.resolve({ data: null, error: null } as SupabaseResult);
      },
    });

    const strategy = buildFakeStrategy();
    strategy._handle.mockImplementationOnce(async (_event, wrappers) => {
      await wrappers.onPaymentIntentSucceeded({
        paymentIntentId: 'pi_bad',
        organizationId: 'org_bad',
        amount: -1,
        currency: 'usd',
        customerId: 'cus_bad',
        metadata: {},
      });
    });

    const svc = createBillingEventHandlerServiceWith(() => client, strategy);
    await expect(svc.handleWebhookEvent(buildRequest())).rejects.toThrow(
      'Failed to calculate credits',
    );
  });

  it('onPaymentIntentFailed: upserts a failed order and calls the user callback', async () => {
    const { client, rpc } = buildFakeClient();
    const onPaymentIntentFailed = vi.fn().mockResolvedValue(undefined);

    const strategy = buildFakeStrategy();
    strategy._handle.mockImplementationOnce(async (_event, wrappers) => {
      await wrappers.onPaymentIntentFailed!({
        paymentIntentId: 'pi_fail',
        organizationId: 'org_fail',
        amount: 500,
        currency: 'usd',
        customerId: 'cus_fail',
        metadata: { productId: 'prod_p', priceId: 'price_p' },
      });
    });

    const svc = createBillingEventHandlerServiceWith(() => client, strategy);
    await svc.handleWebhookEvent(buildRequest(), { onPaymentIntentFailed });

    const upsertCall = rpc.mock.calls.find((c) => c[0] === 'upsert_order');
    expect(upsertCall).toBeDefined();
    expect(upsertCall![1]).toMatchObject({
      target_order_id: 'pi_fail',
      status: 'failed',
      total_amount: 500,
    });
    expect(onPaymentIntentFailed).toHaveBeenCalledTimes(1);
  });

  it('onSubscriptionDeleted: removes the subscription row and calls the user callback', async () => {
    const { client, from, deleteMatch } = buildFakeClient();
    const onSubscriptionDeleted = vi.fn().mockResolvedValue(undefined);

    const strategy = buildFakeStrategy();
    strategy._handle.mockImplementationOnce(async (_event, wrappers) => {
      await wrappers.onSubscriptionDeleted('sub_gone_123');
    });

    const svc = createBillingEventHandlerServiceWith(() => client, strategy);
    await svc.handleWebhookEvent(buildRequest(), { onSubscriptionDeleted });

    expect(from).toHaveBeenCalledWith('subscriptions');
    expect(deleteMatch).toHaveBeenCalledWith({ id: 'sub_gone_123' });
    expect(onSubscriptionDeleted).toHaveBeenCalledWith('sub_gone_123');
  });
});

/**
 * Small factory that reaches around `createBillingEventHandlerService`'s
 * own `new StripeWebhookHandlerService(planTypesMap)` construction and
 * hands in our fake strategy. We do this by re-exporting the underlying
 * class — the real factory only wraps it, so replacing the instance is
 * equivalent to what a DI-aware factory would offer.
 */
function createBillingEventHandlerServiceWith(
  clientProvider: () => SupabaseClient<Database>,
  fakeStrategy: BillingWebhookHandlerService,
) {
  // We don't use the real factory here because it constructs its own
  // strategy. Instead, reach into the same module to re-build the class
  // the factory builds, but with our fake strategy.
  // Accessing via the factory's exported constructor keeps this test
  // agnostic to private internals.
  const svc = createBillingEventHandlerService(clientProvider, new Map());
  // Swap the internal strategy for our fake. The field is private; in a
  // black-box test we'd normally wrap at the factory layer, but phase-1
  // scope keeps us from adding a new DI seam.
  (svc as unknown as { strategy: BillingWebhookHandlerService }).strategy =
    fakeStrategy;
  return svc;
}
