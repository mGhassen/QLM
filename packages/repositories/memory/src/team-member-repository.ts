import type {
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
  Role,
} from '@guepard/domain/usecases';
import { ITeamMemberRepository } from '@guepard/domain/repositories';
import type { TeamMember } from '@guepard/domain/entities';

export class TeamMemberRepository extends ITeamMemberRepository {
  private teamMembers = new Map<string, TeamMember>();
  private invitations = new Map<string, InviteTeamMemberOutput>();

  async findAll(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  async findById(_id: string): Promise<TeamMember | null> {
    throw new Error('Method not implemented.');
  }

  async findBySlug(_slug: string): Promise<TeamMember | null> {
    throw new Error('Method not implemented.');
  }

  async create(_entity: TeamMember): Promise<TeamMember> {
    throw new Error('Method not implemented. Use inviteTeamMember instead.');
  }

  async update(_entity: TeamMember): Promise<TeamMember> {
    throw new Error(
      'Method not implemented. Use updateTeamMemberRole instead.',
    );
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error(
      'Method not implemented. Use removeTeamMember or leaveTeam instead.',
    );
  }

  async getTeamMembers(
    _input: GetTeamMembersInput,
  ): Promise<GetTeamMembersOutput> {
    // Memory repository doesn't support team members (server-side only)
    return [];
  }

  async inviteTeamMember(
    _input: InviteTeamMemberInput,
  ): Promise<InviteTeamMemberOutput> {
    // Memory repository doesn't support team members (server-side only)
    throw new Error(
      'Team member invitations cannot be created in memory repository (server-side only)',
    );
  }

  async updateTeamMemberRole(
    _input: UpdateTeamMemberRoleInput,
  ): Promise<UpdateTeamMemberRoleOutput> {
    // Memory repository doesn't support team members (server-side only)
    throw new Error(
      'Team member roles cannot be updated in memory repository (server-side only)',
    );
  }

  async removeTeamMember(
    _input: RemoveTeamMemberInput,
  ): Promise<RemoveTeamMemberOutput> {
    // Memory repository doesn't support team members (server-side only)
    throw new Error(
      'Team members cannot be removed in memory repository (server-side only)',
    );
  }

  async leaveTeam(_input: LeaveTeamInput): Promise<LeaveTeamOutput> {
    // Memory repository doesn't support team members (server-side only)
    throw new Error(
      'Cannot leave team in memory repository (server-side only)',
    );
  }

  async getRoles(): Promise<GetRolesOutput> {
    // Return default roles for CLI
    return [
      { name: 'owner', hierarchyLevel: 0 },
      { name: 'admin', hierarchyLevel: 1 },
      { name: 'member', hierarchyLevel: 2 },
    ] as Role[];
  }
}
