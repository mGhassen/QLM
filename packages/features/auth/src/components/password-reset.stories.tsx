/**
 * Stories for the two-step password reset flow:
 *   1. PasswordResetRequestContainer – user enters their email to receive a link
 *   2. UpdatePasswordForm            – user sets a new password after clicking the link
 *
 * Container components call Supabase hooks internally; with the fake
 * VITE_SUPABASE_URL set in tooling/storybook/.env they render in idle
 * state without crashing.  Submitting the form will fail gracefully.
 */
import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Alert, AlertDescription } from '@qlm/ui/alert';
import { Button } from '@qlm/ui/button';

import { PasswordResetRequestContainer } from './password-reset-request-container';
import { withAuthProviders } from './story-helpers';
import { UpdatePasswordForm } from './update-password-form';

// ---------------------------------------------------------------------------
// PasswordResetRequestContainer
// ---------------------------------------------------------------------------

const requestMeta: Meta<typeof PasswordResetRequestContainer> = {
  title: 'Auth/Password Reset/Request',
  component: PasswordResetRequestContainer,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
  args: {
    redirectPath: '/auth/callback',
  },
};

export default requestMeta;
type RequestStory = StoryObj<typeof PasswordResetRequestContainer>;

/** User sees the email field and the submit button. */
export const Idle: RequestStory = {
  name: 'Idle',
};

/** After a successful submission the form disappears and a success alert shows. */
export const Success: RequestStory = {
  name: 'Success (email sent)',
  render: () => (
    <Alert variant="success">
      <AlertDescription>
        Password reset email sent. Please check your inbox.
      </AlertDescription>
    </Alert>
  ),
};

// ---------------------------------------------------------------------------
// UpdatePasswordForm
// ---------------------------------------------------------------------------

export const UpdatePasswordIdle: RequestStory = {
  name: 'UpdatePasswordForm / Idle',
  render: () => (
    <UpdatePasswordForm redirectTo="/home" heading="Set a new password" />
  ),
};

export const UpdatePasswordNoHeading: RequestStory = {
  name: 'UpdatePasswordForm / No heading',
  render: () => <UpdatePasswordForm redirectTo="/home" />,
};

/** Error state – e.g. same_password error code returned from Supabase. */
export const UpdatePasswordError: RequestStory = {
  name: 'UpdatePasswordForm / Error state',
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <p className="text-sm">Error resetting password. Please try again.</p>
      </Alert>

      <Button variant="outline" onClick={() => {}}>
        Try Again
      </Button>
    </div>
  ),
};
