import { v4 as uuidv4 } from 'uuid';
import type { RepositoryFindOptions } from '@guepard/domain/common';
import type { Organization } from '@guepard/domain/entities';
import { IOrganizationRepository } from '@guepard/domain/repositories';
import type { OrganizationBillingData } from '@guepard/domain/usecases';
import type { SupabaseClientType } from './types';

export class OrganizationRepository extends IOrganizationRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private serialize(
    organization: Organization,
    primaryOwnerUserId?: string,
  ): Record<string, unknown> {
    return {
      id: organization.id,
      user_id: primaryOwnerUserId,
      slug: organization.slug,
      name: organization.name,
      hide_sidebar: organization.hideSidebar,
      created_at: organization.createdAt.toISOString(),
      updated_at: organization.updatedAt.toISOString(),
      created_by: organization.createdBy,
      updated_by: organization.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Organization {
    const ownerUserId = row.user_id as string;
    // Seed / legacy rows may have null audit columns; domain schema requires strings.
    const createdBy = (row.created_by as string | null) ?? ownerUserId;
    const updatedBy = (row.updated_by as string | null) ?? ownerUserId;

    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      userId: ownerUserId,
      hideSidebar: (row.hide_sidebar as boolean | undefined) ?? false,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy,
      updatedBy,
    } as Organization;
  }

  async search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]> {
    const q = query.trim();
    let builder = this.client
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (q) {
      const pattern = `%${q}%`;
      builder = builder.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }

    if (options?.offset !== undefined || options?.limit !== undefined) {
      const from = options?.offset ?? 0;
      const to = options?.limit != null ? from + options.limit - 1 : from + 999;
      builder = builder.range(from, to);
    }

    const { data, error } = await builder;

    if (error) {
      throw new Error(`Failed to search organizations: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Organization[]> {
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }

    return (data || []).map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Organization | null> {
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch organization: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch organization by slug: ${error.message}`);
    }

    return data ? this.deserialize(data) : null;
  }

  async create(entity: Organization): Promise<Organization> {
    // Get user ID for user_id - when using service role without session, use entity.userId
    const {
      data: { user },
    } = await this.client.auth.getUser();
    const userId = user?.id ?? entity.userId;
    if (!userId) {
      throw new Error(
        'User must be authenticated or entity.userId must be provided to create an organization',
      );
    }

    const now = new Date();

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: entity.createdBy || userId,
      updatedBy: entity.updatedBy || userId,
      userId: entity.userId || userId,
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug, userId);
    const { data, error } = await this.client
      .from('organizations')
      .insert(serialized as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    return this.deserialize(data);
  }

  async update(entity: Organization): Promise<Organization> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    const userId = user?.id ?? entity.updatedBy ?? entity.userId;
    if (!userId) {
      throw new Error(
        'User must be authenticated or entity.updatedBy/userId must be provided to update an organization',
      );
    }
    const entityForUpdate = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy || userId,
    };

    const serialized = this.serialize(entityForUpdate);
    const { data, error } = await this.client
      .from('organizations')
      .update({
        name: serialized.name as string,
        hide_sidebar: serialized.hide_sidebar as boolean,
        updated_at: serialized.updated_at as string,
        updated_by: serialized.updated_by as string,
      } as never)
      .eq('id', entity.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Organization with id ${entity.id} not found`);
    }

    return this.deserialize(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }

    return true;
  }

  async getBillingData(
    organizationId: string,
  ): Promise<OrganizationBillingData> {
    // Query all columns since types are out of sync with actual schema
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      throw new Error(
        `Failed to fetch organization billing data: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(`Organization with id '${organizationId}' not found`);
    }

    // Type assertion needed because database types are out of sync
    // Actual schema has user_id, but types show account_id
    const orgRow = data as unknown as {
      credits_balance?: number;
      credits_total_purchased?: number;
      credits_total_consumed?: number;
      credits_total_allocated?: number;
      user_id?: string;
      account_id?: string;
    };

    // Get account_id from the user's personal account using user_id
    let accountId: string | undefined;
    if (orgRow.user_id) {
      const { data: account } = await this.client
        .from('accounts')
        .select('id')
        .eq('user_id', orgRow.user_id)
        .maybeSingle();
      accountId = account?.id;
    } else if (orgRow.account_id) {
      // Fallback if account_id exists in types but not in actual DB
      accountId = orgRow.account_id;
    }

    return {
      balance: Number(orgRow.credits_balance || 0),
      totalPurchased: Number(orgRow.credits_total_purchased || 0),
      totalConsumed: Number(orgRow.credits_total_consumed || 0),
      totalAllocated: Number(orgRow.credits_total_allocated || 0),
      accountId: accountId || organizationId, // Fallback to org ID if account not found
    };
  }
}
