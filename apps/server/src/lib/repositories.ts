import type { Context } from 'hono';
import type { Repositories } from '@guepard/domain/repositories';
import {
  DatabaseRepository,
  PerformanceProfileRepository,
  UserRepository,
  ConversationRepository,
  DatasourceRepository,
  IntegrationConnectionRepository,
  NodeRepository,
  NotebookRepository,
  PoolRepository,
  OrganizationRepository,
  ProjectRepository,
  MessageRepository,
  UsageRepository,
  TodoRepository,
  OrderRepository,
  TeamMemberRepository,
  OrderItemRepository,
  UserQuotaRepository,
  VolumePricingTierRepository,
  SupabaseUserTokenRepository,
  SupabaseUserPreferencesRepository,
  SupabasePersonalAccountRepository,
  SupabaseMfaRepository,
  PredictionSchemaSnapshotRepository,
  PredictionAgentConversationRepository,
  PredictionAgentMessageRepository,
} from '@guepard/repository-supabase';
import { JwtSigner } from '@guepard/repository-supabase/jwt-signer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAccessTokenFromRequest, getSupabaseClient } from './supabase';

export function createRepositories(client: SupabaseClient): Repositories {
  return {
    database: new DatabaseRepository(client),
    performanceProfile: new PerformanceProfileRepository(client),
    user: new UserRepository(client),
    organization: new OrganizationRepository(client),
    project: new ProjectRepository(client),
    datasource: new DatasourceRepository(client),
    integrationConnection: new IntegrationConnectionRepository(client),
    notebook: new NotebookRepository(client),
    node: new NodeRepository(client),
    pool: new PoolRepository(client),
    conversation: new ConversationRepository(client),
    message: new MessageRepository(client),
    usage: new UsageRepository(client),
    todo: new TodoRepository(client),
    order: new OrderRepository(client),
    teamMember: new TeamMemberRepository(client),
    orderItem: new OrderItemRepository(client),
    userQuota: new UserQuotaRepository(client),
    volumePricingTier: new VolumePricingTierRepository(client),
    userToken: new SupabaseUserTokenRepository(client),
    userPreferences: new SupabaseUserPreferencesRepository(client),
    personalAccount: new SupabasePersonalAccountRepository(client),
    mfa: new SupabaseMfaRepository(client),
    jwtSigner: new JwtSigner(),
    predictionSchemaSnapshot: new PredictionSchemaSnapshotRepository(client),
    predictionAgentConversation: new PredictionAgentConversationRepository(
      client,
    ),
    predictionAgentMessage: new PredictionAgentMessageRepository(client),
  };
}

/**
 * `JWT_SECRET` — used by `CreateUserTokenService` to sign user-token JWTs.
 * Read once at first access, validated non-empty, and cached so repeated
 * calls never revisit `process.env`. The token-issuing routes (story 006)
 * pass this into `new CreateUserTokenService(repo, signer, secret)`.
 */
let cachedJwtSecret: string | undefined;
export function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;
  const value = process.env.JWT_SECRET;
  if (!value || value.trim().length === 0) {
    throw new Error(
      'JWT_SECRET environment variable must be set to issue user tokens.',
    );
  }
  cachedJwtSecret = value;
  return cachedJwtSecret;
}

export async function getRepositories(c: Context): Promise<Repositories> {
  return getRepositoriesFromRequest(c.req.raw);
}

export async function getRepositoriesFromRequest(
  request: Request,
): Promise<Repositories> {
  const token = getAccessTokenFromRequest(request);
  const client = getSupabaseClient(token);
  return Promise.resolve(createRepositories(client));
}
