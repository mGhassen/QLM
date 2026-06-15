import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

export interface AllocateCreditsParams {
  organizationId: string;
  accountId: string;
  creditsAmount: number;
  projectId?: string;
  userId?: string;
  description?: string;
}

/**
 * Allocate credits from organization balance to project or user quota
 * This creates a hard limit that cannot be exceeded
 */
export async function allocateCreditsQuota(
  params: AllocateCreditsParams,
  client: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await client.rpc('allocate_credits_quota', {
    target_organization_id: params.organizationId,
    target_account_id: params.accountId,
    credits_amount: params.creditsAmount,
    target_project_id: params.projectId ?? undefined,
    target_user_id: params.userId ?? undefined,
    description: params.description ?? undefined,
  });

  if (error) {
    throw new Error(`Failed to allocate credits: ${error.message}`);
  }
}
