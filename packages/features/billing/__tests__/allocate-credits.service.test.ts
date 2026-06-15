import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

import {
  allocateCreditsQuota,
  type AllocateCreditsParams,
} from '../src/services/allocate-credits.service';

function makeFakeClient(rpc = vi.fn().mockResolvedValue({ error: null })) {
  return {
    rpc,
    fakeClient: { rpc } as unknown as SupabaseClient<Database>,
  };
}

function baseParams(
  overrides?: Partial<AllocateCreditsParams>,
): AllocateCreditsParams {
  return {
    organizationId: 'org_1',
    accountId: 'acc_1',
    creditsAmount: 500,
    projectId: 'prj_1',
    userId: 'usr_1',
    description: 'monthly grant',
    ...overrides,
  };
}

describe('allocateCreditsQuota', () => {
  it('invokes the allocate_credits_quota RPC with the mapped arguments', async () => {
    const { rpc, fakeClient } = makeFakeClient();
    await allocateCreditsQuota(baseParams(), fakeClient);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('allocate_credits_quota', {
      target_organization_id: 'org_1',
      target_account_id: 'acc_1',
      credits_amount: 500,
      target_project_id: 'prj_1',
      target_user_id: 'usr_1',
      description: 'monthly grant',
    });
  });

  it('passes optional project, user, and description as undefined when omitted', async () => {
    const { rpc, fakeClient } = makeFakeClient();
    await allocateCreditsQuota(
      {
        organizationId: 'org_2',
        accountId: 'acc_2',
        creditsAmount: 200,
      },
      fakeClient,
    );
    const args = rpc.mock.calls[0]![1];
    expect(args.target_project_id).toBeUndefined();
    expect(args.target_user_id).toBeUndefined();
    expect(args.description).toBeUndefined();
  });

  it('throws a descriptive error when the RPC surfaces a failure', async () => {
    const { fakeClient } = makeFakeClient(
      vi.fn().mockResolvedValue({ error: { message: 'insufficient balance' } }),
    );
    await expect(
      allocateCreditsQuota(baseParams(), fakeClient),
    ).rejects.toThrow('Failed to allocate credits: insufficient balance');
  });
});
