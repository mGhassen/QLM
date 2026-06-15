import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../lib/zod-validator.js';
import { getLogger } from '@qlm/shared/logger';

import type { KeyringClient } from '../lib/keyring-client';

/**
 * Sidecar-side auth routes.
 *
 * `POST /auth/sign-in` and `POST /auth/sign-out` are owned by the desktop
 * sidecar so the refresh token lands in the OS keychain (via keyring-IPC) on
 * sign-in and is purged on sign-out — see spec §3.3 and §5.2.
 *
 * Supabase + keyring are dependency-injected so tests can stub both without
 * `vi.mock`.
 */

export interface SidecarAuthSupabase {
  signInWithPassword(input: { email: string; password: string }): Promise<
    | {
        ok: true;
        session: {
          access_token: string;
          refresh_token: string;
          expires_at: number;
        };
      }
    | { ok: false; reason: 'invalid_credentials' | 'transient' }
  >;
  signOut(accessToken: string): Promise<void>;
}

export interface CreateAuthRoutesOptions {
  supabase: SidecarAuthSupabase;
  keyring: Pick<KeyringClient, 'set' | 'delete' | 'isAvailable'>;
  /** Reads `QLM_SERVER_URL` so the keyring key is namespaced per server. */
  env?: NodeJS.ProcessEnv;
}

const SESSION_COOKIE = 'qlm-session';
const SESSION_COOKIE_OPTIONS = 'Path=/; HttpOnly; SameSite=Lax';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function keyringKey(env: NodeJS.ProcessEnv): string | null {
  const url = env.QLM_SERVER_URL?.trim();
  return url ? `refresh_token:${url}` : null;
}

function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const [rawName, ...rest] = pair.trim().split('=');
    if (rawName === SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export function createAuthRoutes(options: CreateAuthRoutesOptions): Hono {
  const env = options.env ?? process.env;
  const { supabase, keyring } = options;
  const app = new Hono();

  app.post('/sign-in', zValidator('json', signInSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const result = await supabase.signInWithPassword({ email, password });
    if (!result.ok) {
      return c.json({ error: 'invalid_credentials' }, 401);
    }
    const key = keyringKey(env);
    if (key && keyring.isAvailable()) {
      try {
        await keyring.set(key, result.session.refresh_token);
      } catch (error) {
        const logger = await getLogger();
        logger.warn(
          { err: error instanceof Error ? error.message : String(error) },
          'sidecar:auth keyring set failed; sign-in still succeeded',
        );
      }
    }
    c.header(
      'Set-Cookie',
      `${SESSION_COOKIE}=${result.session.access_token}; ${SESSION_COOKIE_OPTIONS}`,
    );
    return c.json({ redirectTo: '/' }, 200);
  });

  app.post('/sign-out', async (c) => {
    const cookie = readSessionCookie(c.req.header('Cookie') ?? null);
    if (!cookie) {
      return c.body(null, 204);
    }
    try {
      await supabase.signOut(cookie);
    } catch (error) {
      const logger = await getLogger();
      logger.warn(
        { err: error instanceof Error ? error.message : String(error) },
        'sidecar:auth supabase signOut failed; clearing local session anyway',
      );
    }
    const key = keyringKey(env);
    if (key && keyring.isAvailable()) {
      try {
        await keyring.delete(key);
      } catch (error) {
        const logger = await getLogger();
        logger.warn(
          { err: error instanceof Error ? error.message : String(error) },
          'sidecar:auth keyring delete failed',
        );
      }
    }
    c.header(
      'Set-Cookie',
      `${SESSION_COOKIE}=; ${SESSION_COOKIE_OPTIONS}; Max-Age=0`,
    );
    return c.body(null, 204);
  });

  return app;
}
