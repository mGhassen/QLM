/**
 * Stories for the Magic-Link (OTP email) auth flow.
 *
 * MagicLinkAuthContainer calls Supabase hooks internally; with the fake
 * VITE_SUPABASE_URL set in tooling/storybook/.env it renders in idle state.
 * Submitting the form will fail gracefully without crashing.
 */
import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';

import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { ResendAuthLinkForm } from './resend-auth-link-form';
import { withAuthProviders } from './story-helpers';

const meta: Meta<typeof MagicLinkAuthContainer> = {
  title: 'Auth/Magic Link',
  component: MagicLinkAuthContainer,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
  args: {
    redirectUrl: 'http://localhost:3000/auth/callback',
    shouldCreateUser: false,
    displayTermsCheckbox: false,
    // No captchaSiteKey → captcha widget is hidden, form is immediately ready
  },
};

export default meta;
type Story = StoryObj<typeof MagicLinkAuthContainer>;

/** Sign-in via magic link – no terms checkbox. */
export const SignIn: Story = {
  name: 'Sign In (no terms)',
};

/** Sign-up via magic link – shows the T&C checkbox. */
export const SignUp: Story = {
  name: 'Sign Up (with Terms & Conditions)',
  args: {
    shouldCreateUser: true,
    displayTermsCheckbox: true,
  },
};

/** What the user sees after a successful link dispatch. */
export const Success: Story = {
  name: 'Success / Link Sent',
  render: () => (
    <Alert variant="success">
      <AlertTitle>Email Sent</AlertTitle>
      <AlertDescription>Check your inbox for a sign-in link.</AlertDescription>
    </Alert>
  ),
};

/** Network / Supabase error. */
export const Error: Story = {
  name: 'Error / Send Failed',
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>An error occurred</AlertTitle>
      <AlertDescription>Error sending link. Please try again.</AlertDescription>
    </Alert>
  ),
};

/** Resend-link form (shown to users who didn't receive the original email). */
export const ResendLink: Story = {
  name: 'Resend Link Form',
  render: () => <ResendAuthLinkForm redirectPath="/auth/callback" />,
};

/** Resend success state. */
export const ResendSuccess: Story = {
  name: 'Resend Link / Success',
  render: () => (
    <Alert variant="success">
      <AlertTitle>Email Sent</AlertTitle>
      <AlertDescription>
        We&apos;ve sent a new link to your email.
      </AlertDescription>
    </Alert>
  ),
};
