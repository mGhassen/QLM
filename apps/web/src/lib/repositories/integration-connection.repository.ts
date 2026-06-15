import { plainToClass } from 'class-transformer';

import type {
  IntegrationConnection,
  IntegrationConnectionConfig,
  IntegrationProvider,
  IntegrationTestStatus,
} from '@guepard/domain/entities';
import {
  IIntegrationConnectionRepository,
  type IntegrationTestResultUpdate,
} from '@guepard/domain/repositories';
import {
  IntegrationConnectionOutput,
  type CreateIntegrationConnectionInput,
  type CredentialsInput,
  type Region,
  type TestResult,
  type UpdateIntegrationConnectionInput,
  type UpdateIntegrationCredentialsInput,
} from '@guepard/domain/usecases';

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api-client';

/**
 * Wire shape of an integration as returned by the server — snake-free,
 * dates as ISO strings. We convert it into a proper
 * `IntegrationConnectionOutput` (Dates, typed enums) via `plainToClass`
 * so the feature package receives the same shape as its Storybook fixtures.
 */
type IntegrationDtoJson = {
  id: string;
  projectId: string;
  provider: IntegrationProvider;
  name: string;
  slug: string;
  config: IntegrationConnectionConfig;
  testStatus: IntegrationTestStatus;
  testIdentity: string | null;
  testError: string | null;
  testedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

function hydrate(json: IntegrationDtoJson): IntegrationConnectionOutput {
  return plainToClass(IntegrationConnectionOutput, json);
}

/**
 * Convert a wire DTO into a minimally-shaped `IntegrationConnection`
 * entity so port methods that return the entity type compile. The browser
 * never sees the real `secretRef` (it's on the server behind the vault),
 * so we pin it to `null` and derive `updatedBy` from `createdBy` — neither
 * field is ever consumed by the feature package.
 */
function toEntity(json: IntegrationDtoJson): IntegrationConnection {
  return {
    id: json.id,
    projectId: json.projectId,
    provider: json.provider,
    name: json.name,
    slug: json.slug,
    config: json.config,
    secretRef: null,
    testStatus: json.testStatus,
    testIdentity: json.testIdentity,
    testError: json.testError,
    testedAt: json.testedAt ? new Date(json.testedAt) : null,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
    createdBy: json.createdBy,
    updatedBy: json.createdBy,
  };
}

const WRITE_NOT_SUPPORTED =
  'IntegrationConnectionHttpRepository does not support entity-shaped writes. ' +
  'Use createIntegration / renameIntegration / rotateCredentials / deleteIntegration instead.';

/**
 * Browser-side HTTP adapter for `/api/integrations`.
 *
 * Extends `IIntegrationConnectionRepository` so it can be wired into the
 * `Repositories` bag that the shell runtime consumes. The **read** methods
 * on the port (`findAll`, `findById`, `findByProjectId`, …) are implemented
 * as `apiGet` calls.
 *
 * The **write** methods on the port (`create(entity)`, `update(entity)`,
 * `updateTestResult`, `updateCredentialsRef`) intentionally throw — they
 * take entity-shaped inputs that the browser cannot meaningfully construct
 * (it would have to invent a `secretRef`). Instead, the class exposes a
 * parallel set of **non-port methods** (`createIntegration`,
 * `renameIntegration`, `rotateCredentials`, `runTest`, `runTestDraft`,
 * `listRegionsById`, `deleteIntegration`) that take the spec §5.2 wire
 * shapes directly and are what the shell resource (step 11) calls.
 *
 * Design note: we could split this into two classes (port-shaped read-only
 * + a separate API client), but collapsing them keeps the `Repositories`
 * wiring simple and lets a caller fetch both read and write capability
 * from a single reference.
 */
export class IntegrationConnectionHttpRepository extends IIntegrationConnectionRepository {
  // ── Port read methods ───────────────────────────────────────────────────

  async findAll(): Promise<IntegrationConnection[]> {
    throw new Error(
      'IntegrationConnectionHttpRepository.findAll is not supported — integrations must be listed per project. Use findByProjectId instead.',
    );
  }

  async findById(id: string): Promise<IntegrationConnection | null> {
    const json = await apiGet<IntegrationDtoJson>(
      `/integrations/${encodeURIComponent(id)}`,
      true,
    );
    return json ? toEntity(json) : null;
  }

  async findBySlug(_slug: string): Promise<IntegrationConnection | null> {
    throw new Error(
      'IntegrationConnectionHttpRepository.findBySlug is not supported — the server API only serves by id. Use findBySlugInProject inside a domain service or look the row up by id.',
    );
  }

  async findByProjectId(projectId: string): Promise<IntegrationConnection[]> {
    const json = await apiGet<IntegrationDtoJson[]>(
      `/integrations?projectId=${encodeURIComponent(projectId)}`,
      false,
    );
    return (json ?? []).map(toEntity);
  }

  async findBySlugInProject(
    _projectId: string,
    _slug: string,
  ): Promise<IntegrationConnection | null> {
    throw new Error(
      'IntegrationConnectionHttpRepository.findBySlugInProject is not supported on the browser — the server handles slug collisions at create time.',
    );
  }

  // ── Port write methods (intentional throws) ─────────────────────────────

  async create(_entity: IntegrationConnection): Promise<IntegrationConnection> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  async update(_entity: IntegrationConnection): Promise<IntegrationConnection> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  async updateTestResult(
    _id: string,
    _result: IntegrationTestResultUpdate,
  ): Promise<void> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  async updateCredentialsRef(
    _id: string,
    _newSecretRef: string,
    _updatedBy: string,
  ): Promise<void> {
    throw new Error(WRITE_NOT_SUPPORTED);
  }

  // ── Non-port HTTP methods the shell resource uses ───────────────────────

  /**
   * Project-scoped list, returning fully-hydrated
   * `IntegrationConnectionOutput` instances (the class shape the feature
   * package consumes, matching its Storybook fixtures).
   */
  async listByProject(
    projectId: string,
  ): Promise<IntegrationConnectionOutput[]> {
    const json = await apiGet<IntegrationDtoJson[]>(
      `/integrations?projectId=${encodeURIComponent(projectId)}`,
      false,
    );
    return (json ?? []).map(hydrate);
  }

  async getById(id: string): Promise<IntegrationConnectionOutput | null> {
    const json = await apiGet<IntegrationDtoJson>(
      `/integrations/${encodeURIComponent(id)}`,
      true,
    );
    return json ? hydrate(json) : null;
  }

  async createIntegration(
    input: CreateIntegrationConnectionInput,
  ): Promise<IntegrationConnectionOutput> {
    const json = await apiPost<IntegrationDtoJson>('/integrations', input);
    return hydrate(json);
  }

  async renameIntegration(
    id: string,
    input: Omit<UpdateIntegrationConnectionInput, 'id'>,
  ): Promise<IntegrationConnectionOutput> {
    const json = await apiPatch<IntegrationDtoJson>(
      `/integrations/${encodeURIComponent(id)}`,
      input,
    );
    return hydrate(json);
  }

  async rotateCredentials(
    id: string,
    input: Omit<UpdateIntegrationCredentialsInput, 'id'>,
  ): Promise<IntegrationConnectionOutput> {
    const json = await apiPut<IntegrationDtoJson>(
      `/integrations/${encodeURIComponent(id)}/credentials`,
      input,
    );
    return hydrate(json);
  }

  async deleteIntegration(id: string): Promise<void> {
    await apiDelete(`/integrations/${encodeURIComponent(id)}`);
  }

  async runTest(id: string): Promise<TestResult> {
    return apiPost<TestResult>(
      `/integrations/${encodeURIComponent(id)}/test`,
      {},
    );
  }

  async runTestDraft(credentials: CredentialsInput): Promise<TestResult> {
    return apiPost<TestResult>('/integrations/test-draft', { credentials });
  }

  async listRegionsById(id: string): Promise<Region[]> {
    const regions = await apiGet<Region[]>(
      `/integrations/${encodeURIComponent(id)}/regions`,
      false,
    );
    return regions ?? [];
  }
}
