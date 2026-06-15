import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

import {
  consumeCredits,
  type ConsumeCreditsParams,
} from '../src/services/consume-credits.service';

/**
 * Build a fake Supabase client whose `.rpc` is a configurable `vi.fn()`.
 * Tests can override its resolved value per-case. We cast to
 * `SupabaseClient<Database>` because the real client has many methods we
 * don't exercise and the service only reaches for `rpc`.
 */
function makeFakeClient(rpc = vi.fn().mockResolvedValue({ error: null })) {
  return {
    rpc,
    fakeClient: { rpc } as unknown as SupabaseClient<Database>,
  };
}

function baseParams(
  overrides?: Partial<ConsumeCreditsParams>,
): ConsumeCreditsParams {
  return {
    organizationId: 'org_1',
    accountId: 'acc_1',
    projectId: 'prj_1',
    userId: 'usr_1',
    creditsAmount: 100,
    usageId: '42',
    consumptionType: 'tokens',
    consumptionAmount: 1234,
    description: 'agent query',
    ...overrides,
  };
}

describe('consumeCredits', () => {
  it('invokes the consume_credits RPC with the mapped arguments', async () => {
    const { rpc, fakeClient } = makeFakeClient();
    await consumeCredits(baseParams(), fakeClient);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('consume_credits', {
      target_organization_id: 'org_1',
      target_account_id: 'acc_1',
      target_project_id: 'prj_1',
      target_user_id: 'usr_1',
      credits_amount: 100,
      usage_id: '42',
      consumption_type: 'tokens',
      consumption_amount: 1234,
      description: 'agent query',
    });
  });

  it('passes description as undefined when the caller omits it', async () => {
    const { rpc, fakeClient } = makeFakeClient();
    await consumeCredits(baseParams({ description: undefined }), fakeClient);
    expect(rpc.mock.calls[0]![1].description).toBeUndefined();
  });

  it('throws a descriptive error when the RPC surfaces a failure', async () => {
    const { fakeClient } = makeFakeClient(
      vi.fn().mockResolvedValue({ error: { message: 'quota exceeded' } }),
    );
    await expect(consumeCredits(baseParams(), fakeClient)).rejects.toThrow(
      'Failed to consume credits: quota exceeded',
    );
  });
});
