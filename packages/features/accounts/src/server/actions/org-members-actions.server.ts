import { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { createOtpApi } from '@guepard/otp';
import { Database } from '@guepard/supabase/database';
import { requireUser } from '@guepard/supabase/require-user';
import { getSupabaseServerAdminClient } from '@guepard/supabase/server-admin-client';

import {
  RemoveMemberSchema,
  TransferOwnershipSchema,
  UpdateMemberRoleSchema,
} from '../../schema';
import { createAccountMembersService } from '../services/account-members.service';

/**
 * @name removeMemberFromAccountAction
 * @description Removes a member from an account.
 */
export const removeMemberFromAccountAction = async (params: {
  client: SupabaseClient<Database>;
  data: z.infer<typeof RemoveMemberSchema>;
}) => {
  const data = RemoveMemberSchema.parse(params.data);

  const service = createAccountMembersService(params.client);

  return service.removeMemberFromAccount(data);
};

/**
 * @name updateMemberRoleAction
 * @description Updates the role of a member in an account.
 */
export const updateMemberRoleAction = async (params: {
  client: SupabaseClient<Database>;
  data: z.infer<typeof UpdateMemberRoleSchema>;
}) => {
  const client = params.client;
  const data = UpdateMemberRoleSchema.parse(params.data);

  const service = createAccountMembersService(client);
  const adminClient = getSupabaseServerAdminClient();

  // update the role of the member
  return service.updateMemberRole(data, adminClient);
};

/**
 * @name transferOwnershipAction
 * @description Transfers the ownership of an account to another member.
 */
export const transferOwnershipAction = async (params: {
  client: SupabaseClient<Database>;
  data: z.infer<typeof TransferOwnershipSchema>;
}) => {
  const client = params.client;
  const data = TransferOwnershipSchema.parse(params.data);

  const user = await requireUser(client);

  if (!user.data) {
    throw new Error('User not found');
  }

  // verify OTP
  const otp = createOtpApi(client);

  const otpResult = await otp.verifyToken({
    purpose: `transfer-ownership-${data.payload.organizationId}`,
    userId: user.data.id,
    token: data.payload.otp,
  });

  if (!otpResult.valid) {
    throw new Error('Invalid OTP code');
  }

  if (otpResult.user_id !== user.data.id) {
    throw new Error('Nonce User ID mismatch');
  }

  // assert that the user is the owner of the account
  const { data: isOwner, error } = await client.rpc('is_organization_owner', {
    organization_id: data.payload.organizationId,
  });

  if (error || !isOwner) {
    throw new Error(
      `You must be the owner of the account to transfer ownership`,
    );
  }

  // at this point, the user is authenticated and is the owner of the account
  // so we proceed with the transfer of ownership with admin privileges
  const adminClient = getSupabaseServerAdminClient();

  // transfer the ownership of the account
  const service = createAccountMembersService(client);

  return service.transferOwnership(data, adminClient);
};
