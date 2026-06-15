import { TeamMember } from '../../entities/team-member.type';

/**
 * DTOs for the team-member use cases.
 *
 * These mirror the shape returned by the Supabase team-member repository
 * (packages/repositories/supabase/src/team-member.repository.ts).
 */

export type GetTeamMembersInput = {
  organizationSlug: string;
};

export type GetTeamMembersOutput = TeamMember[];

export type InviteTeamMemberInput = {
  organizationSlug: string;
  email: string;
  role: string;
};

export type InviteTeamMemberOutput = {
  id: number | string;
  email: string;
  accountId: string;
  role: string;
  inviteToken: string;
  expiresAt: Date;
};

export type UpdateTeamMemberRoleInput = {
  organizationSlug: string;
  userId: string;
  role: string;
};

export type UpdateTeamMemberRoleOutput = TeamMember;

export type RemoveTeamMemberInput = {
  organizationSlug: string;
  userId: string;
};

export type RemoveTeamMemberOutput = void;

export type LeaveTeamInput = {
  organizationSlug: string;
};

export type LeaveTeamOutput = void;

export type Role = {
  name: string;
  hierarchyLevel: number;
};

export type GetRolesOutput = Role[];

export interface GetTeamMembersUseCase {
  execute(input: GetTeamMembersInput): Promise<GetTeamMembersOutput>;
}

export interface InviteTeamMemberUseCase {
  execute(input: InviteTeamMemberInput): Promise<InviteTeamMemberOutput>;
}

export interface UpdateTeamMemberRoleUseCase {
  execute(
    input: UpdateTeamMemberRoleInput,
  ): Promise<UpdateTeamMemberRoleOutput>;
}

export interface RemoveTeamMemberUseCase {
  execute(input: RemoveTeamMemberInput): Promise<RemoveTeamMemberOutput>;
}

export interface LeaveTeamUseCase {
  execute(input: LeaveTeamInput): Promise<LeaveTeamOutput>;
}

export interface GetRolesUseCase {
  execute(): Promise<GetRolesOutput>;
}
