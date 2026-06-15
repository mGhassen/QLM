import type { Meta, StoryObj } from '@storybook/react-vite';

import type { Node } from '@qlm/domain/entities';

import { HealthStatusBadge } from './health-status-badge';

type DisplayInput = NonNullable<
  React.ComponentProps<typeof HealthStatusBadge>['node']
>;

const baseHappy: DisplayInput = {
  lifecycle: 'active',
  orchestration: 'ready',
  eligibility: 'eligible',
  drain: undefined,
  health: 'healthy',
};

const meta = {
  title: 'Features/Nodes/Cells/Health Status Badge',
  component: HealthStatusBadge,
  tags: ['autodocs'],
  args: { node: baseHappy },
} satisfies Meta<typeof HealthStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {};

export const Pending: Story = {
  args: { node: { ...baseHappy, lifecycle: 'provisioning', orchestration: 'initializing' } },
};

export const Degraded: Story = {
  args: { node: { ...baseHappy, health: 'degraded' } },
};

export const Critical: Story = {
  args: { node: { ...baseHappy, health: 'critical' } },
};

export const Draining: Story = {
  args: {
    node: {
      ...baseHappy,
      drain: { active: true, ignoreSystemJobs: false, force: false },
    },
  },
};

export const Ineligible: Story = {
  args: { node: { ...baseHappy, eligibility: 'ineligible' } },
};

export const Unreachable: Story = {
  args: { node: { ...baseHappy, orchestration: 'down' } },
};

export const Inactive: Story = {
  args: { node: { ...baseHappy, lifecycle: 'stopped' } },
};

export const AllKinds: Story = {
  name: 'All composite kinds',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <HealthStatusBadge node={baseHappy} />
      <HealthStatusBadge
        node={{ ...baseHappy, lifecycle: 'provisioning', orchestration: 'initializing' }}
      />
      <HealthStatusBadge node={{ ...baseHappy, health: 'degraded' }} />
      <HealthStatusBadge node={{ ...baseHappy, health: 'critical' }} />
      <HealthStatusBadge
        node={{ ...baseHappy, drain: { active: true, ignoreSystemJobs: false, force: false } }}
      />
      <HealthStatusBadge node={{ ...baseHappy, eligibility: 'ineligible' }} />
      <HealthStatusBadge node={{ ...baseHappy, orchestration: 'down' }} />
      <HealthStatusBadge node={{ ...baseHappy, lifecycle: 'stopped' }} />
    </div>
  ),
};

// Defensive — keeps Node import live for future story additions.
void (null as unknown as Node);
