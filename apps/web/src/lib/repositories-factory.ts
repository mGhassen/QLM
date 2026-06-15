import type { Repositories } from '@guepard/domain/repositories';
import {
  OrderItemRepository as SupabaseOrderItemRepository,
  OrderRepository as SupabaseOrderRepository,
  SupabaseMfaRepository,
  SupabasePersonalAccountRepository,
  TeamMemberRepository as SupabaseTeamMemberRepository,
  TodoRepository as SupabaseTodoRepository,
  UsageRepository as SupabaseUsageRepository,
  UserQuotaRepository as SupabaseUserQuotaRepository,
  UserRepository as SupabaseUserRepository,
  VolumePricingTierRepository as SupabaseVolumePricingTierRepository,
} from '@guepard/repository-supabase';
import { getSupabaseBrowserClient } from '@guepard/supabase/browser-client';

import { ConversationRepository } from './repositories/conversation.repository';
import { DatabaseHttpRepository } from './repositories/database.repository';
import { PerformanceProfileHttpRepository } from './repositories/performance-profile.repository';
import { DatasourceRepository } from './repositories/datasource.repository';
import { IntegrationConnectionHttpRepository } from './repositories/integration-connection.repository';
import { MessageRepository } from './repositories/message.repository';
import { NodeRepository } from './repositories/node.repository';
import { NotebookRepository } from './repositories/notebook.repository';
import { PoolRepository } from './repositories/pool.repository';
import { OrganizationRepository } from './repositories/organization.repository';
import { ProjectRepository } from './repositories/project.repository';
import { HttpUserPreferencesRepository } from './repositories/user-preferences.repository';
import { HttpUserTokenRepository } from './repositories/user-token.repository';
import { PredictionAgentConversationHttpRepository } from './repositories/prediction-agent-conversation.repository';
import { PredictionAgentMessageHttpRepository } from './repositories/prediction-agent-message.repository';
import { PredictionSchemaSnapshotHttpRepository } from './repositories/prediction-schema-snapshot.repository';

export function createRepositories(): Repositories {
  const supabase = getSupabaseBrowserClient();

  return {
    // HTTP-backed repositories (go through the server API)
    database: new DatabaseHttpRepository(),
    performanceProfile: new PerformanceProfileHttpRepository(),
    organization: new OrganizationRepository(),
    project: new ProjectRepository(),
    notebook: new NotebookRepository(),
    node: new NodeRepository(),
    pool: new PoolRepository(),
    datasource: new DatasourceRepository(),
    integrationConnection: new IntegrationConnectionHttpRepository(),
    conversation: new ConversationRepository(),
    message: new MessageRepository(),
    userToken: new HttpUserTokenRepository(),
    userPreferences: new HttpUserPreferencesRepository(),
    predictionSchemaSnapshot: new PredictionSchemaSnapshotHttpRepository(),
    predictionAgentConversation:
      new PredictionAgentConversationHttpRepository(),
    predictionAgentMessage: new PredictionAgentMessageHttpRepository(),

    // Supabase-direct repositories (go straight to Supabase from the browser)
    user: new SupabaseUserRepository(supabase),
    todo: new SupabaseTodoRepository(supabase),
    teamMember: new SupabaseTeamMemberRepository(supabase),
    order: new SupabaseOrderRepository(supabase),
    orderItem: new SupabaseOrderItemRepository(supabase),
    usage: new SupabaseUsageRepository(supabase),
    userQuota: new SupabaseUserQuotaRepository(supabase),
    volumePricingTier: new SupabaseVolumePricingTierRepository(supabase),
    personalAccount: new SupabasePersonalAccountRepository(supabase),
    mfa: new SupabaseMfaRepository(supabase),

    // `jwtSigner` is intentionally absent on the browser — JWT signing is
    // a server-only concern (the server creates the token AND issues the
    // JWT in a single request; the browser only ever receives the signed
    // string back). The `as unknown as Repositories` cast below masks
    // this on purpose.
  } as unknown as Repositories;
}
