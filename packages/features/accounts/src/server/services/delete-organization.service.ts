import { SupabaseClient } from '@supabase/supabase-js';

import { getLogger } from '@qlm/shared/logger';
import { Database } from '@qlm/supabase/database';

export function createDeleteOrganizationService() {
  return new DeleteOrganizationService();
}

class DeleteOrganizationService {
  private readonly namespace = 'accounts.delete-organization';

  /**
   * Deletes a organization. Permissions are not checked here, as they are
   * checked in the server action.
   *
   * USE WITH CAUTION. THE USER MUST HAVE THE NECESSARY PERMISSIONS.
   *
   * @param adminClient
   * @param params
   */
  async deleteOrganization(
    adminClient: SupabaseClient<Database>,
    params: {
      organizationId: string;
      userId: string;
    },
  ) {
    const logger = await getLogger();

    const ctx = {
      organizationId: params.organizationId,
      userId: params.userId,
      name: this.namespace,
    };

    logger.info(ctx, `Requested organization deletion. Processing...`);

    // we can use the admin client to delete the organization.
    const { error } = await adminClient
      .from('organizations')
      .delete()
      .eq('id', params.organizationId);

    if (error) {
      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to delete organization',
      );

      throw new Error('Failed to delete organization');
    }

    logger.info(ctx, 'Successfully deleted organization');
  }
}
