import { TeamMember } from '../entities';
import { RepositoryPort } from './base-repository.port';
import {
  GetTeamMembersInput,
  GetTeamMembersOutput,
  InviteTeamMemberInput,
  InviteTeamMemberOutput,
  UpdateTeamMemberRoleInput,
  UpdateTeamMemberRoleOutput,
  RemoveTeamMemberInput,
  RemoveTeamMemberOutput,
  LeaveTeamInput,
  LeaveTeamOutput,
  GetRolesOutput,
} from '../usecases/dto/team-member-usecase-dto';

export abstract class ITeamMemberRepository extends RepositoryPort<
  TeamMember,
  string
> {
  /**
   * Get all team members for an organization
   */
  abstract getTeamMembers(
    input: GetTeamMembersInput,
  ): Promise<GetTeamMembersOutput>;

  /**
   * Invite a team member to an organization
   */
  abstract inviteTeamMember(
    input: InviteTeamMemberInput,
  ): Promise<InviteTeamMemberOutput>;

  /**
   * Update a team member's role
   */
  abstract updateTeamMemberRole(
    input: UpdateTeamMemberRoleInput,
  ): Promise<UpdateTeamMemberRoleOutput>;

  /**
   * Remove a team member from an organization
   */
  abstract removeTeamMember(
    input: RemoveTeamMemberInput,
  ): Promise<RemoveTeamMemberOutput>;

  /**
   * Leave the organization (current user)
   */
  abstract leaveTeam(input: LeaveTeamInput): Promise<LeaveTeamOutput>;

  /**
   * Get available roles
   */
  abstract getRoles(): Promise<GetRolesOutput>;
}
