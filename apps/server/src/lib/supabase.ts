import { createClient } from '@supabase/supabase-js';
import type { Database } from '@guepard/supabase/database';

const isTest = process.env.VITEST === 'true';

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getAccessTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

export function getSupabaseClient(accessToken: string | null) {
  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();

  if (!url) {
    throw new Error('Missing SUPABASE_URL. Configure this in your .env file.');
  }

  const key =
    isTest && !accessToken && serviceRoleKey ? serviceRoleKey : anonKey;
  if (!key) {
    throw new Error(
      'Missing SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for tests). Configure these in your .env file.',
    );
  }

  const options = {
    auth: { persistSession: false },
    ...(accessToken && {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }),
  };

  return createClient<Database>(url, key, options);
}
