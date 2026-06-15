import { SupabaseClient } from '@supabase/supabase-js';

import { getLogger } from '@qlm/shared/logger';
import { Database } from '@qlm/supabase/database';

export function createCreateOrganizationService(
  client: SupabaseClient<Database>,
) {
  return new CreateOrganizationService(client);
}

class CreateOrganizationService {
  private readonly namespace = 'accounts.create-organization';

  constructor(private readonly client: SupabaseClient<Database>) {}

  async createNewOrganization(params: { name: string; userId: string }) {
    const logger = await getLogger();
    const ctx = { ...params, namespace: this.namespace };

    logger.info(ctx, `Creating new organization...`);

    // Slug will be automatically set by the database trigger
    const { error, data } = await this.client
      .from('organizations')
      .insert({
        name: params.name,
        user_id: params.userId,
        slug: null as unknown as string, // Trigger will set this before NOT NULL check
      })
      .select('id, name, slug')
      .single();

    if (error) {
      logger.error(
        {
          error,
          ...ctx,
        },
        `Error creating organization`,
      );

      throw new Error('Error creating organization');
    }

    logger.info(ctx, `Organization created successfully`);

    return { data, error };
  }
}
