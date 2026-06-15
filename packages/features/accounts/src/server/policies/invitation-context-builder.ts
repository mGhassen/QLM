import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import type { Database } from '@qlm/supabase/database';

import { InviteMembersSchema } from '../../schema/invite-members.schema';
import type { FeaturePolicyInvitationContext } from './feature-policy-invitation-context';

/**
 * Creates an invitation context builder
 * @param client - The Supabase client
 * @returns
 */
export function createInvitationContextBuilder(
  client: SupabaseClient<Database>,
) {
  return new InvitationContextBuilder(client);
}

/**
 * Invitation context builder
 */
class InvitationContextBuilder {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * Build policy context for invitation evaluation with optimized parallel loading
   */
  async buildContext(
    params: z.infer<typeof InviteMembersSchema>['payload'],
    user: JwtPayload,
  ): Promise<FeaturePolicyInvitationContext> {
    // Fetch all data in parallel for optimal performance
    const organization = await this.getOrganization(params.organizationSlug);

    // Fetch subscription and member count in parallel using account ID
    const [subscription, memberCount] = await Promise.all([
      this.getSubscription(organization.id),
      this.getMemberCount(organization.id),
    ]);

    return {
      // Base PolicyContext fields
      timestamp: new Date().toISOString(),
      metadata: {
        organizationSlug: params.organizationSlug,
        invitationCount: params.invitations.length,
        invitingUserEmail: user.email as string,
      },

      // Invitation-specific fields
      organizationSlug: params.organizationSlug,
      organizationId: organization.id,
      subscription,
      currentMemberCount: memberCount,
      invitations: params.invitations,
      invitingUser: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Gets the account from the database
   * @param accountSlug - The slug of the account to get
   * @returns
   */
  private async getOrganization(organizationSlug: string) {
    const { data: account } = await this.client
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .single();

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  /**
   * Gets the subscription from the database
   * @param accountId - The ID of the account to get the subscription for
   * @returns
   */
  private async getSubscription(accountId: string) {
    const { data: subscription } = await this.client
      .from('subscriptions')
      .select(
        `
        id,
        status,
        active,
        trial_starts_at,
        trial_ends_at,
        billing_provider,
        subscription_items(
          id,
          type,
          quantity,
          product_id,
          variant_id
        )
      `,
      )
      .eq('organization_id', accountId)
      .eq('active', true)
      .single();

    return subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          provider: subscription.billing_provider,
          active: subscription.active,
          trial_starts_at: subscription.trial_starts_at || undefined,
          trial_ends_at: subscription.trial_ends_at || undefined,
          items:
            subscription.subscription_items?.map((item) => ({
              id: item.id,
              type: item.type,
              quantity: item.quantity,
              product_id: item.product_id,
              variant_id: item.variant_id,
            })) || [],
        }
      : undefined;
  }

  /**
   * Gets the member count from the database
   * @param accountId - The ID of the account to get the member count for
   * @returns
   */
  private async getMemberCount(organizationId: string) {
    const { count } = await this.client
      .from('organization_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    return count || 0;
  }
}
