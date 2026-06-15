import { getSupabaseBrowserClient } from './clients/browser-client';
import { recoverFromStaleAuthSession } from './stale-auth-session';

/**
 * Reads the current Supabase session in the browser and returns the
 * HTTP headers needed to authenticate against the server API. Returns
 * an empty record when no session is present — callers are expected
 * to handle the resulting 401/403 at the server.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    await recoverFromStaleAuthSession(supabase, error);
  }

  if (!session?.access_token) {
    return {};
  }
  return { Authorization: `Bearer ${session.access_token}` };
}
