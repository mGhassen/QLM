import { describe, expect, it } from 'vitest';

import type { IntegrationProvider } from '@qlm/domain/entities';
import type {
  IIntegrationProviderDriver,
  RevealedCredentials,
} from '@qlm/domain/services';
import type { Region, TestResult } from '@qlm/domain/usecases';

import { IntegrationProviderDriverRegistry } from '../src/registry';

/**
 * Tiny stub driver we can point the registry at without touching the real
 * AWS / GCP client factories. Lets us verify the resolve() wiring in
 * isolation from the provider SDK layer.
 */
class StubDriver implements IIntegrationProviderDriver {
  constructor(public readonly provider: IntegrationProvider) {}

  public async testConnection(
    _creds: RevealedCredentials,
  ): Promise<TestResult> {
    return { ok: true, identity: `stub:${this.provider}` };
  }

  public async listRegions(_creds: RevealedCredentials): Promise<Region[]> {
    return [];
  }
}

describe('IntegrationProviderDriverRegistry', () => {
  it('resolves overridden drivers by provider id', async () => {
    const awsStub = new StubDriver('aws');
    const gcpStub = new StubDriver('gcp');
    const registry = new IntegrationProviderDriverRegistry({
      aws: awsStub,
      gcp: gcpStub,
    });

    expect(registry.resolve('aws')).toBe(awsStub);
    expect(registry.resolve('gcp')).toBe(gcpStub);
  });

  it('falls back to the real AwsDriver / GcpDriver when no override is provided', () => {
    // We don't call the drivers here — just verify the registry constructs
    // without throwing and returns driver objects whose `.provider` matches.
    const registry = new IntegrationProviderDriverRegistry();

    expect(registry.resolve('aws').provider).toBe('aws');
    expect(registry.resolve('gcp').provider).toBe('gcp');
  });

  it('wires the overridden driver so test results flow through', async () => {
    const awsStub = new StubDriver('aws');
    const registry = new IntegrationProviderDriverRegistry({ aws: awsStub });

    const result = await registry.resolve('aws').testConnection({
      provider: 'aws',
      accessKeyId: 'AKIA',
      secretAccessKey: 'x',
      defaultRegion: 'us-east-1',
    });

    expect(result).toEqual({ ok: true, identity: 'stub:aws' });
  });
});
