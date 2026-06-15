import {
  IConversationRepository,
  IOrganizationRepository,
  IProjectRepository,
  IDatasourceRepository,
  IIntegrationConnectionRepository,
  INotebookRepository,
  INodeRepository,
  IPoolRepository,
  IUserRepository,
  IMessageRepository,
  IUsageRepository,
  ITodoRepository,
  ITeamMemberRepository,
  IOrderRepository,
  IOrderItemRepository,
  IUserQuotaRepository,
  IVolumePricingTierRepository,
  IUserTokenRepository,
  IUserPreferencesRepository,
  IAccountRepository,
  IMfaRepository,
  IJwtSigner,
  IDatabaseRepository,
  IPerformanceProfileRepository,
  IPredictionSchemaSnapshotRepository,
  IPredictionAgentConversationRepository,
  IPredictionAgentMessageRepository,
} from './index';

export type Repositories = {
  user: IUserRepository;
  organization: IOrganizationRepository;
  project: IProjectRepository;
  datasource: IDatasourceRepository;
  integrationConnection: IIntegrationConnectionRepository;
  notebook: INotebookRepository;
  node: INodeRepository;
  pool: IPoolRepository;
  conversation: IConversationRepository;
  message: IMessageRepository;
  usage: IUsageRepository;
  todo: ITodoRepository;
  teamMember: ITeamMemberRepository;
  order: IOrderRepository;
  orderItem: IOrderItemRepository;
  userQuota: IUserQuotaRepository;
  volumePricingTier: IVolumePricingTierRepository;
  userToken: IUserTokenRepository;
  userPreferences: IUserPreferencesRepository;
  personalAccount: IAccountRepository;
  mfa: IMfaRepository;
  jwtSigner: IJwtSigner;
  database: IDatabaseRepository;
  performanceProfile: IPerformanceProfileRepository;
  predictionSchemaSnapshot: IPredictionSchemaSnapshotRepository;
  predictionAgentConversation: IPredictionAgentConversationRepository;
  predictionAgentMessage: IPredictionAgentMessageRepository;
};
