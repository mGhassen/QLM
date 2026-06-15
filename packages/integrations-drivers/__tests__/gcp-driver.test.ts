import { describe, expect, it, vi } from 'vitest';

import type { RevealedCredentials } from '@qlm/domain/services';

import { GcpDriver, type GcpClientFactory } from '../src/gcp/gcp-driver';

const VALID_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'qlm-analytics-prod',
  private_key_id: '1234567890abcdef',
  private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  client_email:
    'qlm-runtime@qlm-analytics-prod.iam.gserviceaccount.com',
});

const GCP_CREDS: RevealedCredentials = {
  provider: 'gcp',
  serviceAccountJson: VALID_SERVICE_ACCOUNT,
  defaultRegion: 'europe-west1',
};

type GcpResponseShape = { data: unknown };

/**
 * Build a fake JWT factory whose `request` function returns (or throws)
 * whatever the test wants. Records calls so tests can assert URLs.
 */
function makeFactory(send: (url: string) => Promise<GcpResponseShape>): {
  factory: GcpClientFactory;
  calls: string[];
} {
  const calls: string[] = [];
  const factory: GcpClientFactory = () => ({
    request: vi.fn(async (opts: { url: string }) => {
      calls.push(opts.url);
      return send(opts.url);
    }) as never,
  });
  return { factory, calls };
}

describe('GcpDriver.testConnection', () => {
  it('returns ok=true with the service-account email on success', async () => {
    const { factory, calls } = makeFactory(async () => ({ data: {} }));
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection(GCP_CREDS);

    expect(result).toEqual({
      ok: true,
      identity:
        'qlm-runtime@qlm-analytics-prod.iam.gserviceaccount.com',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(
      'https://cloudresourcemanager.googleapis.com/v1/projects/qlm-analytics-prod',
    );
  });

  it('rejects malformed service-account JSON as invalid_credentials', async () => {
    const { factory } = makeFactory(async () => ({ data: {} }));
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection({
      provider: 'gcp',
      serviceAccountJson: '{ "not": "a service account"',
      defaultRegion: 'europe-west1',
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'invalid_credentials',
    });
    expect(result.errorMessage).toContain('malformed');
  });

  it('rejects service-account JSON without the service_account type', async () => {
    const { factory } = makeFactory(async () => ({ data: {} }));
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection({
      provider: 'gcp',
      serviceAccountJson: JSON.stringify({
        type: 'authorized_user',
        project_id: 'x',
      }),
      defaultRegion: 'europe-west1',
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('invalid_credentials');
  });

  it('maps HTTP 401 to invalid_credentials', async () => {
    const { factory } = makeFactory(async () => {
      const error = new Error('UNAUTHENTICATED');
      (error as { response?: { status: number } }).response = { status: 401 };
      throw error;
    });
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection(GCP_CREDS);

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'invalid_credentials',
    });
  });

  it('maps HTTP 403 to permission_denied', async () => {
    const { factory } = makeFactory(async () => {
      const error = new Error(
        'Caller does not have resourcemanager.projects.get permission',
      );
      (error as { response?: { status: number } }).response = { status: 403 };
      throw error;
    });
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection(GCP_CREDS);

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'permission_denied',
    });
    expect(result.errorMessage).toContain('permission');
  });

  it('maps ENOTFOUND to network', async () => {
    const { factory } = makeFactory(async () => {
      const error = new Error(
        'getaddrinfo ENOTFOUND cloudresourcemanager.googleapis.com',
      );
      (error as { code?: string }).code = 'ENOTFOUND';
      throw error;
    });
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection(GCP_CREDS);

    expect(result).toMatchObject({ ok: false, errorCode: 'network' });
  });

  it('maps invalid_grant messages (bad key at token exchange) to invalid_credentials', async () => {
    const { factory } = makeFactory(async () => {
      throw new Error(
        'invalid_grant: Invalid JWT Signature — the private key is malformed',
      );
    });
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection(GCP_CREDS);

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'invalid_credentials',
    });
  });

  it('falls back to unknown for an unrelated error', async () => {
    const { factory } = makeFactory(async () => {
      throw new Error('something unexpected');
    });
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection(GCP_CREDS);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('unknown');
  });

  it('rejects non-GCP credentials at the interface boundary', async () => {
    const { factory } = makeFactory(async () => ({ data: {} }));
    const driver = new GcpDriver(factory);

    const result = await driver.testConnection({
      provider: 'aws',
      accessKeyId: 'AKIA',
      secretAccessKey: 'x',
      defaultRegion: 'us-east-1',
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain('non-GCP');
  });
});

describe('GcpDriver.listRegions', () => {
  it('maps compute.regions.list items to { id, name }', async () => {
    const { factory, calls } = makeFactory(async () => ({
      data: {
        items: [
          { name: 'us-central1', description: 'Iowa' },
          { name: 'europe-west1', description: 'Belgium' },
          { name: 'asia-east1', description: 'Taiwan' },
        ],
      },
    }));
    const driver = new GcpDriver(factory);

    const regions = await driver.listRegions(GCP_CREDS);

    expect(regions).toHaveLength(3);
    expect(regions[0]).toEqual({ id: 'us-central1', name: 'Iowa' });
    expect(regions[1]).toEqual({ id: 'europe-west1', name: 'Belgium' });

    expect(calls[0]).toBe(
      'https://compute.googleapis.com/compute/v1/projects/qlm-analytics-prod/regions',
    );
  });

  it('falls back to the region id when description is missing', async () => {
    const { factory } = makeFactory(async () => ({
      data: {
        items: [{ name: 'us-central1' }],
      },
    }));
    const driver = new GcpDriver(factory);

    const regions = await driver.listRegions(GCP_CREDS);

    expect(regions).toEqual([{ id: 'us-central1', name: 'us-central1' }]);
  });

  it('returns an empty list when the response has no items', async () => {
    const { factory } = makeFactory(async () => ({ data: {} }));
    const driver = new GcpDriver(factory);

    const regions = await driver.listRegions(GCP_CREDS);

    expect(regions).toEqual([]);
  });

  it('throws when the service account JSON is malformed', async () => {
    const { factory } = makeFactory(async () => ({ data: { items: [] } }));
    const driver = new GcpDriver(factory);

    await expect(
      driver.listRegions({
        provider: 'gcp',
        serviceAccountJson: '{ not json',
        defaultRegion: 'europe-west1',
      }),
    ).rejects.toThrow('malformed');
  });

  it('throws on non-GCP credentials', async () => {
    const { factory } = makeFactory(async () => ({ data: { items: [] } }));
    const driver = new GcpDriver(factory);

    await expect(
      driver.listRegions({
        provider: 'aws',
        accessKeyId: 'AKIA',
        secretAccessKey: 'x',
        defaultRegion: 'us-east-1',
      }),
    ).rejects.toThrow('non-GCP');
  });
});
