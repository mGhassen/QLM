import type { QueryClient } from '@tanstack/react-query';

import type { TeamMember } from '@guepard/domain/entities';
import type { ITeamMemberRepository } from '@guepard/domain/repositories';
import {
  GetTeamMembersService,
  InviteTeamMemberService,
  RemoveTeamMemberService,
  UpdateTeamMemberRoleService,
} from '@guepard/domain/services';
import type {
  InviteTeamMemberInput,
  InviteTeamMemberOutput,
  RemoveTeamMemberInput,
  UpdateTeamMemberRoleInput,
} from '@guepard/domain/usecases';

export function createTeamMembersResource(
  repository: ITeamMemberRepository,
  queryClient: QueryClient,
) {
  const keys = {
    all: ['team-members'] as const,
    listByOrgSlug: (orgSlug: string) =>
      ['team-members', 'by-org-slug', orgSlug] as const,
  };

  return {
    keys,

    async list(params: { organizationSlug: string }): Promise<TeamMember[]> {
      return new GetTeamMembersService(repository).execute({
        organizationSlug: params.organizationSlug,
      });
    },

    async invite(input: InviteTeamMemberInput): Promise<InviteTeamMemberOutput> {
      return new InviteTeamMemberService(repository).execute(input);
    },

    async updateRole(input: UpdateTeamMemberRoleInput): Promise<TeamMember> {
      return new UpdateTeamMemberRoleService(repository).execute(input);
    },

    async remove(input: RemoveTeamMemberInput): Promise<void> {
      return new RemoveTeamMemberService(repository).execute(input);
    },

    invalidate: {
      all: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      listByOrgSlug: (orgSlug: string) =>
        queryClient.invalidateQueries({
          queryKey: keys.listByOrgSlug(orgSlug),
        }),
    },
  };
}

export type TeamMembersResource = ReturnType<typeof createTeamMembersResource>;
