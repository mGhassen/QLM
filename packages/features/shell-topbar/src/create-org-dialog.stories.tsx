import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { CreateOrgDialog } from './create-org-dialog';

const meta: Meta<typeof CreateOrgDialog> = {
  title: 'Features/ShellTopbar/CreateOrgDialog',
  component: CreateOrgDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn(async () => {
      await new Promise((r) => setTimeout(r, 600));
    }),
  },
};

export default meta;
type Story = StoryObj<typeof CreateOrgDialog>;

export const Idle: Story = {};

export const ServerError: Story = {
  args: {
    serverError: 'An organization with that name already exists.',
  },
};

export const PrefilledFromTrigger: Story = {
  args: {
    defaultValues: { name: 'Acme Corp' },
  },
};
