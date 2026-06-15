import { ActionFunctionArgs } from 'react-router';

import { getLogger } from '@guepard/shared/logger';
import { requireUser } from '@guepard/supabase/require-user';
import { getSupabaseServerAdminClient } from '@guepard/supabase/server-admin-client';
import { getSupabaseServerClient } from '@guepard/supabase/server-client';

import { createOtpApi } from '../api/index.server';
import { SendOtpEmailSchema } from '../send-otp.schema';

/**
 * Server action to generate an OTP and send it via email
 */
export const sendOtpEmailAction = async function ({
  request,
}: ActionFunctionArgs) {
  const data = SendOtpEmailSchema.parse(await request.json());
  const { client: serverClient } = getSupabaseServerClient(request);
  const userResponse = await requireUser(serverClient);
  const logger = await getLogger();

  if (!userResponse.data) {
    logger.error(
      {
        name: 'send-otp-email',
      },
      'User not found',
    );

    return {
      success: false,
    };
  }

  const user = userResponse.data;
  const ctx = { name: 'send-otp-email', userId: user.id };
  const email = user.email;

  // validate edge case where user has no email
  if (!email) {
    logger.error(ctx, 'User has no email. OTP verification is not possible.');

    return {
      success: false,
    };
  }

  // validate edge case where email is not the same as the one provided
  // this is highly unlikely to happen, but we want to make sure the client-side code is correct in
  // sending the correct user email
  if (data.email !== email) {
    logger.error(
      `User email does not match the email provided. This is likely an error in the client.`,
    );

    return {
      success: false,
    };
  }

  try {
    const { purpose, expiresInSeconds } = data;

    logger.info(
      { ...ctx, email, purpose },
      'Creating OTP token and sending email',
    );

    const client = getSupabaseServerAdminClient();
    const otpApi = createOtpApi(client);

    // Create a token that will be verified later
    const tokenResult = await otpApi.createToken({
      userId: user.id,
      purpose,
      expiresInSeconds,
    });

    // Send the email with the OTP
    await otpApi.sendOtpEmail({
      email,
      otp: tokenResult.token,
    });

    logger.info(
      { ...ctx, tokenId: tokenResult.id },
      'OTP email sent successfully',
    );

    return {
      success: true,
      tokenId: tokenResult.id,
    };
  } catch (error) {
    logger.error({ ...ctx, error }, 'Failed to send OTP email');

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to send OTP email',
    };
  }
};
