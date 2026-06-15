import { Code } from '@guepard/domain/common';
import type { TeamMember } from '@guepard/domain/entities';
import { DomainException } from '@guepard/domain/exceptions';
import { ITeamMemberRepository } from '@guepard/domain/repositories';
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
import type { SupabaseClientType } from './types';

export class TeamMemberRepository extends ITeamMemberRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private deserializeTeamMember(row: Record<string, unknown>): TeamMember {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      accountId: row.organization_id as string,
      role: row.role as string,
      roleHierarchyLevel: Number(row.role_hierarchy_level),
      primaryOwnerUserId:
        (row.organization_user_id as string) ?? (row.user_id as string),
      name: (row.name as string) || null,
      email: row.email as string,
      pictureUrl: (row.picture_url as string) || null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  async findAll(): Promise<TeamMember[]> {
    throw new Error('Method not implemented. Use getTeamMembers instead.');
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
    input: GetTeamMembersInput,
  ): Promise<GetTeamMembersOutput> {
    const { data, error } = await this.client.rpc('get_organization_members', {
      org_slug: input.organizationSlug,
    });

    if (error) {
      throw new Error(`Failed to fetch team members: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((row) => this.deserializeTeamMember(row));
  }

  async inviteTeamMember(
    input: InviteTeamMemberInput,
  ): Promise<InviteTeamMemberOutput> {
    // Get organization_id from organization slug
    const { data: org, error: orgError } = await this.client
      .from('organizations')
      .select('id')
      .eq('slug', input.organizationSlug)
      .single();

    if (orgError || !org) {
      throw new Error(
        `Failed to find organization: ${orgError?.message || 'Not found'}`,
      );
    }

    const { data, error } = await this.client.rpc('create_invitation', {
      organization_id: org.id,
      email: input.email,
      role: input.role,
    });

    if (error) {
      throw new Error(`Failed to invite team member: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create invitation');
    }

    return {
      id: data.id,
      email: data.email,
      accountId: (data as unknown as { organization_id: string })
        .organization_id,
      role: data.role,
      inviteToken: data.invite_token,
      expiresAt: new Date(data.expires_at),
    };
  }

  async updateTeamMemberRole(
    input: UpdateTeamMemberRoleInput,
  ): Promise<UpdateTeamMemberRoleOutput> {
    const roles = await this.getRoles();
    const validRoleNames = roles.map((r) => r.name);
    if (!validRoleNames.includes(input.role)) {
      throw DomainException.new({
        code: Code.BAD_REQUEST_ERROR,
        overrideMessage:
          'Invalid role. Must be one of: ' + validRoleNames.join(', '),
        data: { errorCode: 'INVALID_MEMBER_ROLE' as const },
      });
    }

    const { data: org, error: orgError } = await this.client
      .from('organizations')
      .select('id')
      .eq('slug', input.organizationSlug)
      .single();

    if (orgError || !org) {
      throw new Error(
        `Failed to find organization: ${orgError?.message || 'Not found'}`,
      );
    }

    const { error: updateError } = await this.client
      .from('organization_memberships')
      .update({ account_role: input.role })
      .eq('organization_id', org.id)
      .eq('user_id', input.userId);

    if (updateError) {
      throw new Error(
        `Failed to update team member role: ${updateError.message}`,
      );
    }

    // Fetch updated member
    const members = await this.getTeamMembers({
      organizationSlug: input.organizationSlug,
    });

    const updatedMember = members.find((m) => m.userId === input.userId);

    if (!updatedMember) {
      throw new Error('Failed to fetch updated team member');
    }

    return updatedMember;
  }

  async removeTeamMember(
    input: RemoveTeamMemberInput,
  ): Promise<RemoveTeamMemberOutput> {
    const {
      data: { user: currentUser },
    } = await this.client.auth.getUser();

    if (currentUser && input.userId === currentUser.id) {
      throw DomainException.new({
        code: Code.BAD_REQUEST_ERROR,
        overrideMessage: 'Cannot remove yourself',
        data: { errorCode: 'CANNOT_REMOVE_SELF' as const },
      });
    }

    const { data: org, error: orgError } = await this.client
      .from('organizations')
      .select('id, user_id')
      .eq('slug', input.organizationSlug)
      .single();

    if (orgError || !org) {
      throw new Error(
        `Failed to find organization: ${orgError?.message || 'Not found'}`,
      );
    }

    const primaryOwnerUserId = (org as { user_id?: string }).user_id;
    if (primaryOwnerUserId && input.userId === primaryOwnerUserId) {
      throw DomainException.new({
        code: Code.BAD_REQUEST_ERROR,
        overrideMessage: 'Cannot remove the primary owner',
        data: { errorCode: 'CANNOT_REMOVE_PRIMARY_OWNER' as const },
      });
    }

    const { data: existing } = await this.client
      .from('organization_memberships')
      .select('user_id')
      .eq('organization_id', org.id)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!existing) {
      return;
    }

    const { error } = await this.client
      .from('organization_memberships')
      .delete()
      .eq('organization_id', org.id)
      .eq('user_id', input.userId);

    if (error) {
      throw new Error(`Failed to remove team member: ${error.message}`);
    }
  }

  async leaveTeam(input: LeaveTeamInput): Promise<LeaveTeamOutput> {
    // Get current user
    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to leave team');
    }

    // Get organization_id from organization slug
    const { data: org, error: orgError } = await this.client
      .from('organizations')
      .select('id')
      .eq('slug', input.organizationSlug)
      .single();

    if (orgError || !org) {
      throw new Error(
        `Failed to find organization: ${orgError?.message || 'Not found'}`,
      );
    }

    const { error } = await this.client
      .from('organization_memberships')
      .delete()
      .eq('organization_id', org.id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to leave team: ${error.message}`);
    }
  }

  async getRoles(): Promise<GetRolesOutput> {
    const { data, error } = await this.client
      .from('roles')
      .select('name, hierarchy_level')
      .order('hierarchy_level', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map(
      (row): Role => ({
        name: row.name,
        hierarchyLevel: row.hierarchy_level,
      }),
    );
  }
}
