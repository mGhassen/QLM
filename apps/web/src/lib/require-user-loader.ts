import { redirect } from '@tanstack/react-router';

import { requireUser } from '@guepard/supabase/require-user';
import { getSupabaseServerClient } from '@guepard/supabase/server-client';

import pathsConfig from '@/config/paths.config';

/**
 * Server loader helper: require an authenticated session or redirect to sign-in.
 */
export async function requireUserLoader(request: Request) {
  const { client } = getSupabaseServerClient(request);
  const result = await requireUser(client);

  if (result.error) {
    throw redirect({
      to: pathsConfig.auth.signIn,
      search: { next: new URL(request.url).pathname },
    });
  }

  return { user: result.data };
}
