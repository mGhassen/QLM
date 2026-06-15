import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { awsRegionsFixture } from '../__fixtures__';
import { withIntegrationsProviders } from '../lib/story-helpers';
import { IntegrationRegionsPanel } from './integration-regions-panel';

const meta: Meta<typeof IntegrationRegionsPanel> = {
  title: 'Features/Integrations/IntegrationRegionsPanel',
  component: IntegrationRegionsPanel,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'padded' },
  args: {
    onRetry: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof IntegrationRegionsPanel>;

export const Loading: Story = {
  name: 'Loading',
  args: { regions: null, isLoading: true, error: null },
};

export const Loaded: Story = {
  name: 'Loaded (16 AWS regions)',
  args: { regions: awsRegionsFixture, isLoading: false, error: null },
};

export const Empty: Story = {
  name: 'Empty',
  args: { regions: [], isLoading: false, error: null },
};

export const Error: Story = {
  name: 'Error',
  args: {
    regions: null,
    isLoading: false,
    error:
      'Could not reach ec2.us-east-1.amazonaws.com (getaddrinfo ENOTFOUND)',
  },
};
