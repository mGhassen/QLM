/**
 * Stories for OAuth provider sign-in.
 *
 * OauthProviders calls useSignInWithProvider internally; with the fake
 * VITE_SUPABASE_URL set in tooling/storybook/.env it renders fine in idle
 * state (clicking a provider button will fail gracefully).
 */
import type { Meta, StoryObj } from '@storybook/react';

import { OauthProviders } from './oauth-providers';
import { withAuthProviders } from './story-helpers';

const sharedPaths = {
  callback: '/auth/callback',
  returnPath: '/home',
};

const meta: Meta<typeof OauthProviders> = {
  title: 'Auth/OAuth',
  component: OauthProviders,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
  args: {
    shouldCreateUser: false,
    paths: sharedPaths,
  },
};

export default meta;
type Story = StoryObj<typeof OauthProviders>;

/** Empty – no providers enabled, renders nothing. */
export const NoProviders: Story = {
  name: 'No Providers (renders nothing)',
  args: { enabledProviders: [] },
};

/** Single provider (Google). */
export const SingleProvider: Story = {
  name: 'Single Provider (Google)',
  args: { enabledProviders: ['google'] },
};

/** Multiple common providers. */
export const MultipleProviders: Story = {
  name: 'Multiple Providers',
  args: { enabledProviders: ['google', 'github', 'azure'] },
};

/** All supported providers at once. */
export const AllProviders: Story = {
  name: 'All Providers',
  args: {
    enabledProviders: ['google', 'github', 'azure', 'keycloak', 'discord'],
  },
};

/** Sign-up mode (shouldCreateUser = true). */
export const SignUpMode: Story = {
  name: 'Sign-Up mode (shouldCreateUser: true)',
  args: {
    enabledProviders: ['google', 'github'],
    shouldCreateUser: true,
  },
};
