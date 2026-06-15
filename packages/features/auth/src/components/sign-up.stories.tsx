import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';

import { AuthErrorAlert } from './auth-error-alert';
import { PasswordSignUpForm } from './password-sign-up-form';
import { withAuthProviders } from './story-helpers';

const meta: Meta<typeof PasswordSignUpForm> = {
  title: 'Auth/Sign Up',
  component: PasswordSignUpForm,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
  args: {
    onSubmit: fn(),
    loading: false,
    displayTermsCheckbox: false,
  },
};

export default meta;
type Story = StoryObj<typeof PasswordSignUpForm>;

/** The default, empty sign-up form. */
export const Idle: Story = {
  name: 'Idle',
};

/** With terms-and-conditions checkbox visible (opt-in). */
export const WithTerms: Story = {
  name: 'With Terms & Conditions checkbox',
  args: { displayTermsCheckbox: true },
};

/** Spinner while the account is being created. */
export const Loading: Story = {
  name: 'Loading (creating account)',
  args: { loading: true },
};

/** Email confirmation prompt shown after a successful sign-up. */
export const SuccessEmailConfirmation: Story = {
  name: 'Success / Email confirmation required',
  render: () => (
    <Alert variant="success">
      <AlertTitle>Check your email</AlertTitle>
      <AlertDescription data-test="email-confirmation-alert">
        We&apos;ve sent a confirmation link to your email. Please check your
        inbox.
      </AlertDescription>
    </Alert>
  ),
};

/** Duplicate email / already registered error. */
export const WithEmailTakenError: Story = {
  name: 'Error / Email Already Registered',
  render: (args: React.ComponentProps<typeof PasswordSignUpForm>) => (
    <div className="flex flex-col gap-3">
      <AuthErrorAlert error="user_already_exists" />
      <PasswordSignUpForm {...args} onSubmit={fn()} loading={false} />
    </div>
  ),
};

/** Password too weak error (shown as form-level alert). */
export const WithWeakPasswordError: Story = {
  name: 'Error / Weak Password',
  render: (args: React.ComponentProps<typeof PasswordSignUpForm>) => (
    <div className="flex flex-col gap-3">
      <AuthErrorAlert error="weak_password" />
      <PasswordSignUpForm {...args} onSubmit={fn()} loading={false} />
    </div>
  ),
};
