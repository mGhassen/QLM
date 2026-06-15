import type { IPoolRepository } from '../../repositories/pool-repository.port';
import type {
  ListPoolsByProjectUseCase,
  ListPoolsInput,
  ListPoolsOutput,
} from '../../usecases/pool/list-pools-by-project.usecase';

export class ListPoolsByProjectService implements ListPoolsByProjectUseCase {
  constructor(private readonly poolRepository: IPoolRepository) {}

  public async execute(input: ListPoolsInput): Promise<ListPoolsOutput> {
    const items = await this.poolRepository.findByOrganizationId(
      input.projectId,
    );
    return { items };
  }
}
