import type { RepositoryFindOptions } from '@guepard/domain/common';
import { Roles } from '@guepard/domain/common';
import type { User } from '@guepard/domain/entities';
import { IUserRepository } from '@guepard/domain/repositories';
import type { SupabaseClientType } from './types';

export class UserRepository extends IUserRepository {
  constructor(private client: SupabaseClientType) {
    super();
  }

  private deserializeFromAuthUser(authUser: {
    id: string;
    user_metadata?: { username?: string };
    created_at?: string;
    updated_at?: string;
  }): User {
    // Get username from public_data in accounts table
    // For now, we'll use a placeholder - in practice, you'd join with accounts table
    const username =
      authUser.user_metadata?.username || authUser.id.slice(0, 8); // Fallback to first 8 chars of UUID

    return {
      id: authUser.id,
      username,
      role: Roles.USER, // Default role, could be stored in user_metadata
      createdAt: authUser.created_at
        ? new Date(authUser.created_at)
        : new Date(),
      updatedAt: authUser.updated_at
        ? new Date(authUser.updated_at)
        : new Date(),
    } as User;
  }

  async findAll(_options?: RepositoryFindOptions): Promise<User[]> {
    // Only return the current authenticated user
    const { data, error } = await this.client.auth.getUser();

    if (error || !data.user) {
      return [];
    }

    return [this.deserializeFromAuthUser(data.user)];
  }

  async findById(id: string): Promise<User | null> {
    // Only return the current authenticated user if the ID matches
    const { data, error } = await this.client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    // Only return user if the requested ID matches the current user
    if (data.user.id !== id) {
      return null;
    }

    return this.deserializeFromAuthUser(data.user);
  }

  async findBySlug(slug: string): Promise<User | null> {
    // Only return the current authenticated user if the slug matches
    const { data, error } = await this.client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    // Get username from accounts table for the current user
    const { data: accountData, error: accountError } = await this.client
      .from('accounts')
      .select('public_data')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (accountError || !accountData) {
      // Fallback to checking user_metadata
      const username =
        data.user.user_metadata?.username || data.user.id.slice(0, 8);
      return username === slug ? this.deserializeFromAuthUser(data.user) : null;
    }

    const username =
      (accountData.public_data as { username?: string })?.username ||
      data.user.user_metadata?.username ||
      data.user.id.slice(0, 8);

    return username === slug ? this.deserializeFromAuthUser(data.user) : null;
  }

  async create(_entity: User): Promise<User> {
    // Users should be created through Supabase Auth signup, not through this repository
    // This method is kept for interface compatibility but throws an error
    throw new Error(
      'User creation should be done through Supabase Auth signup, not through the repository',
    );
  }

  async update(entity: User): Promise<User> {
    // Only allow updating the current authenticated user
    const { data: currentUser, error: currentUserError } =
      await this.client.auth.getUser();

    if (currentUserError || !currentUser.user) {
      throw new Error('User not authenticated');
    }

    if (currentUser.user.id !== entity.id) {
      throw new Error('Can only update your own user data');
    }

    // Update user metadata (non-admin API)
    const { data, error } = await this.client.auth.updateUser({
      data: {
        username: entity.username,
        role: entity.role,
      },
    });

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    // Update username in accounts.public_data
    const { error: accountError } = await this.client
      .from('accounts')
      .update({
        public_data: { username: entity.username },
      })
      .eq('user_id', entity.id);

    if (accountError) {
      console.warn('Could not update account public_data:', accountError);
    }

    return this.deserializeFromAuthUser(data.user);
  }

  async delete(id: string): Promise<boolean> {
    // Only allow deleting the current authenticated user
    const { data: currentUser, error: currentUserError } =
      await this.client.auth.getUser();

    if (currentUserError || !currentUser.user) {
      throw new Error('User not authenticated');
    }

    if (currentUser.user.id !== id) {
      throw new Error('Can only delete your own account');
    }

    // Note: Deleting a user account typically requires admin privileges or a specific flow
    // This is a sensitive operation and should be handled carefully
    // For now, we'll throw an error indicating this should be done through a proper flow
    throw new Error(
      'User deletion should be done through a proper account deletion flow, not through the repository',
    );
  }
}
