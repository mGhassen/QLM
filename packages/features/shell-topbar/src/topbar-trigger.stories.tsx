import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { TopbarTrigger } from './topbar-trigger';

const meta: Meta<typeof TopbarTrigger> = {
  title: 'Features/ShellTopbar/TopbarTrigger',
  component: TopbarTrigger,
  parameters: { layout: 'centered' },
  args: {
    orgInitial: 'G',
    orgColor: '#f59e0b',
    projectName: 'Rasm Console',
    isOpen: false,
    onOpen: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TopbarTrigger>;

export const Default: Story = {};

export const Open: Story = {
  args: { isOpen: true },
};
