import type { Nullable } from '@qlm/domain/common';
import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { Organization } from '@qlm/domain/entities';
import { IOrganizationRepository } from '@qlm/domain/repositories';
import type { OrganizationBillingData } from '@qlm/domain/usecases';

export class OrganizationRepository extends IOrganizationRepository {
  private organizations = new Map<string, Organization>();

  async search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]> {
    const q = query.trim().toLowerCase();
    const all = Array.from(this.organizations.values());
    const filtered = q
      ? all.filter((org) => {
          const name = org.name?.toLowerCase() ?? '';
          const slug = org.slug?.toLowerCase() ?? '';
          return name.includes(q) || slug.includes(q);
        })
      : all;

    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit
      ? filtered.slice(offset, offset + limit)
      : filtered.slice(offset);
  }

  async findAll(options?: RepositoryFindOptions): Promise<Organization[]> {
    const allOrgs = Array.from(this.organizations.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allOrgs.slice(offset, offset + limit);
    }
    return allOrgs.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Organization>> {
    return this.organizations.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<Organization>> {
    const orgs = Array.from(this.organizations.values());
    return orgs.find((org) => org.slug === slug) ?? null;
  }

  async create(entity: Organization): Promise<Organization> {
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async update(entity: Organization): Promise<Organization> {
    if (!this.organizations.has(entity.id)) {
      throw new Error(`Organization with id ${entity.id} not found`);
    }
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.organizations.delete(id);
  }

  async getBillingData(
    organizationId: string,
  ): Promise<OrganizationBillingData> {
    const organization = this.organizations.get(organizationId);
    if (!organization) {
      throw new Error(`Organization with id '${organizationId}' not found`);
    }

    // Return default billing data for in-memory repository
    // In a real implementation, this would fetch from a billing/credits table
    return {
      balance: 0,
      totalPurchased: 0,
      totalConsumed: 0,
      totalAllocated: 0,
      accountId: '',
    };
  }
}
