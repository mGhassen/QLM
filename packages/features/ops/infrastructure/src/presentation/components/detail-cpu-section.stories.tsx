import type { Meta, StoryObj } from '@storybook/react-vite';

import { NodeDetailCpuSection } from './detail-cpu-section';
import { storyNode } from '../story-fixtures';

const meta = {
  title: 'Features/Nodes/Detail/CPU Section',
  component: NodeDetailCpuSection,
  tags: ['autodocs'],
  args: {
    node: storyNode({ cpuCores: 8, cpuUtilPct: 47 }),
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
} satisfies Meta<typeof NodeDetailCpuSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cool: Story = {
  args: { node: storyNode({ cpuCores: 8, cpuUtilPct: 22 }) },
};

export const Hot: Story = {
  args: { node: storyNode({ cpuCores: 8, cpuUtilPct: 92, lifecycle: 'active' }) },
};

export const NoMetrics: Story = {
  args: { node: storyNode({ cpuCores: 4, cpuUtilPct: undefined }) },
};
