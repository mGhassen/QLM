import { Exclude, Expose, plainToClass, Type } from 'class-transformer';
import { Organization } from '../../entities';

@Exclude()
export class OrganizationOutput {
  @Expose()
  public id!: string;
  @Expose()
  public name!: string;
  @Expose()
  public slug!: string;
  @Expose()
  public userId!: string;
  @Expose()
  public hideSidebar!: boolean;
  @Expose()
  @Type(() => Date)
  public createdAt!: Date;
  @Expose()
  @Type(() => Date)
  public updatedAt!: Date;
  @Expose()
  public createdBy!: string;
  @Expose()
  public updatedBy!: string;

  public static new(organization: Organization): OrganizationOutput {
    return plainToClass(OrganizationOutput, organization);
  }
}

export type CreateOrganizationInput = {
  name: string;
  userId: string;
  createdBy: string;
};

export type UpdateOrganizationInput = {
  id: string;
  name?: string;
  userId?: string;
  hideSidebar?: boolean;
  updatedBy?: string;
};

/**
 * Organization billing data derived from the organizations row.
 * Shape mirrors what `SupabaseOrganizationRepository.getBillingData` returns.
 */
export type OrganizationBillingData = {
  balance: number;
  totalPurchased: number;
  totalConsumed: number;
  totalAllocated: number;
  accountId: string;
};

export type GetOrganizationBillingInput = string;
export type GetOrganizationBillingOutput = OrganizationBillingData;

export interface GetOrganizationBillingUseCase {
  execute(
    input: GetOrganizationBillingInput,
  ): Promise<GetOrganizationBillingOutput>;
}
