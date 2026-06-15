import type { UserQuota } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IUserQuotaRepository extends RepositoryPort<
  UserQuota,
  string
> {
  public abstract findByOrganizationId(
    organizationId: string,
  ): Promise<UserQuota[]>;
  public abstract findByUserId(
    organizationId: string,
    userId: string,
  ): Promise<UserQuota | null>;
}
