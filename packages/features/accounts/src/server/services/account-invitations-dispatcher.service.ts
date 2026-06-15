import { SupabaseClient } from '@supabase/supabase-js';

import { z } from 'zod';

import { getLogger } from '@guepard/shared/logger';
import { Database, Tables } from '@guepard/supabase/database';

type Invitation = Tables<'invitations'>;

const invitePath = '/join';
const authTokenCallbackPath = '/auth/confirm';

const siteURL = process.env.VITE_SITE_URL;
const productName = process.env.VITE_PRODUCT_NAME ?? '';
const emailSender = process.env.EMAIL_SENDER;

const env = z
  .object({
    invitePath: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'The property invitePath is required'
            : 'Expected string',
      })
      .min(1),
    siteURL: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'VITE_SITE_URL is required'
            : 'Expected string',
      })
      .min(1),
    productName: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'VITE_PRODUCT_NAME is required'
            : 'Expected string',
      })
      .min(1),
    emailSender: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'EMAIL_SENDER is required'
            : 'Expected string',
      })
      .min(1),
  })
  .parse({
    invitePath,
    siteURL,
    productName,
    emailSender,
  });

export function createAccountInvitationsDispatchService(
  client: SupabaseClient<Database>,
) {
  return new AccountInvitationsDispatchService(client);
}

class AccountInvitationsDispatchService {
  private namespace = 'accounts.invitations.webhook';

  constructor(private readonly adminClient: SupabaseClient<Database>) {}

  /**
   * @name sendInvitationEmail
   * @description Sends an invitation email to the invited user
   * @param invitation - The invitation to send
   * @returns
   */
  async sendInvitationEmail({
    invitation,
    link,
  }: {
    invitation: Invitation;
    link: string;
  }) {
    const logger = await getLogger();

    logger.info(
      {
        invitationId: invitation.id,
        name: this.namespace,
      },
      'Handling invitation email dispatch...',
    );

    // retrieve the inviter details
    const inviter = await this.getInviterDetails(invitation);

    if (inviter.error) {
      logger.error(
        {
          error: inviter.error,
          name: this.namespace,
        },
        'Failed to fetch inviter details',
      );

      throw inviter.error;
    }

    // retrieve the organization details
    const organization = await this.getOrganizationDetails(
      invitation.organization_id,
    );

    if (organization.error) {
      logger.error(
        {
          error: organization.error,
          name: this.namespace,
        },
        'Failed to fetch organization details',
      );

      throw organization.error;
    }

    const ctx = {
      invitationId: invitation.id,
      name: this.namespace,
    };

    try {
      logger.info(ctx, 'Invite retrieved. Sending invitation email...');

      // send the invitation email
      await this.sendEmail({
        invitation,
        link,
        inviter: inviter.data,
        organization: organization.data,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.warn({ error, ...ctx }, 'Failed to invite user to organization');

      return {
        error,
        success: false,
      };
    }
  }

  /**
   * @name getInvitationLink
   * @description Generates an invitation link for the given token and email
   * @param token - The token to use for the invitation
   */
  getInvitationLink(token: string) {
    const siteUrl = env.siteURL;
    const url = new URL(env.invitePath, siteUrl);

    url.searchParams.set('invite_token', token);

    return url.href;
  }

  /**
   * @name sendEmail
   * @description Sends an invitation email to the invited user
   * @param invitation - The invitation to send
   * @param link - The link to the invitation
   * @param inviter - The inviter details
   * @param organization - The organization details
   * @returns
   */
  private async sendEmail({
    invitation,
    link,
    inviter,
    organization,
  }: {
    invitation: Invitation;
    link: string;
    inviter: { name: string; email: string | null };
    organization: { name: string };
  }) {
    const logger = await getLogger();

    const ctx = {
      invitationId: invitation.id,
      name: this.namespace,
    };

    const { renderInviteEmail } = await import('@guepard/email-templates');
    const { getMailer } = await import('@guepard/mailers');

    const mailer = await getMailer();

    const { html, subject } = await renderInviteEmail({
      link,
      invitedUserEmail: invitation.email,
      inviter: inviter.name ?? inviter.email ?? '',
      productName: env.productName,
      teamName: organization.name,
    });

    return mailer
      .sendEmail({
        from: env.emailSender,
        to: invitation.email,
        subject,
        html,
      })
      .then(() => {
        logger.info(ctx, 'Invitation email successfully sent!');
      })
      .catch((error) => {
        console.error(error);

        logger.error({ error, ...ctx }, 'Failed to send invitation email');
      });
  }

  /**
   * @name getAuthCallbackUrl
   * @description Generates an auth token callback url. This redirects the user to a page where the user can sign in with a token.
   * @param nextLink - The next link to redirect the user to

   * @returns
   */
  getAuthCallbackUrl(nextLink: string) {
    const url = new URL(authTokenCallbackPath, env.siteURL);

    url.searchParams.set('next', nextLink);

    return url;
  }

  /**
   * @name getAcceptInvitationLink
   * @description Generates an internal link that validates invitation and generates auth token on-demand.
   * This solves the 24-hour Supabase auth token expiry issue by generating fresh tokens when clicked.
   * @param token - The invitation token to use
   */
  getAcceptInvitationLink(token: string) {
    const siteUrl = env.siteURL;
    const url = new URL('/join/accept', siteUrl);

    url.searchParams.set('invite_token', token);

    return url.href;
  }

  /**
   * @name getInviterDetails
   * @description Fetches the inviter details for the given invitation
   * @param invitation
   * @returns
   */
  private getInviterDetails(invitation: Invitation) {
    return this.adminClient
      .from('accounts')
      .select('email, name')
      .eq('id', invitation.invited_by)
      .single();
  }

  /**
   * @name getOrganizationDetails
   * @description Fetches the organization details for the given account ID
   * @param accountId
   * @returns
   */
  private getOrganizationDetails(accountId: string) {
    return this.adminClient
      .from('organizations')
      .select('name')
      .eq('id', accountId)
      .single();
  }
}
