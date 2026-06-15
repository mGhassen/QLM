import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Card } from './card';
import { storyNode } from '../story-fixtures';

/** RFC 0026 §5 — five-axis fixture overrides packaged for legibility. */
const RUNNING = {
  lifecycle: 'active',
  orchestration: 'ready',
  eligibility: 'eligible',
  health: 'healthy',
} as const;

const DRAINING = {
  lifecycle: 'active',
  orchestration: 'ready',
  eligibility: 'ineligible',
  drain: { active: true, ignoreSystemJobs: false, force: false },
  health: 'degraded',
} as const;

const STOPPED = {
  lifecycle: 'stopped',
  orchestration: 'down',
  eligibility: 'eligible',
  health: 'unknown',
} as const;

const ERROR = {
  lifecycle: 'stopped',
  orchestration: 'down',
  eligibility: 'eligible',
  health: 'critical',
} as const;

const meta = {
  title: 'Features/Nodes/Components/Node Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    node: storyNode(),
    selectionMode: false,
    selected: false,
    onViewDetails: fn(),
    onSetLifecycle: fn(),
    onDrain: fn(),
    onCancelDrain: fn(),
    onDelete: fn(),
    onEdit: fn(),
    onSelect: fn(),
  },
  argTypes: {
    node: { control: 'object' },
    selectionMode: { control: 'boolean' },
    selected: { control: 'boolean' },
    onViewDetails: { table: { disable: true } },
    onSetLifecycle: { table: { disable: true } },
    onDrain: { table: { disable: true } },
    onCancelDrain: { table: { disable: true } },
    onDelete: { table: { disable: true } },
    onEdit: { table: { disable: true } },
    onSelect: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 200 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: { node: storyNode(RUNNING) },
};

export const Draining: Story = {
  args: { node: storyNode(DRAINING) },
};

export const Stopped: Story = {
  args: { node: storyNode({ ...STOPPED, lastSeenAt: undefined }) },
};

export const Error: Story = {
  args: { node: storyNode(ERROR) },
};

export const Selected: Story = {
  args: {
    node: storyNode(RUNNING),
    selected: true,
  },
};

export const SelectionMode: Story = {
  name: 'Selection mode (checkbox)',
  args: {
    node: storyNode(RUNNING),
    selectionMode: true,
    selected: false,
  },
};

export const SelectionModeChecked: Story = {
  name: 'Selection mode (checked)',
  args: {
    node: storyNode(RUNNING),
    selectionMode: true,
    selected: true,
  },
};

export const WithGCP: Story = {
  name: 'With GCP provider',
  args: {
    node: storyNode({ ...RUNNING, provider: 'gcp', region: 'eu-west-1' }),
  },
};

export const WithAzure: Story = {
  name: 'With Azure provider',
  args: {
    node: storyNode({ ...DRAINING, provider: 'azure', region: 'eu-central-1' }),
  },
};

export const WithOnPremise: Story = {
  name: 'With On-Premise provider',
  args: {
    node: storyNode({ provider: 'on-premise', cluster: undefined, ip: '192.168.1.100' }),
  },
};

export const NoProvider: Story = {
  name: 'No provider (bare)',
  args: {
    node: storyNode({ provider: undefined }),
  },
};

export const Tags: Story = {
  name: 'With multiple tags',
  args: {
    node: storyNode({ tags: ['production', 'gpu', 'critical'] }),
  },
};

export const NarrowCard: Story = {
  name: 'Narrow card (compact mode)',
  decorators: [
    (Story) => (
      <div style={{ width: 180, height: 200 }}>
        <Story />
      </div>
    ),
  ],
  args: { node: storyNode(RUNNING) },
};

export const AllStatuses: Story = {
  name: 'All display states grid',
  render: (args) => (
    <div className="grid grid-cols-2 gap-3" style={{ width: 680 }}>
      <div style={{ height: 200 }}>
        <Card {...args} node={storyNode(RUNNING)} />
      </div>
      <div style={{ height: 200 }}>
        <Card {...args} node={storyNode({ ...DRAINING, name: 'worker-002' })} />
      </div>
      <div style={{ height: 200 }}>
        <Card {...args} node={storyNode({ ...STOPPED, name: 'worker-003', lastSeenAt: undefined })} />
      </div>
      <div style={{ height: 200 }}>
        <Card {...args} node={storyNode({ ...ERROR, name: 'worker-004' })} />
      </div>
    </div>
  ),
};
