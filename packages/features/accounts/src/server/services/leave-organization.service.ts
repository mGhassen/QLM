import { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { getLogger } from '@guepard/shared/logger';
import { Database } from '@guepard/supabase/database';

const Schema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
});

export function createLeaveOrganizationService(
  client: SupabaseClient<Database>,
) {
  return new LeaveOrganizationService(client);
}

/**
 * @name LeaveOrganizationService
 * @description Service for leaving an organization.
 */
class LeaveOrganizationService {
  private readonly namespace = 'leave-organization';

  constructor(private readonly adminClient: SupabaseClient<Database>) {}

  /**
   * @name leaveOrganization
   * @description Leave a organization
   * @param params
   */
  async leaveOrganization(params: z.infer<typeof Schema>) {
    const logger = await getLogger();

    const ctx = {
      ...params,
      name: this.namespace,
    };

    logger.info(ctx, 'Leaving organization...');

    const { organizationId, userId } = Schema.parse(params);

    const { error } = await this.adminClient
      .from('organization_memberships')
      .delete()
      .match({
        organization_id: organizationId,
        user_id: userId,
      });

    if (error) {
      logger.error({ ...ctx, error }, 'Failed to leave organization');

      throw new Error('Failed to leave organization');
    }

    logger.info(ctx, 'Successfully left organization');
  }
}
