import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { withIntegrationsProviders } from '../lib/story-helpers';
import { ProviderPicker } from './provider-picker';

const meta: Meta<typeof ProviderPicker> = {
  title: 'Features/Integrations/Provider picker',
  component: ProviderPicker,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'padded' },
  args: {
    value: null,
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProviderPicker>;

export const Default: Story = {
  name: 'Default',
};

export const AwsSelected: Story = {
  name: 'AWS selected',
  args: { value: 'aws' },
};

export const GcpSelected: Story = {
  name: 'GCP selected',
  args: { value: 'gcp' },
};
