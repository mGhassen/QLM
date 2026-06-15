import type { QueryClient } from '@tanstack/react-query';

import type {
  IOrganizationRepository,
  IProjectRepository,
} from '@qlm/domain/repositories';
import {
  CreateOrganizationService,
  DeleteOrganizationService,
  GetOrganizationBillingService,
  GetOrganizationBySlugService,
  GetOrganizationsService,
  UpdateOrganizationService,
} from '@qlm/domain/services';
import type {
  CreateOrganizationInput,
  OrganizationBillingData,
  OrganizationOutput,
  UpdateOrganizationInput,
} from '@qlm/domain/usecases';

/**
 * Narrow structural dependency for `switchTo`. Avoids importing
 * `UserPreferencesResource` here so the two resources stay independently
 * composable and the dependency graph stays acyclic.
 */
export type LastProjectResolver = {
  getLastProject(organizationId: string): Promise<string | null>;
};

export function createOrganizationsResource(
  repository: IOrganizationRepository,
  queryClient: QueryClient,
  projectRepository: IProjectRepository,
  lastProjectResolver: LastProjectResolver,
) {
  const keys = {
    all: ['organizations'] as const,
    detail: (slug: string) => ['organization', slug] as const,
    billing: (organizationId: string) =>
      ['organization', 'billing', organizationId] as const,
  };

  return {
    keys,

    async list(): Promise<OrganizationOutput[]> {
      return new GetOrganizationsService(repository).execute();
    },

    async getBySlug(slug: string): Promise<OrganizationOutput> {
      return new GetOrganizationBySlugService(repository).execute(slug);
    },

    async create(input: CreateOrganizationInput): Promise<OrganizationOutput> {
      return new CreateOrganizationService(repository).execute(input);
    },

    async update(input: UpdateOrganizationInput): Promise<OrganizationOutput> {
      return new UpdateOrganizationService(repository).execute(input);
    },

    async delete(id: string): Promise<boolean> {
      return new DeleteOrganizationService(repository).execute(id);
    },

    async getBilling(organizationId: string): Promise<OrganizationBillingData> {
      return new GetOrganizationBillingService(repository).execute(
        organizationId,
      );
    },

    /**
     * Resolve the project the user should land on when switching to `orgId`.
     *
     * Order of preference:
     *   1. `user_preferences.last_project_by_org[orgId]` if still present.
     *   2. The org's first project (most recently created).
     *
     * Returns `{ slug }` so the caller can navigate — `shell-runtime` stays
     * router-agnostic and story 008 wires the actual `router.navigate`.
     * Throws when the org has no projects at all; the caller decides how to
     * surface that (e.g. a "create your first project" prompt).
     */
    async switchTo(orgId: string): Promise<{ slug: string }> {
      const lastProjectId = await lastProjectResolver.getLastProject(orgId);
      if (lastProjectId) {
        const project = await projectRepository.findById(lastProjectId);
        if (project) return { slug: project.slug };
      }

      const projects = await projectRepository.findAllByOrganizationId(orgId);
      const fallback = projects[0];
      if (!fallback) {
        throw new Error(`Organization ${orgId} has no projects to switch to.`);
      }
      return { slug: fallback.slug };
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      detail: (slug: string) =>
        queryClient.invalidateQueries({ queryKey: keys.detail(slug) }),
      billing: (organizationId: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.billing(organizationId),
        }),
    },
  };
}

export type OrganizationsResource = ReturnType<
  typeof createOrganizationsResource
>;
