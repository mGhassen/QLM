import { describe, expect, it, vi } from 'vitest';

import type { RevealedCredentials } from '@qlm/domain/services';

import { AwsDriver, type AwsClientFactories } from '../src/aws/aws-driver';

const AWS_CREDS: RevealedCredentials = {
  provider: 'aws',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  defaultRegion: 'us-east-1',
};

type StsSendResponse = { Arn?: string };
type Ec2SendResponse = { Regions?: Array<{ RegionName?: string }> };

/**
 * Build a pair of fake client factories. `stsSend` and `ec2Send` are the
 * functions `client.send(command)` delegates to; tests control what they
 * return or throw. We also record the client configs so tests can assert
 * the driver forwards `region` and `credentials` correctly.
 */
function makeFactories(opts: {
  stsSend?: () => Promise<StsSendResponse>;
  ec2Send?: () => Promise<Ec2SendResponse>;
}): {
  factories: AwsClientFactories;
  stsConfigs: unknown[];
  ec2Configs: unknown[];
} {
  const stsConfigs: unknown[] = [];
  const ec2Configs: unknown[] = [];
  const factories: AwsClientFactories = {
    createStsClient: (config) => {
      stsConfigs.push(config);
      return {
        send: vi.fn(
          opts.stsSend ??
            (() =>
              Promise.resolve({ Arn: 'arn:aws:iam::123456789012:user/test' })),
        ) as never,
      };
    },
    createEc2Client: (config) => {
      ec2Configs.push(config);
      return {
        send: vi.fn(
          opts.ec2Send ??
            (() =>
              Promise.resolve({
                Regions: [
                  { RegionName: 'us-east-1' },
                  { RegionName: 'eu-west-1' },
                ],
              })),
        ) as never,
      };
    },
  };
  return { factories, stsConfigs, ec2Configs };
}

describe('AwsDriver.testConnection', () => {
  it('returns ok=true with the caller ARN on success', async () => {
    const { factories, stsConfigs } = makeFactories({
      stsSend: async () => ({ Arn: 'arn:aws:iam::123456789012:user/qlm' }),
    });
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection(AWS_CREDS);

    expect(result).toEqual({
      ok: true,
      identity: 'arn:aws:iam::123456789012:user/qlm',
    });
    // Config forwarded to STSClient
    expect(stsConfigs).toHaveLength(1);
    expect(stsConfigs[0]).toMatchObject({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
    });
  });

  it('returns unknown when the response has no ARN', async () => {
    const { factories } = makeFactories({
      stsSend: async () => ({}),
    });
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection(AWS_CREDS);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('unknown');
  });

  it('maps InvalidClientTokenId to invalid_credentials', async () => {
    const { factories } = makeFactories({
      stsSend: async () => {
        const error = new Error('The security token is invalid');
        (error as { name?: string }).name = 'InvalidClientTokenId';
        throw error;
      },
    });
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection(AWS_CREDS);

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'invalid_credentials',
    });
    expect(result.errorMessage).toContain('security token');
  });

  it('maps UnauthorizedOperation to permission_denied', async () => {
    const { factories } = makeFactories({
      stsSend: async () => {
        const error = new Error(
          'User is not authorised to perform sts:GetCallerIdentity',
        );
        (error as { name?: string }).name = 'UnauthorizedOperation';
        throw error;
      },
    });
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection(AWS_CREDS);

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'permission_denied',
    });
  });

  it('maps ENOTFOUND to network', async () => {
    const { factories } = makeFactories({
      stsSend: async () => {
        const error = new Error('getaddrinfo ENOTFOUND sts.amazonaws.com');
        (error as { code?: string }).code = 'ENOTFOUND';
        throw error;
      },
    });
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection(AWS_CREDS);

    expect(result).toMatchObject({ ok: false, errorCode: 'network' });
  });

  it('maps an unrelated error to unknown', async () => {
    const { factories } = makeFactories({
      stsSend: async () => {
        throw new Error('something unexpected blew up');
      },
    });
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection(AWS_CREDS);

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'unknown',
      errorMessage: 'something unexpected blew up',
    });
  });

  it('rejects non-AWS credentials at the interface boundary', async () => {
    const { factories } = makeFactories({});
    const driver = new AwsDriver(factories);

    const result = await driver.testConnection({
      provider: 'gcp',
      serviceAccountJson: '{}',
      defaultRegion: 'us-central1',
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('unknown');
    expect(result.errorMessage).toContain('non-AWS');
  });
});

describe('AwsDriver.listRegions', () => {
  it('returns EC2 regions mapped to { id, name }', async () => {
    const { factories, ec2Configs } = makeFactories({
      ec2Send: async () => ({
        Regions: [
          { RegionName: 'us-east-1' },
          { RegionName: 'us-west-2' },
          { RegionName: 'eu-west-1' },
        ],
      }),
    });
    const driver = new AwsDriver(factories);

    const regions = await driver.listRegions(AWS_CREDS);

    expect(regions).toHaveLength(3);
    expect(regions[0]).toEqual({ id: 'us-east-1', name: 'us-east-1' });
    expect(regions[2]).toEqual({ id: 'eu-west-1', name: 'eu-west-1' });

    expect(ec2Configs).toHaveLength(1);
    expect(ec2Configs[0]).toMatchObject({
      region: 'us-east-1',
      credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE' },
    });
  });

  it('filters out entries without a RegionName', async () => {
    const { factories } = makeFactories({
      ec2Send: async () => ({
        Regions: [{ RegionName: 'us-east-1' }, {}, { RegionName: 'eu-west-1' }],
      }),
    });
    const driver = new AwsDriver(factories);

    const regions = await driver.listRegions(AWS_CREDS);

    expect(regions).toHaveLength(2);
    expect(regions.map((r) => r.id)).toEqual(['us-east-1', 'eu-west-1']);
  });

  it('propagates driver errors for listRegions (caller maps them)', async () => {
    const { factories } = makeFactories({
      ec2Send: async () => {
        const error = new Error('AccessDenied');
        (error as { name?: string }).name = 'AccessDenied';
        throw error;
      },
    });
    const driver = new AwsDriver(factories);

    await expect(driver.listRegions(AWS_CREDS)).rejects.toThrow('AccessDenied');
  });

  it('throws on non-AWS credentials', async () => {
    const { factories } = makeFactories({});
    const driver = new AwsDriver(factories);

    await expect(
      driver.listRegions({
        provider: 'gcp',
        serviceAccountJson: '{}',
        defaultRegion: 'us-central1',
      }),
    ).rejects.toThrow('non-AWS');
  });
});
