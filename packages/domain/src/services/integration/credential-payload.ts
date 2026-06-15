import { Code } from '../../common/code';
import type { IntegrationConnectionConfig } from '../../entities';
import { DomainException } from '../../exceptions';
import type { CredentialsInput } from '../../usecases/dto/integration-usecase-dto';
import type { RevealedCredentials } from './provider-driver.port';

/**
 * The shape that gets JSON-stringified and handed to `ISecretVault.protect()`.
 * Non-secret fields (defaultRegion, projectId hint) live on the row's `config`,
 * NOT in this payload. This split is the whole reason the two types exist:
 * the day OIDC lands, the secret side is replaced without touching config.
 */
export type StoredSecretPayload =
  | {
      provider: 'aws';
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    }
  | { provider: 'gcp'; serviceAccountJson: string };

export type SplitCredentials = {
  secretPayload: StoredSecretPayload;
  config: IntegrationConnectionConfig;
};

/**
 * Split an incoming CredentialsInput into the secret payload that goes to
 * the vault and the non-secret config that gets persisted on the row.
 *
 * For GCP we also try to extract `project_id` from the service-account JSON
 * and stash it as `accountHint` so the list view can show a friendly label
 * without waiting for a successful test.
 */
export function splitCredentialsForStorage(
  credentials: CredentialsInput,
): SplitCredentials {
  if (credentials.provider === 'aws') {
    return {
      secretPayload: {
        provider: 'aws',
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken !== undefined && {
          sessionToken: credentials.sessionToken,
        }),
      },
      config: {
        defaultRegion: credentials.defaultRegion,
      },
    };
  }

  const projectId = extractGcpProjectId(credentials.serviceAccountJson);
  return {
    secretPayload: {
      provider: 'gcp',
      serviceAccountJson: credentials.serviceAccountJson,
    },
    config: {
      defaultRegion: credentials.defaultRegion,
      ...(projectId && { accountHint: projectId }),
    },
  };
}

/**
 * Inverse of {@link splitCredentialsForStorage}: given a revealed JSON blob
 * from the vault and the row's config, produce the `RevealedCredentials`
 * shape that a provider driver consumes.
 */
export function buildRevealedCredentials(
  rawJson: string,
  config: IntegrationConnectionConfig,
): RevealedCredentials {
  let payload: StoredSecretPayload;
  try {
    payload = JSON.parse(rawJson) as StoredSecretPayload;
  } catch (error) {
    throw DomainException.new({
      code: Code.INTEGRATION_DRIVER_ERROR,
      overrideMessage:
        'Stored credential payload is not valid JSON. The vault may be corrupted or a different encoding was used.',
      data: { parseError: (error as Error).message },
    });
  }

  if (payload.provider === 'aws') {
    return {
      provider: 'aws',
      accessKeyId: payload.accessKeyId,
      secretAccessKey: payload.secretAccessKey,
      ...(payload.sessionToken !== undefined && {
        sessionToken: payload.sessionToken,
      }),
      defaultRegion: config.defaultRegion,
    };
  }

  return {
    provider: 'gcp',
    serviceAccountJson: payload.serviceAccountJson,
    defaultRegion: config.defaultRegion,
  };
}

function extractGcpProjectId(serviceAccountJson: string): string | null {
  try {
    const parsed = JSON.parse(serviceAccountJson) as { project_id?: string };
    return typeof parsed.project_id === 'string' && parsed.project_id.length > 0
      ? parsed.project_id
      : null;
  } catch {
    return null;
  }
}
