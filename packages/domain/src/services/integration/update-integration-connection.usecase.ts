import { Code } from '../../common/code';
import { IntegrationConnectionEntity } from '../../entities';
import { DomainException } from '../../exceptions';
import { IIntegrationConnectionRepository } from '../../repositories';
import type { UpdateIntegrationConnectionUseCase } from '../../usecases/integration/integration.usecase';
import {
  IntegrationConnectionOutput,
  UpdateIntegrationConnectionInput,
} from '../../usecases';

export class UpdateIntegrationConnectionService implements UpdateIntegrationConnectionUseCase {
  constructor(private readonly repository: IIntegrationConnectionRepository) {}

  public async execute(
    input: UpdateIntegrationConnectionInput,
  ): Promise<IntegrationConnectionOutput> {
    const existing = await this.repository.findById(input.id);
    if (!existing) {
      throw DomainException.new({
        code: Code.INTEGRATION_NOT_FOUND_ERROR,
        overrideMessage: `Integration with id '${input.id}' not found`,
        data: { integrationId: input.id },
      });
    }

    const updated = IntegrationConnectionEntity.update(existing, {
      name: input.name,
      updatedBy: input.updatedBy,
    });

    const persisted = await this.repository.update(updated);
    return IntegrationConnectionOutput.new(persisted);
  }
}
