import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import type { IntegrationProvider } from '@guepard/domain/entities';
import type {
  IIntegrationProviderDriver,
  RevealedCredentials,
} from '@guepard/domain/services';
import type { Region, TestResult } from '@guepard/domain/usecases';

import { mapAwsError } from './error-mapping';

/**
 * Factories for the STS and EC2 clients. Injected through the constructor
 * so tests can swap in mocks without reaching into the AWS SDK. Production
 * calls pass `defaultAwsClientFactories` which returns real clients.
 */
export type AwsClientFactories = {
  createStsClient: (config: {
    region: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  }) => Pick<STSClient, 'send'>;
  createEc2Client: (config: {
    region: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  }) => Pick<EC2Client, 'send'>;
};

export const defaultAwsClientFactories: AwsClientFactories = {
  createStsClient: (config) => new STSClient(config),
  createEc2Client: (config) => new EC2Client(config),
};

/**
 * AWS provider driver. Uses STS `GetCallerIdentity` for test connection and
 * EC2 `DescribeRegions` for region listing — both are the smallest, most
 * commonly-available permissions an IAM user can have and do not require
 * any provisioning privilege.
 */
export class AwsDriver implements IIntegrationProviderDriver {
  public readonly provider: IntegrationProvider = 'aws';

  constructor(
    private readonly factories: AwsClientFactories = defaultAwsClientFactories,
  ) {}

  public async testConnection(creds: RevealedCredentials): Promise<TestResult> {
    if (creds.provider !== 'aws') {
      return {
        ok: false,
        errorCode: 'unknown',
        errorMessage: `AwsDriver received non-AWS credentials: ${creds.provider}`,
      };
    }

    const client = this.factories.createStsClient({
      region: creds.defaultRegion,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        ...(creds.sessionToken !== undefined && {
          sessionToken: creds.sessionToken,
        }),
      },
    });

    try {
      const response = await client.send(new GetCallerIdentityCommand({}));
      const identity = response.Arn;
      if (!identity) {
        return {
          ok: false,
          errorCode: 'unknown',
          errorMessage: 'GetCallerIdentity returned no ARN',
        };
      }
      return { ok: true, identity };
    } catch (error) {
      return { ok: false, ...mapAwsError(error) };
    }
  }

  public async listRegions(creds: RevealedCredentials): Promise<Region[]> {
    if (creds.provider !== 'aws') {
      throw new Error(
        `AwsDriver.listRegions received non-AWS credentials: ${creds.provider}`,
      );
    }

    const client = this.factories.createEc2Client({
      region: creds.defaultRegion,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        ...(creds.sessionToken !== undefined && {
          sessionToken: creds.sessionToken,
        }),
      },
    });

    const response = await client.send(
      new DescribeRegionsCommand({ AllRegions: false }),
    );
    const rawRegions = response.Regions ?? [];

    return rawRegions
      .filter(
        (region): region is { RegionName: string } =>
          typeof region.RegionName === 'string',
      )
      .map((region) => ({
        id: region.RegionName,
        name: region.RegionName,
      }));
  }
}
