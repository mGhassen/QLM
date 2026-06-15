import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@qlm/supabase/database';

/**
 * Calculate credits from purchase amount using volume pricing tiers
 */
export async function calculateCreditsFromPurchase(
  amountInCents: number,
  client: SupabaseClient<Database>,
): Promise<number> {
  const { data, error } = await client.rpc('calculate_credits_from_amount', {
    amount_cents: amountInCents,
  });

  if (error) {
    throw new Error(`Failed to calculate credits: ${error.message}`);
  }

  return data;
}
