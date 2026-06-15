import type {
  CreateIntegrationConnectionInput,
  IntegrationConnectionOutput,
  Region,
  TestResult,
  UpdateIntegrationConnectionInput,
  UpdateIntegrationCredentialsInput,
} from '../dto/integration-usecase-dto';
import type { UseCase } from '../usecase';

export type CreateIntegrationConnectionUseCase = UseCase<
  CreateIntegrationConnectionInput,
  IntegrationConnectionOutput
>;

export type UpdateIntegrationConnectionUseCase = UseCase<
  UpdateIntegrationConnectionInput,
  IntegrationConnectionOutput
>;

export type UpdateIntegrationCredentialsUseCase = UseCase<
  UpdateIntegrationCredentialsInput,
  IntegrationConnectionOutput
>;

export type TestIntegrationConnectionUseCase = UseCase<string, TestResult>;

export type ListProviderRegionsUseCase = UseCase<string, Region[]>;

export type DeleteIntegrationConnectionUseCase = UseCase<string, boolean>;
