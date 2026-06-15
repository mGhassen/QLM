import { createFileRoute } from '@tanstack/react-router';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@guepard/supabase/database';
import { getSupabaseServerAdminClient } from '@guepard/supabase/server-admin-client';

import pathsConfig from '@/config/paths.config';

/**
 * Middleware route that validates a team invitation token and generates
 * a fresh Supabase auth link on demand. Ported from
 * `qwery-enterprise/apps/web/app/routes/join.accept.ts`.
 *
 * Flow:
 *   1. User clicks `/join/accept?invite_token=<uuid>` from the email.
 *   2. We validate the invitation (exists + not expired) via the admin
 *      client, since the user isn't signed in yet.
 *   3. Generate a fresh Supabase auth link (`invite` for new users,
 *      `magiclink` for existing ones). This avoids the 24-hour stale
 *      token problem on long-lived email links.
 *   4. Redirect to `/auth/confirm?token_hash=<fresh>&type=<invite|magiclink>`
 *      with `next` pointing back at `/join?invite_token=<uuid>`. The
 *      existing `verifyTokenHash` service honors the `invite_token` in
 *      the callback URL and redirects to `pathsConfig.app.joinOrganization`
 *      (now `/join`) after the token is consumed.
 */

function redirectResponse(url: string, request: Request) {
  const headers = new Headers();
  headers.set('Location', new URL(url, request.url).toString());
  return new Response(null, { status: 302, headers });
}

function redirectToError(message: string, request: Request) {
  const siteUrl = process.env.VITE_SITE_URL ?? new URL(request.url).origin;
  const errorUrl = new URL(pathsConfig.app.joinOrganization, siteUrl);
  errorUrl.searchParams.set('error', message);
  return redirectResponse(errorUrl.href, request);
}

async function determineEmailLinkType(
  adminClient: SupabaseClient<Database>,
  email: string,
): Promise<'invite' | 'magiclink'> {
  const { data, error } = await adminClient
    .from('accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  // If we can't find an existing account, issue an `invite` link which
  // both creates the user and signs them in. Otherwise fall back to a
  // magiclink that just authenticates the existing account.
  if (error || !data) {
    return 'invite';
  }
  return 'magiclink';
}

export const Route = createFileRoute('/join/accept')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const inviteToken = url.searchParams.get('invite_token');

        if (!inviteToken) {
          return redirectToError('Invalid invitation link', request);
        }

        try {
          const adminClient = getSupabaseServerAdminClient();

          // Fetch the invitation using the admin client — the invitee
          // isn't authenticated yet, so we bypass RLS.
          const { data: invitation, error: invitationError } = await adminClient
            .from('invitations')
            .select('*')
            .eq('invite_token', inviteToken)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

          if (invitationError || !invitation) {
            return redirectToError('Invitation not found or expired', request);
          }

          const emailLinkType = await determineEmailLinkType(
            adminClient,
            invitation.email,
          );

          // Generate a fresh Supabase auth link. Extracting the `token`
          // query param off the generated `action_link` gives us the
          // one-time token_hash that `/auth/confirm` can verify.
          const generateLinkResponse =
            await adminClient.auth.admin.generateLink({
              email: invitation.email,
              type: emailLinkType,
            });

          if (generateLinkResponse.error) {
            throw generateLinkResponse.error;
          }

          const verifyLink = generateLinkResponse.data.properties?.action_link;
          if (!verifyLink) {
            throw new Error('Action link from Supabase Auth was not found');
          }

          const token = new URL(verifyLink).searchParams.get('token');
          if (!token) {
            throw new Error(
              'Token in verify link from Supabase Auth was not found',
            );
          }

          // Build the redirect target: /auth/confirm consumes the
          // fresh token and (via verifyTokenHash) bounces the user to
          // `joinOrganizationPath?invite_token=...` once the invite
          // token is detected in the callback URL.
          const siteUrl = process.env.VITE_SITE_URL ?? url.origin;
          const authCallbackUrl = new URL(pathsConfig.auth.confirm, siteUrl);
          authCallbackUrl.searchParams.set('token_hash', token);
          authCallbackUrl.searchParams.set('type', emailLinkType);

          const joinUrl = new URL(pathsConfig.app.joinOrganization, siteUrl);
          joinUrl.searchParams.set('invite_token', inviteToken);
          if (emailLinkType === 'invite') {
            joinUrl.searchParams.set('is_new_user', 'true');
          }

          authCallbackUrl.searchParams.set('next', joinUrl.href);

          return redirectResponse(authCallbackUrl.href, request);
        } catch (error) {
          console.error('[join/accept] failed to process invitation', error);
          return redirectToError(
            'An error occurred processing your invitation',
            request,
          );
        }
      },
    },
  },
});
