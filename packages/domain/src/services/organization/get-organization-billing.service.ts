import { IOrganizationRepository } from '../../repositories';
import type {
  GetOrganizationBillingInput,
  GetOrganizationBillingOutput,
  GetOrganizationBillingUseCase,
} from '../../usecases';

export class GetOrganizationBillingService implements GetOrganizationBillingUseCase {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  public execute(
    input: GetOrganizationBillingInput,
  ): Promise<GetOrganizationBillingOutput> {
    return this.organizationRepository.getBillingData(input);
  }
}
