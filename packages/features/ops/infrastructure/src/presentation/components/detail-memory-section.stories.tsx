import type { Meta, StoryObj } from '@storybook/react-vite';

import { NodeDetailMemorySection } from './detail-memory-section';
import { storyNode } from '../story-fixtures';

const meta = {
  title: 'Features/Nodes/Detail/Memory Section',
  component: NodeDetailMemorySection,
  tags: ['autodocs'],
  args: {
    node: storyNode({ memoryGb: 32, memUtilPct: 56 }),
  },
  argTypes: {
    node: { control: 'object' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 720, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NodeDetailMemorySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cool: Story = {
  args: { node: storyNode({ memoryGb: 32, memUtilPct: 30 }) },
};

export const Hot: Story = {
  args: { node: storyNode({ memoryGb: 32, memUtilPct: 90 }) },
};

export const NoMetrics: Story = {
  args: { node: storyNode({ memoryGb: 16, memUtilPct: undefined }) },
};
