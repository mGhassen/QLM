import type { Meta, StoryObj } from '@storybook/react';

import { MultiFactorAuthSetupDialog } from './multi-factor-auth-setup-dialog';

const meta: Meta<typeof MultiFactorAuthSetupDialog> = {
  title: 'UserProfile/MultiFactorAuthSetupDialog',
  component: MultiFactorAuthSetupDialog,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof MultiFactorAuthSetupDialog>;

const noopEnroll = async (friendlyName: string) => ({
  factorId: '11111111-1111-4111-8111-111111111111',
  qrCode:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#000"/><text x="50%" y="50%" fill="#fff" text-anchor="middle" dominant-baseline="middle">QR</text></svg>',
  secret: `JBSWY3DPEHPK3PXP-${friendlyName.length}`,
});
const noopVerify = async () => Promise.resolve();
const noopCancel = () => {};

export const NameStep: Story = {
  args: {
    open: true,
    onEnroll: noopEnroll,
    onVerify: noopVerify,
    onCancel: noopCancel,
  },
};

export const EnrollError: Story = {
  args: {
    open: true,
    enrollError: 'Could not start MFA enrollment.',
    onEnroll: noopEnroll,
    onVerify: noopVerify,
    onCancel: noopCancel,
  },
};

export const VerifyError: Story = {
  args: {
    open: true,
    verifyError: "That code didn't work. Please try again.",
    onEnroll: noopEnroll,
    onVerify: noopVerify,
    onCancel: noopCancel,
  },
};
