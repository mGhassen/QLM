import { redirect } from '@tanstack/react-router';

import { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { Database } from '@qlm/supabase/database';
import { requireUser } from '@qlm/supabase/require-user';
import { getSupabaseServerAdminClient } from '@qlm/supabase/server-admin-client';

import { LeaveOrganizationSchema } from '../../schema';
import { createLeaveOrganizationService } from '../services/leave-organization.service';

export const leaveOrganizationAction = async (params: {
  data: z.infer<typeof LeaveOrganizationSchema>;
  client: SupabaseClient<Database>;
}) => {
  const { payload } = LeaveOrganizationSchema.parse(params.data);

  const auth = await requireUser(params.client);

  if (!auth.data) {
    return redirect({ href: auth.redirectTo });
  }

  const service = createLeaveOrganizationService(
    getSupabaseServerAdminClient(),
  );

  await service.leaveOrganization({
    organizationId: payload.organizationId,
    userId: auth.data.id,
  });

  return redirect({ href: '/home' });
};
