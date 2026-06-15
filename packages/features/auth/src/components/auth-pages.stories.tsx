/**
 * Full-page auth layout stories.
 *
 * Shows AuthLayoutShell combined with each auth form so you can see the
 * complete sign-in / sign-up / password-reset pages as they appear to users.
 */
import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { Separator } from '@qlm/ui/separator';
import { Trans } from '@qlm/ui/trans';

import { AuthLayoutShell } from './auth-layout';
import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { OauthProviders } from './oauth-providers';
import { PasswordResetRequestContainer } from './password-reset-request-container';
import { PasswordSignInForm } from './password-sign-in-form';
import { PasswordSignUpForm } from './password-sign-up-form';
import { withAuthProviders } from './story-helpers';
import { UpdatePasswordForm } from './update-password-form';

const meta: Meta = {
  title: 'Auth/Full Pages',
  decorators: [withAuthProviders],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'authDesktop',
      viewports: {
        authDesktop: {
          name: 'Desktop (1280px)',
          styles: { width: '1280px', height: '900px' },
          type: 'desktop',
        },
        authMobile: {
          name: 'Mobile (390px)',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
      },
    },
  },
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// Sign In
// ---------------------------------------------------------------------------

export const SignInPage: Story = {
  name: 'Sign In (password)',
  render: () => (
    <AuthLayoutShell>
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>

      <PasswordSignInForm onSubmit={fn()} loading={false} redirecting={false} />
    </AuthLayoutShell>
  ),
};

export const SignInAllMethods: Story = {
  name: 'Sign In (password + OAuth)',
  render: () => (
    <AuthLayoutShell>
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>

      <PasswordSignInForm onSubmit={fn()} loading={false} redirecting={false} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card text-muted-foreground px-2">
            <Trans i18nKey="auth:orContinueWith" />
          </span>
        </div>
      </div>

      <OauthProviders
        enabledProviders={['google', 'github']}
        shouldCreateUser={false}
        paths={{ callback: '/auth/callback', returnPath: '/home' }}
      />
    </AuthLayoutShell>
  ),
};

// ---------------------------------------------------------------------------
// Sign Up
// ---------------------------------------------------------------------------

export const SignUpPage: Story = {
  name: 'Sign Up (password)',
  render: () => (
    <AuthLayoutShell>
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold">
          Create an account
        </h1>
        <p className="text-muted-foreground text-sm">Get started for free</p>
      </div>

      <PasswordSignUpForm
        onSubmit={fn()}
        loading={false}
        displayTermsCheckbox
      />
    </AuthLayoutShell>
  ),
};

export const SignUpMagicLinkPage: Story = {
  name: 'Sign Up (magic link)',
  render: () => (
    <AuthLayoutShell>
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold">
          Create an account
        </h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ll send you a sign-in link
        </p>
      </div>

      <MagicLinkAuthContainer
        shouldCreateUser
        redirectUrl="http://localhost:3000/auth/callback"
        displayTermsCheckbox
      />
    </AuthLayoutShell>
  ),
};

// ---------------------------------------------------------------------------
// Password Reset
// ---------------------------------------------------------------------------

export const PasswordResetPage: Story = {
  name: 'Password Reset (request link)',
  render: () => (
    <AuthLayoutShell>
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold">
          Reset your password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your email to receive a reset link
        </p>
      </div>

      <PasswordResetRequestContainer redirectPath="/auth/callback" />
    </AuthLayoutShell>
  ),
};

export const UpdatePasswordPage: Story = {
  name: 'Update Password',
  render: () => (
    <AuthLayoutShell>
      <UpdatePasswordForm redirectTo="/home" heading="Set a new password" />
    </AuthLayoutShell>
  ),
};
