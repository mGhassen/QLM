import { IntegrationConnectionEntity } from '../../entities';
import {
  IIntegrationConnectionRepository,
  ISecretVault,
} from '../../repositories';
import type { CreateIntegrationConnectionUseCase } from '../../usecases/integration/integration.usecase';
import {
  CreateIntegrationConnectionInput,
  IntegrationConnectionOutput,
} from '../../usecases';
import { splitCredentialsForStorage } from './credential-payload';

export class CreateIntegrationConnectionService implements CreateIntegrationConnectionUseCase {
  constructor(
    private readonly repository: IIntegrationConnectionRepository,
    private readonly vault: ISecretVault,
  ) {}

  public async execute(
    input: CreateIntegrationConnectionInput,
  ): Promise<IntegrationConnectionOutput> {
    const { secretPayload, config } = splitCredentialsForStorage(
      input.credentials,
    );

    const secretRef = await this.vault.protect(JSON.stringify(secretPayload), {
      keyName: `integration:${secretPayload.provider}:${input.projectId}`,
    });

    const entity = IntegrationConnectionEntity.create({
      projectId: input.projectId,
      provider: input.credentials.provider,
      name: input.name,
      config,
      secretRef,
      createdBy: input.createdBy,
    });

    const persisted = await this.repository.create(entity);
    return IntegrationConnectionOutput.new(persisted);
  }
}
