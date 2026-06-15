import { Repositories } from '@qlm/domain/repositories';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@qlm/supabase/database';

import { IntegrationConnectionHttpRepository } from './integration-connection.repository';
import { NodeRepository } from './node.repository';
import { HttpUserPreferencesRepository } from './user-preferences.repository';
import { HttpUserTokenRepository } from './user-token.repository';

/**
 * Create repositories with optional client
 * @param client - Optional client to use (e.g., Supabase server client for authenticated requests)
 *                  When provided and STORAGE_ADAPTER is 'supabase', this client will be used
 */
export async function createRepositories<T = unknown>(
  client?: T,
): Promise<Repositories> {
  const [
    {
      UserRepository: SupabaseUserRepository,
      OrganizationRepository: SupabaseOrganizationRepository,
      ProjectRepository: SupabaseProjectRepository,
      DatasourceRepository: SupabaseDatasourceRepository,
      NotebookRepository: SupabaseNotebookRepository,
      ConversationRepository: SupabaseConversationRepository,
      MessageRepository: SupabaseMessageRepository,
      UsageRepository: SupabaseUsageRepository,
      TodoRepository: SupabaseTodoRepository,
      OrderRepository: SupabaseOrderRepository,
      TeamMemberRepository: SupabaseTeamMemberRepository,
      OrderItemRepository: SupabaseOrderItemRepository,
      UserQuotaRepository: SupabaseUserQuotaRepository,
      VolumePricingTierRepository: SupabaseVolumePricingTierRepository,
    },
  ] = await Promise.all([import('@qlm/repository-supabase')]);

  // Use provided client if available, otherwise fall back to browser client
  // Type assertion needed due to SSR client type differences at compile time
  // The types are compatible at runtime
  type SupabaseClientType = SupabaseClient<Database>;
  let supabaseClient: SupabaseClientType;
  if (client) {
    supabaseClient = client as unknown as SupabaseClientType;
  } else {
    // Use browser client for both server and browser contexts
    // Browser client works fine for server-side operations
    const { getSupabaseBrowserClient } =
      await import('@qlm/supabase/browser-client');
    supabaseClient =
      getSupabaseBrowserClient() as unknown as SupabaseClientType;
  }

  return {
    user: new SupabaseUserRepository(supabaseClient),
    organization: new SupabaseOrganizationRepository(supabaseClient),
    project: new SupabaseProjectRepository(supabaseClient),
    datasource: new SupabaseDatasourceRepository(supabaseClient),
    // Integrations go through the HTTP adapter so secrets never flow
    // through the browser Supabase client. Phase 1 is HTTP-only for both
    // reads and writes — see docs/specs/integrations.md §13 open Q6.
    integrationConnection: new IntegrationConnectionHttpRepository(),
    // Nodes are HTTP-only (no Supabase-backed adapter yet). Mocked via
    // MSW in dev; real backend drops in behind the same contract.
    node: new NodeRepository(),
    notebook: new SupabaseNotebookRepository(supabaseClient),
    conversation: new SupabaseConversationRepository(supabaseClient),
    message: new SupabaseMessageRepository(supabaseClient),
    usage: new SupabaseUsageRepository(supabaseClient),
    todo: new SupabaseTodoRepository(supabaseClient),
    order: new SupabaseOrderRepository(supabaseClient),
    teamMember: new SupabaseTeamMemberRepository(supabaseClient),
    orderItem: new SupabaseOrderItemRepository(supabaseClient),
    userQuota: new SupabaseUserQuotaRepository(supabaseClient),
    volumePricingTier: new SupabaseVolumePricingTierRepository(supabaseClient),
    // User-tokens go through HTTP only — never directly to Supabase from the
    // browser (the server is the sole owner of JWT-issuance).
    userToken: new HttpUserTokenRepository(),
    // User-preferences go through HTTP only — same rationale as user-tokens:
    // the server is the sole source of the caller's identity.
    userPreferences: new HttpUserPreferencesRepository(),
    // `jwtSigner` is server-only: signing lives behind the token-issuance API.
    // Casting here keeps the browser bundle clear of `jsonwebtoken`, which
    // relies on Node's `util.inherits` and crashes in Vite's dep-pre-bundler.
  } as unknown as Repositories;
}
