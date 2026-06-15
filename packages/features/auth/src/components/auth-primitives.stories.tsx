import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Alert, AlertDescription, AlertTitle } from '@qlm/ui/alert';

import { AuthErrorAlert } from './auth-error-alert';
import { AuthProviderButton } from './auth-provider-button';
import { EmailInput } from './email-input';
import { PasswordInput } from './password-input';
import { withAuthProviders } from './story-helpers';

// ---------------------------------------------------------------------------
// AuthErrorAlert
// ---------------------------------------------------------------------------

const errorAlertMeta: Meta<typeof AuthErrorAlert> = {
  title: 'Auth/Primitives/Error alert',
  component: AuthErrorAlert,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
};

export default errorAlertMeta;

type AlertStory = StoryObj<typeof AuthErrorAlert>;

export const NoError: AlertStory = {
  name: 'No Error (renders nothing)',
  args: { error: null },
};

export const DefaultError: AlertStory = {
  name: 'Generic Error',
  args: { error: new Error('unknown_error') },
};

export const InvalidCredentials: AlertStory = {
  name: 'Invalid Credentials',
  args: { error: 'invalid_credentials' },
};

export const EmailNotConfirmed: AlertStory = {
  name: 'Email Not Confirmed',
  args: { error: 'email_not_confirmed' },
};

export const TooManyRequests: AlertStory = {
  name: 'Too Many Requests',
  args: { error: 'too_many_requests' },
};

// ---------------------------------------------------------------------------
// EmailInput
// ---------------------------------------------------------------------------

export const EmailInputDefault: AlertStory = {
  name: 'EmailInput / Empty',
  render: () => (
    <div className="w-80">
      <EmailInput />
    </div>
  ),
};

export const EmailInputPrefilled: AlertStory = {
  name: 'EmailInput / Pre-filled',
  render: () => (
    <div className="w-80">
      <EmailInput defaultValue="user@example.com" />
    </div>
  ),
};

export const EmailInputDisabled: AlertStory = {
  name: 'EmailInput / Disabled',
  render: () => (
    <div className="w-80">
      <EmailInput defaultValue="user@example.com" disabled />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// PasswordInput
// ---------------------------------------------------------------------------

export const PasswordInputDefault: AlertStory = {
  name: 'PasswordInput / Hidden',
  render: () => (
    <div className="w-80">
      <PasswordInput />
    </div>
  ),
};

export const PasswordInputWithValue: AlertStory = {
  name: 'PasswordInput / With value (use toggle to reveal)',
  render: () => (
    <div className="w-80">
      <PasswordInput defaultValue="super-secret-password" />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// AuthProviderButton
// ---------------------------------------------------------------------------

export const ProviderGoogle: AlertStory = {
  name: 'AuthProviderButton / Google',
  render: () => (
    <div className="w-80">
      <AuthProviderButton providerId="google" onClick={() => {}}>
        Sign in with Google
      </AuthProviderButton>
    </div>
  ),
};

export const ProviderGithub: AlertStory = {
  name: 'AuthProviderButton / GitHub',
  render: () => (
    <div className="w-80">
      <AuthProviderButton providerId="github" onClick={() => {}}>
        Sign in with GitHub
      </AuthProviderButton>
    </div>
  ),
};

export const ProviderAzure: AlertStory = {
  name: 'AuthProviderButton / Azure',
  render: () => (
    <div className="w-80">
      <AuthProviderButton providerId="azure" onClick={() => {}}>
        Sign in with Azure
      </AuthProviderButton>
    </div>
  ),
};

export const ProviderKeycloak: AlertStory = {
  name: 'AuthProviderButton / Keycloak',
  render: () => (
    <div className="w-80">
      <AuthProviderButton providerId="keycloak" onClick={() => {}}>
        Sign in with Keycloak
      </AuthProviderButton>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Alert variants
// ---------------------------------------------------------------------------

export const AlertSuccess: AlertStory = {
  name: 'Alert / Success variant',
  render: () => (
    <Alert variant="success">
      <AlertTitle>Email Sent</AlertTitle>
      <AlertDescription>Check your inbox for a sign-in link.</AlertDescription>
    </Alert>
  ),
};

export const AlertDestructive: AlertStory = {
  name: 'Alert / Destructive variant',
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Authentication error</AlertTitle>
      <AlertDescription>Invalid email or password.</AlertDescription>
    </Alert>
  ),
};
