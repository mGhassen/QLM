/**
 * Tauri shell keyring-IPC client.
 *
 * Reads `GUEPARD_KEYRING_PORT` + `GUEPARD_KEYRING_TOKEN` from `process.env`
 * and exposes set/get/delete against the per-launch HTTP server in
 * `apps/desktop/src-tauri/src/ipc.rs`. Sidecar consumers use this; route
 * handlers do not.
 *
 * Errors never include the token or value — only the verb, key, and
 * upstream HTTP status — so `desktop.log` cannot leak credentials even
 * if a caller surfaces the message.
 */

const PORT_ENV = 'GUEPARD_KEYRING_PORT';
const TOKEN_ENV = 'GUEPARD_KEYRING_TOKEN';

interface KeyringEnv {
  readonly port: number;
  readonly token: string;
}

function readEnv(): KeyringEnv | null {
  const portRaw = process.env[PORT_ENV];
  const token = process.env[TOKEN_ENV];
  if (!portRaw || !token) return null;
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) return null;
  return { port, token };
}

function buildHeaders(env: KeyringEnv): HeadersInit {
  return {
    Authorization: `Bearer ${env.token}`,
    Date: new Date().toUTCString(),
  };
}

function endpoint(env: KeyringEnv, path: string): string {
  return `http://127.0.0.1:${env.port}${path}`;
}

function ipcError(verb: string, key: string, status: number): Error {
  return new Error(`keyring-ipc: ${verb} ${key} failed (status=${status})`);
}

function requireEnv(verb: string, key: string): KeyringEnv {
  const env = readEnv();
  if (!env) {
    throw ipcError(verb, key, 0);
  }
  return env;
}

export const keyringClient = {
  isAvailable(): boolean {
    return readEnv() !== null;
  },

  async set(key: string, value: string): Promise<void> {
    const env = requireEnv('set', key);
    const response = await fetch(endpoint(env, '/keyring/set'), {
      method: 'POST',
      headers: { ...buildHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!response.ok) {
      throw ipcError('set', key, response.status);
    }
  },

  async get(key: string): Promise<string | null> {
    const env = requireEnv('get', key);
    const url = endpoint(env, `/keyring/get?key=${encodeURIComponent(key)}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(env),
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw ipcError('get', key, response.status);
    }
    const body = (await response.json()) as { value?: unknown };
    return typeof body.value === 'string' ? body.value : null;
  },

  async delete(key: string): Promise<void> {
    const env = requireEnv('delete', key);
    const url = endpoint(env, `/keyring/${encodeURIComponent(key)}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(env),
    });
    if (response.status === 404) return;
    if (!response.ok) {
      throw ipcError('delete', key, response.status);
    }
  },
};

export type KeyringClient = typeof keyringClient;
