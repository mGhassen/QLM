import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DrainDialog } from './drain-dialog';

const meta = {
  title: 'Features/Nodes/Components/Drain Dialog',
  component: DrainDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    nodeName: 'node-prod-us-east-1-001',
    onOpenChange: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof DrainDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Submitting: Story = {
  args: { isSubmitting: true },
};
