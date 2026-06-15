import type { Repositories } from '@guepard/domain/repositories';
import {
  OrderItemRepository as SupabaseOrderItemRepository,
  OrderRepository as SupabaseOrderRepository,
  OrganizationRepository as SupabaseOrganizationRepository,
  ProjectRepository as SupabaseProjectRepository,
  TeamMemberRepository as SupabaseTeamMemberRepository,
} from '@guepard/repository-supabase';
import { getSupabaseServerClient } from '@guepard/supabase/server-client';

/**
 * Server-side repository factory for use inside TanStack Start server route
 * handlers. Uses a Supabase server client (so auth session cookies flow
 * through and RLS respects the caller).
 *
 * Unlike `createRepositories()` in `./repositories-factory.ts`, this one
 * uses the Supabase-backed `OrganizationRepository` instead of the
 * HTTP-based one — because server routes shouldn't call back into
 * themselves.
 */
export function createServerRepositories(request: Request): Repositories {
  const { client: supabase } = getSupabaseServerClient(request);

  return {
    organization: new SupabaseOrganizationRepository(supabase),
    project: new SupabaseProjectRepository(supabase),
    teamMember: new SupabaseTeamMemberRepository(supabase),
    order: new SupabaseOrderRepository(supabase),
    orderItem: new SupabaseOrderItemRepository(supabase),
  } as unknown as Repositories;
}
