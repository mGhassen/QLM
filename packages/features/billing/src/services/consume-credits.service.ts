import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

export type ConsumptionType = 'storage' | 'tokens' | 'cpu' | 'gpu' | 'network';

export interface ConsumeCreditsParams {
  organizationId: string;
  accountId: string;
  projectId: string;
  userId: string;
  creditsAmount: number;
  usageId: string;
  consumptionType: ConsumptionType;
  consumptionAmount: number;
  description?: string;
}

/**
 * Consume credits for usage (storage, tokens, CPU, GPU, network)
 * Enforces hard limits on project and user quotas
 */
export async function consumeCredits(
  params: ConsumeCreditsParams,
  client: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await client.rpc('consume_credits', {
    target_organization_id: params.organizationId,
    target_account_id: params.accountId,
    target_project_id: params.projectId,
    target_user_id: params.userId,
    credits_amount: params.creditsAmount,
    usage_id: params.usageId,
    consumption_type: params.consumptionType,
    consumption_amount: params.consumptionAmount,
    description: params.description ?? undefined,
  });

  if (error) {
    throw new Error(`Failed to consume credits: ${error.message}`);
  }
}
