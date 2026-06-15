import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@guepard/supabase/database';

export function createAccountsApi(client: SupabaseClient<Database>) {
  return new AccountsApi(client);
}

/**
 * Class representing an API for interacting with user accounts.
 * @constructor
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 */
class AccountsApi {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * @name getAccount
   * @description Get the account data for the given ID.
   * @param id
   */
  async getAccount(id: string) {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * @name getAccountWorkspace
   * @description Get the account workspace data.
   */
  async getAccountWorkspace() {
    const { data, error } = await this.client
      .from('user_account_workspace')
      .select(`*`)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * @name loadUserAccounts
   * Load the user accounts.
   */
  async loadUserAccounts() {
    const { data: accounts, error } = await this.client
      .from('user_accounts')
      .select(`name, slug, picture_url`);

    if (error) {
      throw error;
    }

    return accounts.map(({ name, slug, picture_url }) => {
      return {
        label: name,
        value: slug,
        image: picture_url,
      };
    });
  }
}

export function createOrganizationsApi(client: SupabaseClient<Database>) {
  return new OrganizationsApi(client);
}

/**
 * Class representing an API for interacting with organizations.
 * @constructor
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 */
class OrganizationsApi {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /**
   * @name getOrganization
   * @description Get the organization data for the given slug.
   * @param slug
   */
  async getOrganization(slug: string) {
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * @name getOrganizationById
   * @description Check if the user is already in the organization.
   * @param organizationId
   */
  async getOrganizationById(organizationId: string) {
    const { data, error } = await this.client
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * @name getSubscription
   * @description Get the subscription data for the organization.
   * @param organizationId
   */
  async getSubscription(organizationId: string) {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get the orders data for the given organization.
   * @param organizationId
   */
  async getOrder(organizationId: string) {
    const response = await this.client
      .from('orders')
      .select('*, items: order_items !inner (*)')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (response.error) {
      throw response.error;
    }

    return response.data;
  }

  /**
   * @name getAccountWorkspace
   * @description Get the account workspace data.
   * @param organizationSlug
   */
  async getOrganizationWorkspace(organizationSlug: string) {
    const organizationPromise = this.client.rpc('organization_workspace', {
      org_slug: organizationSlug,
    });

    const membersPromise = this.client
      .from('organization_memberships')
      .select('*');

    const [organizationResult, membersResult, { data: claimsResult }] =
      await Promise.all([
        organizationPromise,
        membersPromise,
        this.client.auth.getClaims(),
      ]);

    if (organizationResult.error) {
      return {
        error: organizationResult.error,
        data: null,
      };
    }

    if (membersResult.error) {
      return {
        error: membersResult.error,
        data: null,
      };
    }

    if (!claimsResult || !claimsResult.claims) {
      return {
        error: new Error('User is not logged in'),
        data: null,
      };
    }

    const organizationData = organizationResult.data[0];

    if (!organizationData) {
      return {
        error: new Error('Organization data not found'),
        data: null,
      };
    }

    const user = claimsResult.claims;
    user.id = user.sub;

    return {
      data: {
        organization: organizationData,
        members: membersResult.data,
        user,
      },
      error: null,
    };
  }

  /**
   * @name hasPermission
   * @description Check if the user has permission to manage billing for the organization.
   */
  async hasPermission(params: {
    organizationId: string;
    userId: string;
    permission: Database['public']['Enums']['app_permissions'];
  }) {
    const { data, error } = await this.client.rpc('has_permission', {
      organization_id: params.organizationId,
      user_id: params.userId,
      permission_name: params.permission,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * @name getMembersCount
   * @description Get the number of members in the organization.
   * @param organizationId
   */
  async getMembersCount(organizationId: string) {
    const { count, error } = await this.client
      .from('organization_memberships')
      .select('*', {
        head: true,
        count: 'exact',
      })
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }

    return count;
  }

  /**
   * @name getCustomerId
   * @description Get the billing customer ID for the given organization.
   * @param organizationId
   */
  async getCustomerId(organizationId: string) {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.customer_id;
  }

  /**
   * @name getInvitation
   * @description Get the invitation data from the invite token.
   * @param adminClient - The admin client instance. Since the user is not yet part of the organization, we need to use an admin client to read the pending membership
   * @param token - The invitation token.
   */
  async getInvitation(adminClient: SupabaseClient<Database>, token: string) {
    const { data: invitation, error } = await adminClient
      .from('invitations')
      .select<
        string,
        {
          id: string;
          organization: {
            id: string;
            name: string;
            slug: string;
            picture_url: string;
          };
        }
      >(
        'id, expires_at, organization: organization_id !inner (id, name, slug, picture_url)',
      )
      .eq('invite_token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!invitation || error) {
      return null;
    }

    return invitation;
  }
}
