import { redirect } from '@tanstack/react-router';

import { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { createOtpApi } from '@guepard/otp';
import { Database } from '@guepard/supabase/database';
import { requireUser } from '@guepard/supabase/require-user';

import { DeleteOrganizationSchema } from '../../schema';
import { createDeleteOrganizationService } from '../services/delete-organization.service';

export const deleteOrganizationAction = async (params: {
  client: SupabaseClient<Database>;
  data: z.infer<typeof DeleteOrganizationSchema>;
}) => {
  const { payload } = DeleteOrganizationSchema.parse(params.data);
  const organizationId = payload.organizationId;
  const auth = await requireUser(params.client);

  if (!auth.data) {
    return redirect({ href: auth.redirectTo });
  }

  const userId = auth.data.id;
  const otpApi = createOtpApi(params.client);

  const otpResult = await otpApi.verifyToken({
    purpose: `delete-organization-${organizationId}`,
    userId,
    token: payload.otp,
  });

  if (!otpResult.valid) {
    throw new Error('Invalid OTP code');
  }

  if (otpResult.user_id !== userId) {
    throw new Error('Nonce User ID mismatch');
  }

  await deleteOrganization(params.client, {
    organizationId,
    userId,
  });

  return redirect({ href: '/home' });
};

async function deleteOrganization(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    userId: string;
  },
) {
  const service = createDeleteOrganizationService();

  // verify that the user has the necessary permissions to delete the organization
  await assertUserPermissionsToDeleteOrganization(client, params);

  // delete the organization
  await service.deleteOrganization(client, params);
}

async function assertUserPermissionsToDeleteOrganization(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    userId: string;
  },
) {
  // `is_personal_account` was removed when organizations became the only
  // account type — all rows in `accounts` are now team/org accounts.
  const { data, error } = await client
    .from('accounts')
    .select('id')
    .eq('user_id', params.userId)
    .eq('id', params.organizationId)
    .single();

  if (error ?? !data) {
    throw new Error('Account not found');
  }
}
