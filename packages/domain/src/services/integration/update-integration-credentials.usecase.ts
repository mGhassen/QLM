import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import {
  IIntegrationConnectionRepository,
  ISecretVault,
} from '../../repositories';
import type { UpdateIntegrationCredentialsUseCase } from '../../usecases/integration/integration.usecase';
import {
  IntegrationConnectionOutput,
  UpdateIntegrationCredentialsInput,
} from '../../usecases';
import { splitCredentialsForStorage } from './credential-payload';

export class UpdateIntegrationCredentialsService implements UpdateIntegrationCredentialsUseCase {
  constructor(
    private readonly repository: IIntegrationConnectionRepository,
    private readonly vault: ISecretVault,
  ) {}

  public async execute(
    input: UpdateIntegrationCredentialsInput,
  ): Promise<IntegrationConnectionOutput> {
    const existing = await this.repository.findById(input.id);
    if (!existing) {
      throw DomainException.new({
        code: Code.INTEGRATION_NOT_FOUND_ERROR,
        overrideMessage: `Integration with id '${input.id}' not found`,
        data: { integrationId: input.id },
      });
    }

    if (existing.provider !== input.credentials.provider) {
      throw DomainException.new({
        code: Code.INTEGRATION_PROVIDER_MISMATCH_ERROR,
        overrideMessage: `Cannot rotate a '${existing.provider}' integration with '${input.credentials.provider}' credentials`,
        data: {
          integrationId: input.id,
          existingProvider: existing.provider,
          incomingProvider: input.credentials.provider,
        },
      });
    }

    const { secretPayload } = splitCredentialsForStorage(input.credentials);

    const newSecretRef = await this.vault.protect(
      JSON.stringify(secretPayload),
      {
        keyName: `integration:${secretPayload.provider}:${existing.projectId}`,
      },
    );

    await this.repository.updateCredentialsRef(
      existing.id,
      newSecretRef,
      input.updatedBy,
    );

    // Best-effort: forget the old handle so the vault doesn't keep it around
    // after the row no longer references it. Non-fatal on failure.
    if (existing.secretRef && this.vault.forget) {
      try {
        await this.vault.forget(existing.secretRef);
      } catch {
        // Vault implementation may not support deletion (append-only). The
        // server bootstrap logs a warning once when forget is missing; here
        // we silently proceed because the row has already been updated.
      }
    }

    const refreshed = await this.repository.findById(existing.id);
    if (!refreshed) {
      // Only reachable if the row vanished between updateCredentialsRef and
      // findById, which would indicate a concurrent delete. Treat as the
      // same "not found" condition the caller must handle.
      throw DomainException.new({
        code: Code.INTEGRATION_NOT_FOUND_ERROR,
        overrideMessage: `Integration with id '${input.id}' disappeared during credential rotation`,
        data: { integrationId: input.id },
      });
    }

    return IntegrationConnectionOutput.new(refreshed);
  }
}
