import { IntegrationConnection, IntegrationTestStatus } from '../entities';
import { RepositoryPort } from './base-repository.port';

/**
 * Persisted shape of a connection test outcome. Narrow subset of the runtime
 * `TestResult` — just the fields that land on the row.
 */
export type IntegrationTestResultUpdate = {
  status: IntegrationTestStatus;
  identity: string | null;
  error: string | null;
  testedAt: Date;
};

export abstract class IIntegrationConnectionRepository extends RepositoryPort<
  IntegrationConnection,
  string
> {
  /** All integrations that belong to a single project. */
  public abstract findByProjectId(
    projectId: string,
  ): Promise<IntegrationConnection[]>;

  /**
   * Slugs are unique within a project. Used by the create service to retry
   * with a numeric suffix on collision.
   */
  public abstract findBySlugInProject(
    projectId: string,
    slug: string,
  ): Promise<IntegrationConnection | null>;

  /**
   * Persist the outcome of a connection test without re-writing the full
   * entity. Test results are updated frequently and the domain stays clean
   * by never mutating the in-memory entity — the repository bumps the row.
   */
  public abstract updateTestResult(
    id: string,
    result: IntegrationTestResultUpdate,
  ): Promise<void>;

  /**
   * Replace the opaque secret handle on an existing row and reset the test
   * state to `untested`. Called by credential rotation so the old secret
   * handle can be forgotten by the caller after this method returns.
   */
  public abstract updateCredentialsRef(
    id: string,
    newSecretRef: string,
    updatedBy: string,
  ): Promise<void>;
}
