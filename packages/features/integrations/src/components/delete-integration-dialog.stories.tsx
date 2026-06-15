import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { withIntegrationsProviders } from '../lib/story-helpers';
import { DeleteIntegrationDialog } from './delete-integration-dialog';

const meta: Meta<typeof DeleteIntegrationDialog> = {
  title: 'Features/Integrations/Delete integration',
  component: DeleteIntegrationDialog,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    integrationName: 'prod-aws',
  },
};

export default meta;
type Story = StoryObj<typeof DeleteIntegrationDialog>;

export const Default: Story = {
  name: 'Default (Delete button disabled)',
};

export const ConfirmationTyped: Story = {
  name: 'Confirmation typed (Delete button enabled)',
  args: { initialConfirmation: 'prod-aws' },
};
