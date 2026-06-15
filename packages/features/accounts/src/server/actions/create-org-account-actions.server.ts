import { redirect } from '@tanstack/react-router';

import { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { Database } from '@guepard/supabase/database';
import { requireUser } from '@guepard/supabase/require-user';

import { CreateOrganizationSchema } from '../../schema';
import { createCreateOrganizationService } from '../services/create-organization.service';

export const createOrganizationAction = async (params: {
  client: SupabaseClient<Database>;
  data: z.infer<typeof CreateOrganizationSchema>;
}) => {
  const service = createCreateOrganizationService(params.client);
  const { name } = CreateOrganizationSchema.parse(params.data);

  const auth = await requireUser(params.client);

  if (!auth.data) {
    return redirect({ href: auth.redirectTo });
  }

  const { data, error } = await service.createNewOrganization({
    name,
    userId: auth.data.id,
  });

  if (error || !data) {
    throw new Error('Error creating organization');
  }

  const accountHomePath = '/home/' + data.slug;

  return redirect({ href: accountHomePath });
};
