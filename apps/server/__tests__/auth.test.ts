import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthRoutes, type SidecarAuthSupabase } from '../src/routes/auth';

const SERVER_URL = 'https://api.rasm.ai';
const KEYRING_KEY = `refresh_token:${SERVER_URL}`;

interface KeyringMocks {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  isAvailable: ReturnType<typeof vi.fn>;
}

function buildKeyring(available = true): KeyringMocks {
  return {
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    isAvailable: vi.fn().mockReturnValue(available),
  };
}

function buildSupabase(
  overrides: Partial<SidecarAuthSupabase> = {},
): SidecarAuthSupabase {
  return {
    signInWithPassword: vi.fn().mockResolvedValue({
      ok: true,
      session: {
        access_token: 'access-token-x',
        refresh_token: 'refresh-token-x',
        expires_at: 9_999_999_999,
      },
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function bareRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, { method: 'POST', ...init });
}

describe('sidecar auth routes', () => {
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    env = { GUEPARD_SERVER_URL: SERVER_URL };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /sign-in', () => {
    it('returns 200, sets session cookie, and persists the refresh token', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring();
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        jsonRequest('/sign-in', {
          email: 'user@example.com',
          password: 'correct-horse-battery-staple',
        }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ redirectTo: '/' });
      expect(supabase.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
        email: 'user@example.com',
        password: 'correct-horse-battery-staple',
      });
      expect(keyring.set).toHaveBeenCalledExactlyOnceWith(
        KEYRING_KEY,
        'refresh-token-x',
      );
      expect(response.headers.get('Set-Cookie')).toContain(
        'guepard-session=access-token-x',
      );
      expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    });

    it('returns 401 with a generic message on invalid credentials and skips keyring', async () => {
      const supabase = buildSupabase({
        signInWithPassword: vi.fn().mockResolvedValue({
          ok: false,
          reason: 'invalid_credentials',
        }),
      });
      const keyring = buildKeyring();
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        jsonRequest('/sign-in', {
          email: 'user@example.com',
          password: 'wrong',
        }),
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'invalid_credentials' });
      expect(keyring.set).not.toHaveBeenCalled();
    });

    it('skips keyring when isAvailable() is false (cloud server context)', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring(false);
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        jsonRequest('/sign-in', {
          email: 'user@example.com',
          password: 'pw',
        }),
      );

      expect(response.status).toBe(200);
      expect(keyring.set).not.toHaveBeenCalled();
    });

    it('still returns 200 when keyring write fails (best-effort persist)', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring();
      keyring.set.mockRejectedValue(new Error('ipc unreachable'));
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        jsonRequest('/sign-in', {
          email: 'user@example.com',
          password: 'pw',
        }),
      );

      expect(response.status).toBe(200);
      expect(keyring.set).toHaveBeenCalledOnce();
    });

    it('returns 400 when the body fails Zod validation', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring();
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        jsonRequest('/sign-in', { email: 'not-an-email', password: '' }),
      );

      expect(response.status).toBe(400);
      expect(supabase.signInWithPassword).not.toHaveBeenCalled();
      expect(keyring.set).not.toHaveBeenCalled();
    });
  });

  describe('POST /sign-out', () => {
    it('calls Supabase signOut + keyring.delete on a session cookie', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring();
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        bareRequest('/sign-out', {
          headers: { Cookie: 'guepard-session=access-token-x' },
        }),
      );

      expect(response.status).toBe(204);
      expect(supabase.signOut).toHaveBeenCalledExactlyOnceWith(
        'access-token-x',
      );
      expect(keyring.delete).toHaveBeenCalledExactlyOnceWith(KEYRING_KEY);
      expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    });

    it('returns 204 with no Supabase / keyring call when no cookie is sent', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring();
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(bareRequest('/sign-out'));

      expect(response.status).toBe(204);
      expect(supabase.signOut).not.toHaveBeenCalled();
      expect(keyring.delete).not.toHaveBeenCalled();
    });

    it('skips keyring when isAvailable() is false', async () => {
      const supabase = buildSupabase();
      const keyring = buildKeyring(false);
      const app = createAuthRoutes({ supabase, keyring, env });

      const response = await app.request(
        bareRequest('/sign-out', {
          headers: { Cookie: 'guepard-session=access-token-x' },
        }),
      );

      expect(response.status).toBe(204);
      expect(keyring.delete).not.toHaveBeenCalled();
    });
  });
});
