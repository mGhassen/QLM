import type { RepositoryFindOptions } from '@qlm/domain/common';
import type { UserQuota } from '@qlm/domain/entities';
import { IUserQuotaRepository } from '@qlm/domain/repositories';

export class UserQuotaRepository extends IUserQuotaRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<UserQuota[]> {
    return [];
  }

  async findById(_id: string): Promise<UserQuota | null> {
    return null;
  }

  async findBySlug(_slug: string): Promise<UserQuota | null> {
    return null;
  }

  async create(_entity: UserQuota): Promise<UserQuota> {
    throw new Error(
      'User quotas cannot be created in memory repository (server-side only)',
    );
  }

  async update(_entity: UserQuota): Promise<UserQuota> {
    throw new Error(
      'User quotas cannot be updated in memory repository (server-side only)',
    );
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'User quotas cannot be deleted in memory repository (server-side only)',
    );
  }

  async findByOrganizationId(_organizationId: string): Promise<UserQuota[]> {
    return [];
  }

  async findByUserId(
    _organizationId: string,
    _userId: string,
  ): Promise<UserQuota | null> {
    return null;
  }
}
