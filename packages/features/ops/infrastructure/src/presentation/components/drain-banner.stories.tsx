import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DrainBanner } from './drain-banner';

const meta = {
  title: 'Features/Nodes/Components/Drain Banner',
  component: DrainBanner,
  tags: ['autodocs'],
} satisfies Meta<typeof DrainBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoDeadline: Story = {
  args: {
    drain: { active: true, ignoreSystemJobs: false, force: false },
    onCancel: fn(),
  },
};

export const WithCountdown30m: Story = {
  args: {
    drain: {
      active: true,
      deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
      ignoreSystemJobs: false,
      force: false,
    },
    onCancel: fn(),
  },
};

export const Cancelling: Story = {
  args: {
    drain: {
      active: true,
      deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
      ignoreSystemJobs: false,
      force: false,
    },
    onCancel: fn(),
    isCancelling: true,
  },
};

export const Stalled: Story = {
  args: {
    drain: {
      active: true,
      deadline: new Date(Date.now() - 60_000).toISOString(),
      ignoreSystemJobs: false,
      force: false,
    },
    onCancel: fn(),
    isStalled: true,
  },
};
