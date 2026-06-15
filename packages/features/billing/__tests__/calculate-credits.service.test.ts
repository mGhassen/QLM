import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

import { calculateCreditsFromPurchase } from '../src/services/calculate-credits.service';

function makeFakeClient(
  rpc = vi.fn().mockResolvedValue({ data: 0, error: null }),
) {
  return {
    rpc,
    fakeClient: { rpc } as unknown as SupabaseClient<Database>,
  };
}

describe('calculateCreditsFromPurchase', () => {
  it('invokes the calculate_credits_from_amount RPC with the amount in cents', async () => {
    const { rpc, fakeClient } = makeFakeClient(
      vi.fn().mockResolvedValue({ data: 1000, error: null }),
    );
    const result = await calculateCreditsFromPurchase(2500, fakeClient);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('calculate_credits_from_amount', {
      amount_cents: 2500,
    });
    expect(result).toBe(1000);
  });

  it('returns the credits value the RPC resolves with', async () => {
    const { fakeClient } = makeFakeClient(
      vi.fn().mockResolvedValue({ data: 9999, error: null }),
    );
    const result = await calculateCreditsFromPurchase(49_999, fakeClient);
    expect(result).toBe(9999);
  });

  it('throws a descriptive error when the RPC surfaces a failure', async () => {
    const { fakeClient } = makeFakeClient(
      vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'bad amount' } }),
    );
    await expect(calculateCreditsFromPurchase(-1, fakeClient)).rejects.toThrow(
      'Failed to calculate credits: bad amount',
    );
  });
});
