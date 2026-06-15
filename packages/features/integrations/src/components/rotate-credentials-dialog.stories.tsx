import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { withIntegrationsProviders } from '../lib/story-helpers';
import { RotateCredentialsDialog } from './rotate-credentials-dialog';

const meta: Meta<typeof RotateCredentialsDialog> = {
  title: 'Features/Integrations/Rotate credentials',
  component: RotateCredentialsDialog,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmitAws: fn(),
    onSubmitGcp: fn(),
    onTestAws: fn(),
    onTestGcp: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RotateCredentialsDialog>;

export const Aws: Story = {
  name: 'Rotating AWS credentials',
  args: { provider: 'aws' },
};

export const Gcp: Story = {
  name: 'Rotating GCP credentials',
  args: { provider: 'gcp' },
};
