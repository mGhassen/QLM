import { Organization } from '../entities';
import type { RepositoryFindOptions } from '../common/repository-options';
import type { OrganizationBillingData } from '../usecases/dto/organization-usecase-dto';
import { RepositoryPort } from './base-repository.port';

export abstract class IOrganizationRepository extends RepositoryPort<
  Organization,
  string
> {
  public abstract search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]>;

  /**
   * Fetch billing data for an organization (credits balance, totals, account id).
   */
  public abstract getBillingData(
    organizationId: string,
  ): Promise<OrganizationBillingData>;
}
