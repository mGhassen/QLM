import type { Meta, StoryObj } from '@storybook/react-vite';

import { NodeDetailStorageSection } from './detail-storage-section';
import { storyNode } from '../story-fixtures';

const meta = {
  title: 'Features/Nodes/Detail/Storage Section',
  component: NodeDetailStorageSection,
  tags: ['autodocs'],
  args: {
    node: storyNode({ diskGb: 500, diskUtilPct: 42 }),
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
} satisfies Meta<typeof NodeDetailStorageSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cool: Story = {
  args: { node: storyNode({ diskGb: 500, diskUtilPct: 18 }) },
};

export const Hot: Story = {
  args: { node: storyNode({ diskGb: 500, diskUtilPct: 91 }) },
};

export const CapacityOnly: Story = {
  args: { node: storyNode({ diskGb: 250, diskUtilPct: undefined }) },
};

// Empty state — neither capacity nor utilization reported.
export const Empty: Story = {
  args: { node: storyNode({ diskGb: undefined, diskUtilPct: undefined }) },
};
