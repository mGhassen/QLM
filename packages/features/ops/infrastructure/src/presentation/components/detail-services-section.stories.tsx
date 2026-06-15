import type { Meta, StoryObj } from '@storybook/react-vite';

import { NodeDetailServicesSection } from './detail-services-section';
import { storyNode } from '../story-fixtures';

const meta = {
  title: 'Features/Nodes/Detail/Services Section',
  component: NodeDetailServicesSection,
  tags: ['autodocs'],
  args: {
    node: storyNode(),
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
} satisfies Meta<typeof NodeDetailServicesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// Phase 1 ships an empty state — workload domain port lands in RFC 0028.
export const Empty: Story = {};
