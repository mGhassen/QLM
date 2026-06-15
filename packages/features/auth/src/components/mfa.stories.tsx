/**
 * Stories for the Multi-Factor Authentication (MFA) flow.
 *
 * MultiFactorChallengeContainer calls Supabase hooks internally; with the fake
 * VITE_SUPABASE_URL set in tooling/storybook/.env it will show the "Loading
 * factors" spinner then a graceful error (no factors found).
 *
 * The individual steps of the flow are also shown as isolated stories using
 * partial renders.
 */
import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { Alert, AlertDescription, AlertTitle } from '@guepard/ui/alert';
import { Button } from '@guepard/ui/button';
import { Heading } from '@guepard/ui/heading';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@guepard/ui/input-otp';
import { Spinner } from '@guepard/ui/spinner';

import { MultiFactorChallengeContainer } from './multi-factor-challenge-container';
import { withAuthProviders } from './story-helpers';

const meta: Meta<typeof MultiFactorChallengeContainer> = {
  title: 'Auth/MFA',
  component: MultiFactorChallengeContainer,
  decorators: [withAuthProviders],
  parameters: { layout: 'padded' },
  args: {
    userId: 'story-user-id',
    paths: { redirectPath: '/home' },
  },
};

export default meta;
type Story = StoryObj<typeof MultiFactorChallengeContainer>;

/**
 * Full container – will briefly show the spinner while fetching factors
 * (Supabase call will fail with fake keys and show the error state).
 */
export const FullContainer: Story = {
  name: 'Full Container (idle → loading factors)',
};

// ---------------------------------------------------------------------------
// Isolated step stories (no Supabase needed)
// ---------------------------------------------------------------------------

/** Loading state while MFA factors are being fetched. */
export const LoadingFactors: Story = {
  name: 'Step 1 / Loading Factors',
  render: () => (
    <div className="flex flex-col items-center gap-4 py-8">
      <Spinner />
      <span className="text-muted-foreground text-sm">
        Loading authentication methods…
      </span>
    </div>
  ),
};

/** Error state when factors cannot be loaded (Supabase error). */
export const FactorsLoadError: Story = {
  name: 'Step 1 / Error Loading Factors',
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>Error Loading Factors</AlertTitle>
      <AlertDescription>
        Could not load your authentication methods. Please sign out and try
        again.
      </AlertDescription>
    </Alert>
  ),
};

/** Factor selection list when the user has multiple TOTP factors. */
export const FactorSelection: Story = {
  name: 'Step 1 / Select Factor',
  render: () => (
    <div className="flex flex-col gap-4">
      <span className="font-medium">Select an authentication method</span>
      <div className="flex flex-col gap-2">
        {['Authenticator App', 'Backup Device'].map((name) => (
          <Button key={name} variant="outline" className="w-full">
            {name}
          </Button>
        ))}
      </div>
    </div>
  ),
};

/** OTP input step – user enters the 6-digit code. */
export const OtpInput: Story = {
  name: 'Step 2 / Enter OTP Code',
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <Heading level={5}>Verify your identity</Heading>

      <InputOTP maxLength={6} value="">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      <p className="text-muted-foreground text-center text-sm">
        Enter the 6-digit code from your authenticator app.
      </p>

      <Button className="w-full" disabled>
        Verify
      </Button>
    </div>
  ),
};

/** OTP input with a value pre-filled. */
export const OtpInputFilled: Story = {
  name: 'Step 2 / OTP Code Filled',
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <Heading level={5}>Verify your identity</Heading>

      <InputOTP maxLength={6} value="123456">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      <Button className="w-full">Verify</Button>
    </div>
  ),
};

/** Invalid code error. */
export const OtpInvalidCode: Story = {
  name: 'Step 2 / Invalid Code Error',
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <Heading level={5}>Verify your identity</Heading>

      <Alert variant="destructive">
        <AlertTitle>Invalid Code</AlertTitle>
        <AlertDescription>
          The verification code is incorrect. Please try again.
        </AlertDescription>
      </Alert>

      <InputOTP maxLength={6} value="">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      <Button className="w-full" disabled>
        Verify
      </Button>
    </div>
  ),
};

/** Success – code accepted, redirecting. */
export const OtpSuccess: Story = {
  name: 'Step 2 / Success (redirecting)',
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <Heading level={5}>Verify your identity</Heading>

      <Button className="w-full" disabled>
        Redirecting…
      </Button>
    </div>
  ),
};
