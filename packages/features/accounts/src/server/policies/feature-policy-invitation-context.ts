import type { PolicyContext, PolicyResult } from '@qlm/policies';
import { Database } from '@qlm/supabase/database';

/**
 * Invitation policy context that extends the base PolicyContext
 * from @qlm/policies for invitation-specific data.
 */
export interface FeaturePolicyInvitationContext extends PolicyContext {
  /** The organization slug being invited to */
  organizationSlug: string;

  /** The organization ID being invited to (same as organizationId from base) */
  organizationId: string;

  /** Current subscription data for the organization */
  subscription?: {
    id: string;
    status: Database['public']['Enums']['subscription_status'];
    provider: Database['public']['Enums']['billing_provider'];
    active: boolean;
    trial_starts_at?: string;
    trial_ends_at?: string;
    items: Array<{
      id: string;
      type: Database['public']['Enums']['subscription_item_type'];
      quantity: number;
      product_id: string;
      variant_id: string;
    }>;
  };

  /** Current number of members in the account */
  currentMemberCount: number;

  /** The invitations being attempted */
  invitations: Array<{
    email: string;
    role: string;
  }>;

  /** The user performing the invitation */
  invitingUser: {
    id: string;
    email?: string;
  };
}

/**
 * Invitation policy result that extends the base PolicyResult
 * from @qlm/policies while maintaining backward compatibility.
 */
export interface FeaturePolicyInvitationResult extends PolicyResult {
  /** Whether the invitations are allowed */
  allowed: boolean;

  /** Human-readable reason if not allowed */
  reason?: string;

  /** Additional metadata for logging/debugging */
  metadata?: Record<string, unknown>;
}
