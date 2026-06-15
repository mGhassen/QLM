import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { Node } from '@qlm/domain/entities';

import { TopologyPoolCard } from './topology-pool-card';
import type { TopologyPool } from '../../application/use-topology-data';

function makePool(overrides: Partial<TopologyPool> = {}): TopologyPool {
  const baseNode: Node = {
    id: 'n1',
    projectId: 'p',
    name: 'worker-001',
    kind: 'standard-4',
    region: 'us-east-1',
    cpuCores: 4,
    memoryGb: 16,
    tags: [],
    version: 1,
    cpuUtilPct: 42,
    memUtilPct: 67,
    provider: 'aws',
    cluster: 'cluster-prod-a',
    lifecycle: 'active',
    orchestration: 'ready',
    eligibility: 'eligible',
    health: 'healthy',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const nodes = overrides.nodes ?? [baseNode, { ...baseNode, id: 'n2' }];
  return {
    id: 'aws::us-east-1::cluster-prod-a',
    provider: 'aws',
    region: 'us-east-1',
    cluster: 'cluster-prod-a',
    nodes,
    totalCpu: nodes.reduce((s, n) => s + n.cpuCores, 0),
    totalMem: nodes.reduce((s, n) => s + n.memoryGb, 0),
    avgCpuUtil: 42,
    avgMemUtil: 67,
    healthCounts: {
      healthy: nodes.length,
      degraded: 0,
      critical: 0,
      unknown: 0,
    },
    lifecycleCounts: {
      provisioning: 0,
      active: nodes.length,
      stopping: 0,
      stopped: 0,
      terminating: 0,
      terminated: 0,
    },
    ...overrides,
  };
}

const meta = {
  title: 'Features/Topology/Components/Topology Pool Card',
  component: TopologyPoolCard,
  tags: ['autodocs'],
  args: {
    pool: makePool(),
    onClick: fn(),
  },
  argTypes: {
    pool: { control: 'object' },
    onClick: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 640 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TopologyPoolCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {};

export const UnderPressure: Story = {
  args: {
    pool: makePool({
      avgCpuUtil: 88,
      avgMemUtil: 92,
      healthCounts: { healthy: 1, degraded: 3, critical: 1, unknown: 1 },
      lifecycleCounts: {
        provisioning: 0,
        active: 5,
        stopping: 0,
        stopped: 0,
        terminating: 0,
        terminated: 1,
      },
    }),
  },
};

export const OnPremise: Story = {
  args: {
    pool: makePool({
      provider: 'on-premise',
      region: 'eu-central-1',
      cluster: 'edge-cluster',
      avgCpuUtil: 65,
      avgMemUtil: 71,
    }),
  },
};

export const SinglePool: Story = {
  args: { pool: makePool({ nodes: [makePool().nodes[0]!] }) },
};
