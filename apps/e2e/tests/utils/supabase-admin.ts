import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Minimal Supabase admin helper used by e2e specs that need to read or
 * mutate data that RLS blocks from a normal user session. Right now
 * the only consumer is the invitation-and-join spec, which has to
 * capture the `invite_token` that `createInvitation` RPC generated —
 * Resend isn't configured in local dev so the email dispatcher is
 * descoped in Phase 2 of the port, and we can't follow the email.
 *
 * The helper uses raw `fetch` against Supabase's PostgREST endpoint so
 * we don't have to add `@supabase/supabase-js` as a dependency to
 * `apps/e2e`.
 *
 * Service role key resolution order:
 *   1. `SUPABASE_SERVICE_ROLE_KEY` from the e2e process env
 *   2. Parsed out of `apps/web/.env.local` if present (convenient for
 *      local runs — `pnpm supabase:web:start` writes the key there)
 *   3. Hard error — fail loudly instead of silently 401ing
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const WEB_ENV_PATH = resolve(__dirname, '../../../../apps/web/.env.local');

function parseDotEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1]!;
    let value = match[2] ?? '';
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

let cachedWebEnv: Record<string, string> | null = null;

function loadWebEnv(): Record<string, string> {
  if (cachedWebEnv) return cachedWebEnv;
  try {
    cachedWebEnv = parseDotEnv(readFileSync(WEB_ENV_PATH, 'utf-8'));
  } catch {
    cachedWebEnv = {};
  }
  return cachedWebEnv;
}

function getServiceRoleKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  const env = loadWebEnv();
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    return env.SUPABASE_SERVICE_ROLE_KEY;
  }
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Export it or add it to apps/web/.env.local.',
  );
}

function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  const env = loadWebEnv();
  return env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
}

async function restGet<T>(path: string, search: URLSearchParams): Promise<T> {
  const url = new URL(path, getSupabaseUrl());
  for (const [key, value] of search) {
    url.searchParams.set(key, value);
  }

  const key = getServiceRoleKey();
  const response = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Supabase REST GET ${path} failed: ${response.status} ${response.statusText} ${body}`,
    );
  }

  return (await response.json()) as T;
}

type InvitationRow = {
  invite_token: string;
  created_at: string;
};

/**
 * Returns the most recent `invite_token` for the given email from the
 * `invitations` table. Used by the invitation-and-join spec to capture
 * the token that would normally arrive in an email.
 */
export async function getLatestInviteTokenFor(email: string): Promise<string> {
  const rows = await restGet<InvitationRow[]>(
    '/rest/v1/invitations',
    new URLSearchParams({
      email: `eq.${email}`,
      select: 'invite_token,created_at',
      order: 'created_at.desc',
      limit: '1',
    }),
  );

  const row = rows[0];
  if (!row?.invite_token) {
    throw new Error(`No invitation found in Supabase for ${email}`);
  }

  return row.invite_token;
}
