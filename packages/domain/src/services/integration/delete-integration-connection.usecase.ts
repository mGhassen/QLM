import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import {
  IIntegrationConnectionRepository,
  ISecretVault,
} from '../../repositories';
import type { DeleteIntegrationConnectionUseCase } from '../../usecases/integration/integration.usecase';

export class DeleteIntegrationConnectionService implements DeleteIntegrationConnectionUseCase {
  constructor(
    private readonly repository: IIntegrationConnectionRepository,
    private readonly vault: ISecretVault,
  ) {}

  public async execute(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw DomainException.new({
        code: Code.INTEGRATION_NOT_FOUND_ERROR,
        overrideMessage: `Integration with id '${id}' not found`,
        data: { integrationId: id },
      });
    }

    const deleted = await this.repository.delete(id);

    // Best-effort vault cleanup. Non-fatal on failure — the row is already
    // gone, so the worst case is an orphan secret in an append-only vault.
    if (deleted && existing.secretRef && this.vault.forget) {
      try {
        await this.vault.forget(existing.secretRef);
      } catch {
        // Vault may not support deletion. See the note in
        // update-integration-credentials.usecase.ts for the boot-time warning.
      }
    }

    return deleted;
  }
}
