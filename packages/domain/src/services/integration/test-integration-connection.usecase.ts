import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import {
  IIntegrationConnectionRepository,
  ISecretVault,
} from '../../repositories';
import type { TestIntegrationConnectionUseCase } from '../../usecases/integration/integration.usecase';
import type { TestResult } from '../../usecases';
import { buildRevealedCredentials } from './credential-payload';
import type { IIntegrationProviderDriverRegistry } from './provider-driver.port';

export class TestIntegrationConnectionService implements TestIntegrationConnectionUseCase {
  constructor(
    private readonly repository: IIntegrationConnectionRepository,
    private readonly vault: ISecretVault,
    private readonly driverRegistry: IIntegrationProviderDriverRegistry,
  ) {}

  public async execute(id: string): Promise<TestResult> {
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
    const result = await driver.testConnection(creds);

    await this.repository.updateTestResult(existing.id, {
      status: result.ok ? 'success' : 'failed',
      identity: result.ok ? (result.identity ?? null) : null,
      error: result.ok
        ? null
        : (result.errorMessage ?? result.errorCode ?? 'unknown'),
      testedAt: new Date(),
    });

    return result;
  }
}
