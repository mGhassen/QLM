import { Exclude, Expose, plainToClass, Type } from 'class-transformer';

import type {
  IntegrationConnection,
  IntegrationConnectionConfig,
  IntegrationProvider,
  IntegrationTestStatus,
} from '../../entities/integration-connection.type';

/**
 * Sanitised DTO — the only shape of an integration that ever crosses the
 * server→browser boundary. Deliberately does NOT expose `secretRef` or any
 * raw credential field. See spec §5.1.
 *
 * The features package (packages/features/integrations) imports this type to
 * prop-type its presentational components so that a schema change in the
 * persistence layer immediately fails compilation of every story and fixture.
 */
@Exclude()
export class IntegrationConnectionOutput {
  @Expose()
  public id!: string;
  @Expose()
  public projectId!: string;
  @Expose()
  public provider!: IntegrationProvider;
  @Expose()
  public name!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public config!: IntegrationConnectionConfig;
  @Expose()
  public testStatus!: IntegrationTestStatus;
  @Expose()
  public testIdentity!: string | null;
  @Expose()
  public testError!: string | null;
  @Expose()
  @Type(() => Date)
  public testedAt!: Date | null;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string | null;

  public static new(
    integrationConnection: IntegrationConnection,
  ): IntegrationConnectionOutput {
    return plainToClass(IntegrationConnectionOutput, integrationConnection);
  }
}

// ── Credential input union ────────────────────────────────────────────────
// These types describe the raw-credential payloads that cross the HTTP
// boundary exactly once — on create and on rotate. After the server receives
// them, ISecretVault.protect() is called and the raw values are dropped from
// memory. They are never stored in the persistence schema or logged.

export type AwsCredentialsInput = {
  provider: 'aws';
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  defaultRegion: string;
};

export type GcpCredentialsInput = {
  provider: 'gcp';
  /** Raw service-account JSON text as downloaded from GCP IAM. */
  serviceAccountJson: string;
  defaultRegion: string;
};

export type CredentialsInput = AwsCredentialsInput | GcpCredentialsInput;

// ── Use-case input DTOs ───────────────────────────────────────────────────

export type CreateIntegrationConnectionInput = {
  projectId: string;
  name: string;
  credentials: CredentialsInput;
  createdBy: string;
};

export type UpdateIntegrationConnectionInput = {
  id: string;
  name?: string;
  updatedBy: string;
};

export type UpdateIntegrationCredentialsInput = {
  id: string;
  credentials: CredentialsInput;
  updatedBy: string;
};

// ── Driver result DTOs ────────────────────────────────────────────────────
// Used by the provider-driver port in step 7 and returned verbatim to the
// browser by POST /:id/test and GET /:id/regions. Kept here (and not in the
// driver package) so the features package depends on @guepard/domain only
// for every shape it needs.

export type TestResultErrorCode =
  | 'invalid_credentials'
  | 'network'
  | 'permission_denied'
  | 'unknown';

export type TestResult = {
  ok: boolean;
  /** AWS caller ARN or GCP service-account email on success. */
  identity?: string;
  errorCode?: TestResultErrorCode;
  errorMessage?: string;
};

export type Region = {
  /** Provider-native region id, e.g. "us-east-1", "europe-west1". */
  id: string;
  /** Human-readable label. */
  name: string;
};
