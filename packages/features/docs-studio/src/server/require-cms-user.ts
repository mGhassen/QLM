import { getSupabaseServerClient } from '@guepard/supabase/server-client';
import { recoverFromStaleAuthSession } from '@guepard/supabase/stale-auth-session';

export async function requireCmsUser(request: Request) {
  const { client, headers } = getSupabaseServerClient(request);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    await recoverFromStaleAuthSession(client, error);
  }

  if (error || !user) {
    return { user: null, headers };
  }

  return { user, headers };
}

export function jsonWithCookies(
  body: unknown,
  init: ResponseInit,
  cookieHeaders?: Headers,
) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  cookieHeaders?.forEach((value, key) => {
    headers.append(key, value);
  });
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function unauthorized(cookieHeaders?: Headers) {
  return jsonWithCookies({ error: 'Unauthorized' }, { status: 401 }, cookieHeaders);
}
