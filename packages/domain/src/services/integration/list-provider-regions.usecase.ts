import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import {
  IIntegrationConnectionRepository,
  ISecretVault,
} from '../../repositories';
import type { ListProviderRegionsUseCase } from '../../usecases/integration/integration.usecase';
import type { Region } from '../../usecases';
import { buildRevealedCredentials } from './credential-payload';
import type { IIntegrationProviderDriverRegistry } from './provider-driver.port';

export class ListProviderRegionsService implements ListProviderRegionsUseCase {
  constructor(
    private readonly repository: IIntegrationConnectionRepository,
    private readonly vault: ISecretVault,
    private readonly driverRegistry: IIntegrationProviderDriverRegistry,
  ) {}

  public async execute(id: string): Promise<Region[]> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw DomainException.new({
        code: Code.INTEGRATION_NOT_FOUND_ERROR,
        overrideMessage: `Integration with id '${id}' not found`,
        data: { integrationId: id },
      });
    }

    if (!existing.secretRef) {
      throw DomainException.new({
        code: Code.INTEGRATION_VALIDATION_ERROR,
        overrideMessage: `Integration with id '${id}' has no credentials attached`,
        data: { integrationId: id },
      });
    }

    const rawJson = await this.vault.reveal(existing.secretRef);
    const creds = buildRevealedCredentials(rawJson, existing.config);
    const driver = this.driverRegistry.resolve(existing.provider);
    return driver.listRegions(creds);
  }
}
