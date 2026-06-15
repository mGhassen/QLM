import { IUsageRepository } from '../../../repositories';
import type {
  GetUsageSummaryInput,
  GetUsageSummaryOutput,
  GetUsageSummaryUseCase,
} from '../../../usecases';

export class GetUsageSummaryService implements GetUsageSummaryUseCase {
  constructor(private readonly usageRepository: IUsageRepository) {}

  public execute(input: GetUsageSummaryInput): Promise<GetUsageSummaryOutput> {
    return this.usageRepository.getUsageSummary(input);
  }
}
