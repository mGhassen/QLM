import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { AuthErrorAlert } from './auth-error-alert';
import { PasswordSignInForm } from './password-sign-in-form';
import { withAuthProviders } from './story-helpers';

const meta: Meta<typeof PasswordSignInForm> = {
  title: 'Auth/Sign In',
  component: PasswordSignInForm,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
  args: {
    onSubmit: fn(),
    loading: false,
    redirecting: false,
  },
};

export default meta;
type Story = StoryObj<typeof PasswordSignInForm>;

/** The default, empty sign-in form. */
export const Idle: Story = {
  name: 'Idle',
};

/** Spinner state while credentials are being verified. */
export const Loading: Story = {
  name: 'Loading (verifying credentials)',
  args: { loading: true },
};

/** Brief flash after a successful sign-in before the page navigates away. */
export const Redirecting: Story = {
  name: 'Redirecting (post-login)',
  args: { redirecting: true },
};

/** Invalid-credentials error shown above the form. */
export const WithInvalidCredentialsError: Story = {
  name: 'Error / Invalid Credentials',
  render: (args: React.ComponentProps<typeof PasswordSignInForm>) => (
    <div className="flex flex-col gap-3">
      <AuthErrorAlert error="invalid_credentials" />
      <PasswordSignInForm {...args} />
    </div>
  ),
};

/** Network / generic server error. */
export const WithGenericError: Story = {
  name: 'Error / Generic',
  render: (args: React.ComponentProps<typeof PasswordSignInForm>) => (
    <div className="flex flex-col gap-3">
      <AuthErrorAlert error={new Error('unexpected_failure')} />
      <PasswordSignInForm {...args} />
    </div>
  ),
};

/** Email not yet confirmed. */
export const WithEmailNotConfirmedError: Story = {
  name: 'Error / Email Not Confirmed',
  render: (args: React.ComponentProps<typeof PasswordSignInForm>) => (
    <div className="flex flex-col gap-3">
      <AuthErrorAlert error="email_not_confirmed" />
      <PasswordSignInForm {...args} />
    </div>
  ),
};
