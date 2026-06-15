import type { IntegrationProvider } from '../../entities';
import type {
  Region,
  TestResult,
} from '../../usecases/dto/integration-usecase-dto';

/**
 * Credentials a driver receives to talk to a provider, after the service has
 * combined the vault-revealed secret payload with the non-secret metadata
 * from the row's `config`. Deliberately a discriminated union so drivers
 * get exhaustive narrowing without casts.
 *
 * This type lives in the domain layer but is *only* ever constructed and
 * consumed server-side. Browser-facing DTOs (`IntegrationConnectionOutput`,
 * `TestResult`, `Region`) live in `usecases/dto/integration-usecase-dto.ts`.
 */
export type RevealedCredentials =
  | {
      provider: 'aws';
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
      defaultRegion: string;
    }
  | {
      provider: 'gcp';
      serviceAccountJson: string;
      defaultRegion: string;
    };

/**
 * Port implemented once per cloud provider. Concrete drivers live in the
 * server-only `@qlm/integrations-drivers` package (step 7) and import
 * the provider SDKs. Nothing in `packages/domain` imports an SDK.
 *
 * Phase 1 exposes only `testConnection` and `listRegions`. Phases 2 and 3
 * grow the interface with provisioning (dataplane nodes) and ingestion
 * methods; the spec's §7 sketches their shapes.
 */
export interface IIntegrationProviderDriver {
  readonly provider: IntegrationProvider;
  testConnection(creds: RevealedCredentials): Promise<TestResult>;
  listRegions(creds: RevealedCredentials): Promise<Region[]>;
}

/**
 * Resolves a concrete driver by provider id. Injected into services via
 * constructor so the domain stays free of provider SDK imports.
 */
export abstract class IIntegrationProviderDriverRegistry {
  public abstract resolve(
    provider: IntegrationProvider,
  ): IIntegrationProviderDriver;
}
