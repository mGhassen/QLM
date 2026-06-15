import { redirect } from '@tanstack/react-router';

import { JwtPayload, SupabaseClient } from '@supabase/supabase-js';

import { addDays, formatISO } from 'date-fns';
import { z } from 'zod';

import { getLogger } from '@guepard/shared/logger';
import { Database } from '@guepard/supabase/database';
import { requireUser } from '@guepard/supabase/require-user';

import {
  DeleteInvitationSchema,
  InvitationsSchema,
  InviteMembersSchema,
} from '../../schema';
import type { UpdateInvitationSchema } from '../../schema';
import { createInvitationContextBuilder } from '../policies/invitation-context-builder';
import { createInvitationsPolicyEvaluator } from '../policies/invitation-policies';
import { createAccountInvitationsDispatchService } from './account-invitations-dispatcher.service';

export function createAccountInvitationsService(
  client: SupabaseClient<Database>,
) {
  return new AccountInvitationsService(client);
}

/**
 * @name AccountInvitationsService
 * @description Service for managing account invitations.
 */
class AccountInvitationsService {
  private readonly namespace = 'invitations';

  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * @name deleteInvitation
   * @description Removes an invitation from the database.
   * @param params
   */
  async deleteInvitation(params: z.infer<typeof DeleteInvitationSchema>) {
    const logger = await getLogger();

    const ctx = {
      name: this.namespace,
      ...params,
    };

    logger.info(ctx, 'Removing invitation...');

    const { error } = await this.client.from('invitations').delete().match({
      id: params.payload.invitationId,
    });

    if (error) {
      logger.error(ctx, `Failed to remove invitation`);

      return {
        success: false,
      };
    }

    logger.info(ctx, 'Invitation successfully removed');

    return {
      success: true,
    };
  }

  /**
   * @name updateInvitation
   * @param params
   * @description Updates an invitation in the database.
   */
  async updateInvitation({ payload }: z.infer<typeof UpdateInvitationSchema>) {
    const logger = await getLogger();

    const ctx = {
      name: this.namespace,
      ...payload,
    };

    logger.info(ctx, 'Updating invitation...');

    const { error } = await this.client
      .from('invitations')
      .update({
        role: payload.role,
      })
      .match({
        id: payload.invitationId,
      });

    if (error) {
      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to update invitation',
      );

      return {
        success: false,
      };
    }

    logger.info(ctx, 'Invitation successfully updated');

    return {
      success: true,
    };
  }

  /**
   * @name sendInvitations
   * @description Sends invitations to join a team.
   * @param accountSlug
   * @param invitations
   */
  async sendInvitations({
    organizationSlug,
    invitations,
  }: {
    invitations: z.infer<typeof InviteMembersSchema>['payload']['invitations'];
    organizationSlug: string;
  }) {
    const logger = await getLogger();

    const ctx = {
      organizationSlug,
      name: this.namespace,
    };

    const user = await requireUser(this.client);

    if (user.error) {
      logger.error(ctx, 'User not found');

      return redirect({ href: user.redirectTo });
    }

    // Evaluate invitation policies
    const policiesResult = await this.evaluateInvitationsPolicies(
      { invitations, organizationSlug, csrfToken: '' },
      user.data,
    );

    // If the invitations are not allowed, throw an error
    if (!policiesResult.allowed) {
      logger.info(
        { reasons: policiesResult?.reasons, userId: user.data.id },
        'Invitations blocked by policies',
      );

      return {
        success: false,
        reasons: policiesResult?.reasons,
      };
    }

    logger.info(ctx, 'Storing invitations...');

    const accountResponse = await this.client
      .from('organizations')
      .select('id, name')
      .eq('slug', organizationSlug)
      .single();

    if (!accountResponse.data) {
      logger.error(
        ctx,
        'Account not found in database. Cannot send invitations.',
      );

      return {
        success: false,
      };
    }

    const organizationId = accountResponse.data.id;
    const existingPending = await this.getExistingPendingInvitationEmails(
      organizationId,
      invitations.map((i) => i.email.trim().toLowerCase()),
    );
    if (existingPending.length > 0) {
      const first = existingPending[0]!;
      const displayEmail =
        invitations.find(
          (i) => i.email.trim().toLowerCase() === first.toLowerCase(),
        )?.email ?? first;
      return {
        success: false,
        reasons: [
          `An invitation for ${displayEmail} already exists for this organization.`,
        ],
      };
    }

    const allowedRoles = await this.getAllowedRoleNames();
    const invalidRoleInvites = invitations.filter(
      (inv) => !allowedRoles.includes(inv.role),
    );
    if (invalidRoleInvites.length > 0) {
      const first = invalidRoleInvites[0]!;
      return {
        success: false,
        reasons: [
          `Invalid role "${first.role}" for ${first.email}. Choose a valid role.`,
        ],
      };
    }

    try {
      await Promise.all(
        invitations.map((invitation) =>
          this.validateInvitation(invitation, organizationSlug),
        ),
      );
    } catch (error) {
      logger.error(
        {
          ...ctx,
          error: (error as Error).message,
        },
        'Error validating invitations',
      );

      return {
        success: false,
        reasons: [(error as Error).message],
      };
    }

    const response = await this.client.rpc('add_invitations_to_organization', {
      invitations,
      org_slug: organizationSlug,
    });

    if (response.error) {
      logger.error(
        {
          ...ctx,
          error: response.error,
        },
        `Failed to add invitations to organization ${organizationSlug}`,
      );

      const message = this.isDuplicateInvitationError(response.error)
        ? 'An invitation for one of these emails already exists for this organization.'
        : response.error.message;

      return {
        success: false,
        reasons: [message],
      };
    }

    const responseInvitations = Array.isArray(response.data)
      ? response.data
      : [response.data];

    logger.info(
      {
        ...ctx,
        count: responseInvitations.length,
      },
      'Invitations added to account',
    );

    const dispatch = await this.dispatchInvitationEmails(
      ctx,
      responseInvitations,
    );

    if (dispatch.failed > 0) {
      const message =
        dispatch.sent > 0
          ? `Invitation(s) created but we could not send ${dispatch.failed} email(s). ${dispatch.firstError ?? 'Check your email configuration (e.g. Resend API key and domain).'}`
          : `Invitation(s) created but we could not send the email(s). ${dispatch.firstError ?? 'Check your email configuration (e.g. Resend API key and domain).'}`;
      return {
        success: false,
        reasons: [message],
      };
    }

    return {
      success: true,
    };
  }

  /**
   * @name acceptInvitationToTeam
   * @description Accepts an invitation to join a team.
   */
  async acceptInvitationToTeam(
    adminClient: SupabaseClient<Database>,
    params: {
      userId: string;
      inviteToken: string;
      userEmail: string;
    },
  ) {
    const logger = await getLogger();

    const ctx = {
      name: this.namespace,
      ...params,
    };

    logger.info(ctx, 'Accepting invitation to team');

    const invitation = await adminClient
      .from('invitations')
      .select('email, organization_id')
      .eq('invite_token', params.inviteToken)
      .single();

    if (invitation.data?.email !== params.userEmail) {
      logger.error({
        ...ctx,
        error: 'Invitation email does not match user email',
      });

      throw new Error('Invitation email does not match user email');
    }

    const { error, data } = await adminClient.rpc('accept_invitation', {
      token: params.inviteToken,
      user_id: params.userId,
    });

    if (error) {
      const isUniqueViolation =
        error.code === '23505' ||
        (typeof error.message === 'string' &&
          error.message.includes('duplicate key'));

      if (isUniqueViolation && invitation.data?.organization_id) {
        logger.info(ctx, 'User is already a member of the organization');
        return {
          alreadyMember: true as const,
          organizationId: invitation.data.organization_id,
        };
      }

      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to accept invitation to team',
      );

      throw error;
    }

    logger.info(ctx, 'Successfully accepted invitation to team');

    return data;
  }

  /**
   * @name renewInvitation
   * @description Renews an invitation to join a team by extending the expiration date by 7 days.
   * @param invitationId
   */
  async renewInvitation(invitationId: number) {
    const logger = await getLogger();

    const ctx = {
      invitationId,
      name: this.namespace,
    };

    logger.info(ctx, 'Renewing invitation...');

    const sevenDaysFromNow = formatISO(addDays(new Date(), 7));

    const { error } = await this.client
      .from('invitations')
      .update({
        expires_at: sevenDaysFromNow,
      })
      .match({
        id: invitationId,
      });

    if (error) {
      logger.error(
        {
          ...ctx,
          error,
        },
        'Failed to renew invitation',
      );

      return {
        success: false,
      };
    }

    logger.info(ctx, 'Invitation successfully renewed');

    return {
      success: true,
    };
  }

  private async getAllowedRoleNames(): Promise<string[]> {
    const { data } = await this.client
      .from('roles')
      .select('name')
      .order('hierarchy_level', { ascending: true });
    return (data ?? []).map((r) => r.name);
  }

  private async getExistingPendingInvitationEmails(
    organizationId: string,
    emailsLower: string[],
  ): Promise<string[]> {
    if (emailsLower.length === 0) return [];
    const { data } = await this.client
      .from('invitations')
      .select('email')
      .eq('organization_id', organizationId);
    const existingLower = new Set(
      (data ?? []).map((r) => (r.email ?? '').toLowerCase()),
    );
    return emailsLower.filter((e) => existingLower.has(e));
  }

  private isDuplicateInvitationError(error: {
    message?: string;
    code?: string;
  }): boolean {
    return (
      (error.message ?? '').includes('invitations_email_organization_id_key') ||
      (error.message ?? '').toLowerCase().includes('duplicate key')
    );
  }

  async validateInvitation(
    invitation: z.infer<typeof InvitationsSchema>['invitations'][number],
    organizationSlug: string,
  ) {
    const { data: members, error } = await this.client.rpc(
      'get_organization_members',
      {
        org_slug: organizationSlug,
      },
    );

    if (error) {
      throw error;
    }

    const inviteEmailLower = invitation.email.trim().toLowerCase();
    const isUserAlreadyMember = (members ?? []).some(
      (member: { email?: string }) =>
        (member.email ?? '').toLowerCase() === inviteEmailLower,
    );

    if (isUserAlreadyMember) {
      throw new Error(
        `${invitation.email} is already a member of this organization`,
      );
    }
  }

  /**
   * @name evaluateInvitationsPolicies
   * @description Evaluates invitation policies with performance optimization.
   * @param params - The invitations to evaluate (emails and roles).
   */
  async evaluateInvitationsPolicies(
    params: z.infer<typeof InviteMembersSchema>['payload'],
    user: JwtPayload,
  ) {
    const evaluator = createInvitationsPolicyEvaluator();
    const hasPolicies = await evaluator.hasPoliciesForStage('submission');

    // No policies to evaluate, skip
    if (!hasPolicies) {
      return {
        allowed: true,
        reasons: [],
      };
    }

    const builder = createInvitationContextBuilder(this.client);
    const context = await builder.buildContext(params, user);

    return evaluator.canInvite(context, 'submission');
  }

  /**
   * @name dispatchInvitationEmails
   * @description Dispatches invitation emails to the invited users.
   * @returns Object with sent count, failed count, and first error message if any failed.
   */
  private async dispatchInvitationEmails(
    ctx: { organizationSlug: string; name: string },
    invitations: Database['public']['Tables']['invitations']['Row'][],
  ): Promise<{ sent: number; failed: number; firstError?: string }> {
    if (!invitations.length) {
      return { sent: 0, failed: 0 };
    }

    const logger = await getLogger();
    const service = createAccountInvitationsDispatchService(this.client);

    const results = await Promise.allSettled(
      invitations.map(async (invitation) => {
        const link = service.getAcceptInvitationLink(invitation.invite_token);
        const data = await service.sendInvitationEmail({
          invitation,
          link,
        });
        return { id: invitation.id, data };
      }),
    );

    let firstError: string | undefined;
    const succeeded = results.filter((result) => {
      if (result.status !== 'fulfilled' || !result.value.data.success) {
        const err =
          result.status === 'rejected'
            ? (result.reason as Error)?.message
            : undefined;
        if (err && !firstError) firstError = err;
        logger.error(
          {
            ...ctx,
            invitationId:
              result.status === 'fulfilled' ? result.value.id : result.reason,
          },
          'Failed to send invitation email',
        );
        return false;
      }
      return true;
    });

    if (succeeded.length) {
      logger.info(
        { ...ctx, count: succeeded.length },
        'Invitation emails successfully sent!',
      );
    }

    return {
      sent: succeeded.length,
      failed: results.length - succeeded.length,
      firstError,
    };
  }
}
