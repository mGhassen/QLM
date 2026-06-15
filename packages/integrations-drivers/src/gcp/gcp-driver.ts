import { JWT } from 'google-auth-library';

import type { IntegrationProvider } from '@guepard/domain/entities';
import type {
  IIntegrationProviderDriver,
  RevealedCredentials,
} from '@guepard/domain/services';
import type { Region, TestResult } from '@guepard/domain/usecases';

import { mapGcpError } from './error-mapping';

type ParsedServiceAccount = {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
};

type GcpHttpClient = Pick<JWT, 'request'>;

/**
 * Factory for the authenticated HTTP client. Injected so tests can swap in
 * a mock `request` without reaching into `google-auth-library`.
 */
export type GcpClientFactory = (
  parsed: ParsedServiceAccount,
  scopes: string[],
) => GcpHttpClient;

export const defaultGcpClientFactory: GcpClientFactory = (parsed, scopes) =>
  new JWT({
    email: parsed.client_email,
    key: parsed.private_key,
    scopes,
  });

const READ_ONLY_SCOPE =
  'https://www.googleapis.com/auth/cloud-platform.read-only';

type GcpRegionItem = {
  name: string;
  description?: string;
};

/**
 * GCP provider driver. Uses Cloud Resource Manager `projects.get` for test
 * connection (proves the service account can authenticate AND reach the
 * project it was issued against) and Compute Engine `regions.list` for
 * region listing.
 */
export class GcpDriver implements IIntegrationProviderDriver {
  public readonly provider: IntegrationProvider = 'gcp';

  constructor(
    private readonly createClient: GcpClientFactory = defaultGcpClientFactory,
  ) {}

  public async testConnection(creds: RevealedCredentials): Promise<TestResult> {
    if (creds.provider !== 'gcp') {
      return {
        ok: false,
        errorCode: 'unknown',
        errorMessage: `GcpDriver received non-GCP credentials: ${creds.provider}`,
      };
    }

    const parsed = parseServiceAccount(creds.serviceAccountJson);
    if (parsed === null) {
      return {
        ok: false,
        errorCode: 'invalid_credentials',
        errorMessage:
          'Service account JSON is malformed or missing required fields',
      };
    }

    const client = this.createClient(parsed, [READ_ONLY_SCOPE]);

    try {
      await client.request({
        url: `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(parsed.project_id)}`,
      });
      return { ok: true, identity: parsed.client_email };
    } catch (error) {
      return { ok: false, ...mapGcpError(error) };
    }
  }

  public async listRegions(creds: RevealedCredentials): Promise<Region[]> {
    if (creds.provider !== 'gcp') {
      throw new Error(
        `GcpDriver.listRegions received non-GCP credentials: ${creds.provider}`,
      );
    }

    const parsed = parseServiceAccount(creds.serviceAccountJson);
    if (parsed === null) {
      throw new Error(
        'Service account JSON is malformed or missing required fields',
      );
    }

    const client = this.createClient(parsed, [READ_ONLY_SCOPE]);
    const response = await client.request<{ items?: GcpRegionItem[] }>({
      url: `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(parsed.project_id)}/regions`,
    });

    const items = response.data?.items ?? [];
    return items
      .filter(
        (item): item is GcpRegionItem =>
          typeof item.name === 'string' && item.name.length > 0,
      )
      .map((item) => ({
        id: item.name,
        name:
          typeof item.description === 'string' && item.description.length > 0
            ? item.description
            : item.name,
      }));
  }
}

function parseServiceAccount(raw: string): ParsedServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ParsedServiceAccount>;
    if (
      parsed.type === 'service_account' &&
      typeof parsed.project_id === 'string' &&
      typeof parsed.client_email === 'string' &&
      typeof parsed.private_key === 'string'
    ) {
      return parsed as ParsedServiceAccount;
    }
    return null;
  } catch {
    return null;
  }
}
