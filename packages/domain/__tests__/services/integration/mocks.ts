import type {
  IntegrationConnection,
  IntegrationProvider,
} from '../../../src/entities';
import {
  IIntegrationConnectionRepository,
  type IntegrationTestResultUpdate,
} from '../../../src/repositories/integration-connection-repository.port';
import type { ISecretVault } from '../../../src/repositories/secret-vault.port';
import { IIntegrationProviderDriverRegistry } from '../../../src/services/integration/provider-driver.port';
import type {
  IIntegrationProviderDriver,
  RevealedCredentials,
} from '../../../src/services/integration/provider-driver.port';
import type { Region, TestResult } from '../../../src/usecases';

/**
 * In-memory IIntegrationConnectionRepository used by every service test.
 * Keeps a Map keyed by id and exposes every abstract method on the port.
 */
export class MockIntegrationConnectionRepository extends IIntegrationConnectionRepository {
  private readonly rows = new Map<string, IntegrationConnection>();

  public seed(row: IntegrationConnection): void {
    this.rows.set(row.id, row);
  }

  public snapshot(id: string): IntegrationConnection | undefined {
    return this.rows.get(id);
  }

  async findAll(): Promise<IntegrationConnection[]> {
    return Array.from(this.rows.values());
  }

  async findById(id: string): Promise<IntegrationConnection | null> {
    return this.rows.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<IntegrationConnection | null> {
    return (
      Array.from(this.rows.values()).find((row) => row.slug === slug) ?? null
    );
  }

  async findByProjectId(projectId: string): Promise<IntegrationConnection[]> {
    return Array.from(this.rows.values()).filter(
      (row) => row.projectId === projectId,
    );
  }

  async findBySlugInProject(
    projectId: string,
    slug: string,
  ): Promise<IntegrationConnection | null> {
    return (
      Array.from(this.rows.values()).find(
        (row) => row.projectId === projectId && row.slug === slug,
      ) ?? null
    );
  }

  async create(entity: IntegrationConnection): Promise<IntegrationConnection> {
    this.rows.set(entity.id, entity);
    return entity;
  }

  async update(entity: IntegrationConnection): Promise<IntegrationConnection> {
    if (!this.rows.has(entity.id)) {
      throw new Error(`Integration with id ${entity.id} not found`);
    }
    this.rows.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id);
  }

  async updateTestResult(
    id: string,
    result: IntegrationTestResultUpdate,
  ): Promise<void> {
    const existing = this.rows.get(id);
    if (!existing) {
      throw new Error(`Integration with id ${id} not found`);
    }
    this.rows.set(id, {
      ...existing,
      testStatus: result.status,
      testIdentity: result.identity,
      testError: result.error,
      testedAt: result.testedAt,
    });
  }

  async updateCredentialsRef(
    id: string,
    newSecretRef: string,
    updatedBy: string,
  ): Promise<void> {
    const existing = this.rows.get(id);
    if (!existing) {
      throw new Error(`Integration with id ${id} not found`);
    }
    this.rows.set(id, {
      ...existing,
      secretRef: newSecretRef,
      testStatus: 'untested',
      testIdentity: null,
      testError: null,
      testedAt: null,
      updatedAt: new Date(),
      updatedBy,
    });
  }

  shortenId(id: string): string {
    return id.slice(0, 8);
  }
}

/**
 * In-memory ISecretVault. Generates deterministic handles so assertions can
 * pattern-match them. Stores the mapping so `reveal` returns whatever
 * `protect` received, modelling a correctly-functioning vault.
 */
export class MockSecretVault implements ISecretVault {
  private readonly store = new Map<string, string>();
  private counter = 0;
  public readonly forgotten: string[] = [];

  async protect(value: string, context: { keyName: string }): Promise<string> {
    const handle = `vault:${context.keyName}:${++this.counter}`;
    this.store.set(handle, value);
    return handle;
  }

  async reveal(protectedValue: string): Promise<string> {
    const value = this.store.get(protectedValue);
    if (value === undefined) {
      throw new Error(`Unknown vault handle: ${protectedValue}`);
    }
    return value;
  }

  isProtected(value: string): boolean {
    return value.startsWith('vault:');
  }

  async forget(protectedValue: string): Promise<void> {
    this.forgotten.push(protectedValue);
    this.store.delete(protectedValue);
  }
}

/**
 * A trivial driver the tests can fully control. `nextResult` / `nextRegions`
 * let each test set the outcome before calling the service; the test can
 * then assert what the driver received.
 */
export class MockProviderDriver implements IIntegrationProviderDriver {
  public readonly testCalls: RevealedCredentials[] = [];
  public readonly listRegionsCalls: RevealedCredentials[] = [];
  public nextResult: TestResult = { ok: true, identity: 'arn:test' };
  public nextRegions: Region[] = [{ id: 'us-east-1', name: 'US East' }];

  constructor(public readonly provider: IntegrationProvider) {}

  async testConnection(creds: RevealedCredentials): Promise<TestResult> {
    this.testCalls.push(creds);
    return this.nextResult;
  }

  async listRegions(creds: RevealedCredentials): Promise<Region[]> {
    this.listRegionsCalls.push(creds);
    return this.nextRegions;
  }
}

export class MockProviderDriverRegistry extends IIntegrationProviderDriverRegistry {
  constructor(
    private readonly drivers: Record<IntegrationProvider, MockProviderDriver>,
  ) {
    super();
  }

  resolve(provider: IntegrationProvider): MockProviderDriver {
    return this.drivers[provider];
  }
}

export function createDefaultRegistry(): {
  registry: MockProviderDriverRegistry;
  aws: MockProviderDriver;
  gcp: MockProviderDriver;
} {
  const aws = new MockProviderDriver('aws');
  const gcp = new MockProviderDriver('gcp');
  return {
    aws,
    gcp,
    registry: new MockProviderDriverRegistry({ aws, gcp }),
  };
}

/**
 * Build an in-memory IntegrationConnection row for seeding the mock repo.
 * Sensible defaults + partial override so each test can keep its setup
 * to the fields it actually cares about.
 */
export function createIntegrationRow(
  overrides: Partial<IntegrationConnection> = {},
): IntegrationConnection {
  const base: IntegrationConnection = {
    id: '11111111-1111-4111-8111-111111111111',
    projectId: '00000000-0000-4000-8000-000000000000',
    provider: 'aws',
    name: 'prod-aws',
    slug: 'prod-aws',
    config: { defaultRegion: 'us-east-1' },
    secretRef: 'vault:integration:aws:stub:1',
    testStatus: 'untested',
    testIdentity: null,
    testError: null,
    testedAt: null,
    createdAt: new Date('2026-04-11T10:00:00.000Z'),
    updatedAt: new Date('2026-04-11T10:00:00.000Z'),
    createdBy: '22222222-2222-4222-8222-222222222222',
    updatedBy: '22222222-2222-4222-8222-222222222222',
  };
  return { ...base, ...overrides };
}
