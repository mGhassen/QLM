import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { keyringClient } from '../../src/lib/keyring-client';

const PORT = '57321';
const TOKEN = 'a-fake-bearer-token-not-a-secret-just-a-fixture';

function captureFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(response);
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

describe('keyringClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    process.env.GUEPARD_KEYRING_PORT = PORT;
    process.env.GUEPARD_KEYRING_TOKEN = TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GUEPARD_KEYRING_PORT;
    delete process.env.GUEPARD_KEYRING_TOKEN;
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('returns true when both env vars are set', () => {
      expect(keyringClient.isAvailable()).toBe(true);
    });

    it('returns false when port is missing', () => {
      delete process.env.GUEPARD_KEYRING_PORT;
      expect(keyringClient.isAvailable()).toBe(false);
    });

    it('returns false when token is missing', () => {
      delete process.env.GUEPARD_KEYRING_TOKEN;
      expect(keyringClient.isAvailable()).toBe(false);
    });

    it('returns false when port is not a valid integer', () => {
      process.env.GUEPARD_KEYRING_PORT = 'not-a-number';
      expect(keyringClient.isAvailable()).toBe(false);
    });
  });

  describe('set', () => {
    it('POSTs to /keyring/set with bearer + Date headers', async () => {
      const fetchMock = captureFetch(emptyResponse(204));
      await keyringClient.set('OPENAI_API_KEY', 'sk-test');

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe(`http://127.0.0.1:${PORT}/keyring/set`);
      expect(init.method).toBe('POST');
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
      expect(headers.Date).toMatch(/GMT$/);
      expect(headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body as string)).toEqual({
        key: 'OPENAI_API_KEY',
        value: 'sk-test',
      });
    });

    it('throws a non-leaking error on a non-2xx response', async () => {
      captureFetch(emptyResponse(500));
      await expect(keyringClient.set('K', 'V')).rejects.toThrow(
        'keyring-ipc: set K failed (status=500)',
      );
    });
  });

  describe('get', () => {
    it('returns the value on a 200 response', async () => {
      captureFetch(jsonResponse({ value: 'sk-test' }));
      const value = await keyringClient.get('OPENAI_API_KEY');
      expect(value).toBe('sk-test');
    });

    it('returns null on a 404 response', async () => {
      captureFetch(emptyResponse(404));
      const value = await keyringClient.get('MISSING_KEY');
      expect(value).toBeNull();
    });

    it('uses 127.0.0.1 with the configured port and percent-encodes the key', async () => {
      const fetchMock = captureFetch(jsonResponse({ value: 'v' }));
      await keyringClient.get('weird key/name');
      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe(
        `http://127.0.0.1:${PORT}/keyring/get?key=${encodeURIComponent('weird key/name')}`,
      );
    });

    it('throws on a non-2xx, non-404 response', async () => {
      captureFetch(emptyResponse(500));
      await expect(keyringClient.get('K')).rejects.toThrow(
        'keyring-ipc: get K failed (status=500)',
      );
    });
  });

  describe('delete', () => {
    it('DELETEs to /keyring/{key} with bearer + Date headers', async () => {
      const fetchMock = captureFetch(emptyResponse(204));
      await keyringClient.delete('OPENAI_API_KEY');

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe(
        `http://127.0.0.1:${PORT}/keyring/${encodeURIComponent('OPENAI_API_KEY')}`,
      );
      expect(init.method).toBe('DELETE');
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
      expect(headers.Date).toMatch(/GMT$/);
    });

    it('swallows a 404 as a successful no-op', async () => {
      captureFetch(emptyResponse(404));
      await expect(keyringClient.delete('MISSING')).resolves.toBeUndefined();
    });

    it('throws on a non-2xx, non-404 response', async () => {
      captureFetch(emptyResponse(500));
      await expect(keyringClient.delete('K')).rejects.toThrow(
        'keyring-ipc: delete K failed (status=500)',
      );
    });
  });
});
