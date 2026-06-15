import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { CreateProjectDialog } from './create-project-dialog';

const meta: Meta<typeof CreateProjectDialog> = {
  title: 'Features/ShellTopbar/CreateProjectDialog',
  component: CreateProjectDialog,
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
type Story = StoryObj<typeof CreateProjectDialog>;

export const Idle: Story = {};

export const ServerError: Story = {
  args: {
    serverError: 'A project with that name already exists.',
  },
};

export const PrefilledFromTrigger: Story = {
  args: {
    defaultValues: { name: 'From trigger' },
  },
};
