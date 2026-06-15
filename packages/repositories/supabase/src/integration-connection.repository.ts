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

import type { SupabaseClientType } from './types';

/**
 * Supabase-backed implementation of IIntegrationConnectionRepository.
 *
 * Phase 1 note: the web app talks to integrations through HTTP routes only
 * (see spec §9 + §13 open question #6) so at runtime this adapter is used
 * exclusively by the server. It exists at all for parity with every other
 * entity and so that a later phase can flip reads to direct Supabase
 * without rewriting the repository.
 */
export class IntegrationConnectionRepository extends IIntegrationConnectionRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(entity: IntegrationConnection): Record<string, unknown> {
    return {
      id: entity.id,
      project_id: entity.projectId,
      provider: entity.provider,
      name: entity.name,
      slug: entity.slug,
      config: entity.config as unknown as Record<string, unknown>,
      secret_ref: entity.secretRef,
      test_status: entity.testStatus,
      test_identity: entity.testIdentity,
      test_error: entity.testError,
      tested_at: entity.testedAt ? entity.testedAt.toISOString() : null,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      created_by: entity.createdBy,
      updated_by: entity.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): IntegrationConnection {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      provider: row.provider as IntegrationProvider,
      name: row.name as string,
      slug: row.slug as string,
      config: (row.config as IntegrationConnectionConfig) ?? {
        defaultRegion: '',
      },
      secretRef: (row.secret_ref as string | null) ?? null,
      testStatus: (row.test_status as IntegrationTestStatus) ?? 'untested',
      testIdentity: (row.test_identity as string | null) ?? null,
      testError: (row.test_error as string | null) ?? null,
      testedAt: row.tested_at ? new Date(row.tested_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: (row.created_by as string | null) ?? null,
      updatedBy: (row.updated_by as string | null) ?? null,
    };
  }

  // ── RepositoryPort methods ───────────────────────────────────────────────

  async findAll(): Promise<IntegrationConnection[]> {
    const { data, error } = await this.client
      .from('integration_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    return (data ?? []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<IntegrationConnection | null> {
    const { data, error } = await this.client
      .from('integration_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch integration: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(slug: string): Promise<IntegrationConnection | null> {
    const { data, error } = await this.client
      .from('integration_connections')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch integration by slug: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async create(entity: IntegrationConnection): Promise<IntegrationConnection> {
    const serialized = this.serialize(entity);
    const { data, error } = await this.client
      .from('integration_connections')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: IntegrationConnection): Promise<IntegrationConnection> {
    // Deliberately only update fields the domain service is allowed to
    // touch through the generic `update()` path — name and updated_*. Test
    // results and credential rotation go through dedicated methods so the
    // intent is explicit at the call site and we avoid accidentally
    // clobbering a test result with a stale in-memory entity.
    const { data, error } = await this.client
      .from('integration_connections')
      .update({
        name: entity.name,
        updated_at: entity.updatedAt.toISOString(),
        updated_by: entity.updatedBy,
      })
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Integration with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('integration_connections')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete integration: ${error.message}`);
    }

    return true;
  }

  // ── IIntegrationConnectionRepository methods ─────────────────────────────

  async findByProjectId(projectId: string): Promise<IntegrationConnection[]> {
    const { data, error } = await this.client
      .from('integration_connections')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch integrations by project: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => this.deserialize(row));
  }

  async findBySlugInProject(
    projectId: string,
    slug: string,
  ): Promise<IntegrationConnection | null> {
    const { data, error } = await this.client
      .from('integration_connections')
      .select('*')
      .eq('project_id', projectId)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch integration by slug in project: ${error.message}`,
      );
    }

    return data ? this.deserialize(data) : null;
  }

  async updateTestResult(
    id: string,
    result: IntegrationTestResultUpdate,
  ): Promise<void> {
    const { error } = await this.client
      .from('integration_connections')
      .update({
        test_status: result.status,
        test_identity: result.identity,
        test_error: result.error,
        tested_at: result.testedAt.toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(
        `Failed to persist integration test result: ${error.message}`,
      );
    }
  }

  async updateCredentialsRef(
    id: string,
    newSecretRef: string,
    updatedBy: string,
  ): Promise<void> {
    const { error } = await this.client
      .from('integration_connections')
      .update({
        secret_ref: newSecretRef,
        test_status: 'untested',
        test_identity: null,
        test_error: null,
        tested_at: null,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq('id', id);

    if (error) {
      throw new Error(
        `Failed to rotate integration credentials: ${error.message}`,
      );
    }
  }
}
