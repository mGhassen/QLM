import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export function isStaleRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const authError = error as Pick<AuthError, 'code' | 'message'>;

  return (
    authError.code === 'refresh_token_not_found' ||
    authError.message?.includes('Refresh Token Not Found') ||
    authError.message?.includes('Invalid Refresh Token')
  );
}

export async function clearStaleAuthSession(
  client: SupabaseClient,
): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // best-effort: cookies may already be invalid
  }
}

export async function recoverFromStaleAuthSession(
  client: SupabaseClient,
  error: unknown,
): Promise<boolean> {
  if (!isStaleRefreshTokenError(error)) {
    return false;
  }

  await clearStaleAuthSession(client);
  return true;
}
