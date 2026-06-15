import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type {
  Node,
  NodeDrain,
  NodeEligibility,
  NodeHealth,
  NodeLifecycleState,
  NodeOrchestrationState,
  NodeRegion,
} from '@qlm/domain/entities';

import { TopologyHostMap } from './topology-host-map';

const REGIONS: NodeRegion[] = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
];

type SeedKind = 'running' | 'draining' | 'stopped' | 'error';
const SEEDS: SeedKind[] = ['running', 'draining', 'stopped', 'error'];

function axesFor(seed: SeedKind): {
  lifecycle: NodeLifecycleState;
  orchestration: NodeOrchestrationState;
  eligibility: NodeEligibility;
  drain?: NodeDrain;
  health: NodeHealth;
} {
  if (seed === 'error') {
    return {
      lifecycle: 'stopped',
      orchestration: 'down',
      eligibility: 'eligible',
      health: 'critical',
    };
  }
  if (seed === 'stopped') {
    return {
      lifecycle: 'stopped',
      orchestration: 'down',
      eligibility: 'eligible',
      health: 'unknown',
    };
  }
  if (seed === 'draining') {
    return {
      lifecycle: 'active',
      orchestration: 'ready',
      eligibility: 'ineligible',
      drain: { active: true, ignoreSystemJobs: false, force: false },
      health: 'degraded',
    };
  }
  return {
    lifecycle: 'active',
    orchestration: 'ready',
    eligibility: 'eligible',
    health: 'healthy',
  };
}

function makeNode(i: number, seed: SeedKind = 'running'): Node {
  const axes = axesFor(seed);
  return {
    id: `n_${i}`,
    projectId: 'p',
    name: `worker-${String(i).padStart(3, '0')}`,
    kind: 'standard-4',
    region: REGIONS[i % REGIONS.length]!,
    cpuCores: [2, 4, 8][i % 3]!,
    memoryGb: [8, 16, 32][i % 3]!,
    tags: [],
    version: 1,
    cpuUtilPct: (i * 7) % 100,
    memUtilPct: (i * 11) % 100,
    provider: 'aws',
    cluster: 'cluster-a',
    ...axes,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const MIXED: Node[] = Array.from({ length: 50 }, (_, i) =>
  makeNode(i, SEEDS[i % SEEDS.length]!),
);
const HEALTHY: Node[] = Array.from({ length: 50 }, (_, i) => makeNode(i, 'running'));
const HIGH_ERROR: Node[] = Array.from({ length: 50 }, (_, i) =>
  makeNode(i, i % 5 === 0 ? 'running' : i % 5 === 1 ? 'draining' : 'error'),
);
const LARGE: Node[] = Array.from({ length: 200 }, (_, i) =>
  makeNode(i, SEEDS[i % SEEDS.length]!),
);

const meta = {
  title: 'Features/Topology/Components/Topology Host Map',
  component: TopologyHostMap,
  tags: ['autodocs'],
  args: {
    rows: MIXED,
    onOpenNode: fn(),
  },
  argTypes: {
    rows: { table: { disable: true } },
    onOpenNode: { table: { disable: true } },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TopologyHostMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedFleet: Story = { args: { rows: MIXED } };
export const HealthyFleet: Story = { args: { rows: HEALTHY } };
export const HighErrorRate: Story = { args: { rows: HIGH_ERROR } };
export const LargeFleet: Story = { args: { rows: LARGE } };
export const SingleNode: Story = { args: { rows: [makeNode(1)] } };
