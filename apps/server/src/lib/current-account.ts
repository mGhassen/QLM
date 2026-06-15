import type { Context } from 'hono';

import { getAccessTokenFromRequest, getSupabaseClient } from './supabase';

/**
 * Resolve `auth.users.id` from a bearer token.
 *
 * Prefer {@link SupabaseClient.auth.getClaims} — same path as the web app's
 * `requireUser()` — because `getUser()` can fail against local GoTrue even
 * when the JWT is valid for PostgREST/RLS (orgs, projects, etc. still load).
 */
export async function resolveAuthUserIdFromToken(
  accessToken: string,
): Promise<string | null> {
  const client = getSupabaseClient(accessToken);

  const { data: claimsData, error: claimsError } =
    await client.auth.getClaims();
  if (!claimsError && claimsData?.claims?.sub) {
    return claimsData.claims.sub;
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);
  if (!error && user?.id) return user.id;

  return null;
}

/**
 * Resolve `auth.users.id` for the request's bearer token.
 *
 * Use this for tables keyed by `user_id` (e.g. `user_preferences`). Do not
 * confuse with {@link getCurrentAccountId}, which returns `accounts.id`.
 */
export async function getCurrentUserId(c: Context): Promise<string | null> {
  const token = getAccessTokenFromRequest(c.req.raw);
  if (!token) return null;
  return resolveAuthUserIdFromToken(token);
}

/**
 * Resolve the personal `account_id` for the request's authenticated user.
 *
 * Returns `null` when:
 *  - no `Authorization: Bearer <token>` header is present
 *  - the supabase client rejects the token (claims / `getUser()` both fail)
 *  - the user has no row in `public.accounts` (shouldn't happen for any
 *    real signed-in user, but treated as unauthorized rather than 500'd)
 *
 * Routes that need account scoping should:
 *
 *   const accountId = await getCurrentAccountId(c);
 *   if (!accountId) return c.json({ error: 'Unauthorized' }, 401);
 *
 * Why this lives at the route layer (and not as a middleware) for phase 1:
 * the rest of the server doesn't have a single "current user" extractor
 * pattern yet. Token routes are the first to need account-scoping; other
 * routes either accept `userId`/`accountId` as a path/query/body param or
 * scope by `organizationId`. Centralising belongs in a follow-up auth RFC,
 * not a token-management story.
 */
export async function getCurrentAccountId(c: Context): Promise<string | null> {
  const token = getAccessTokenFromRequest(c.req.raw);
  if (!token) return null;

  const userId = await resolveAuthUserIdFromToken(token);
  if (!userId) return null;

  const client = getSupabaseClient(token);

  const { data, error } = await client
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.id as string;
}
