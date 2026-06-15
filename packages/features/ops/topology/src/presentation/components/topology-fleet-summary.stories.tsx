import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { FleetSummary, PressurePoint } from '@guepard/domain/usecases';

import { TopologyFleetSummary } from './topology-fleet-summary';

const baseSummary: FleetSummary = {
  total: 12,
  totalCpu: 48,
  totalMem: 192,
  avgCpuUtil: 47,
  avgMemUtil: 62,
  lifecycleCounts: {
    provisioning: 0,
    active: 9,
    stopping: 0,
    stopped: 2,
    terminating: 0,
    terminated: 1,
  },
  healthCounts: {
    healthy: 9,
    degraded: 1,
    critical: 1,
    unknown: 1,
  },
  regions: 3,
  clusters: 4,
  providers: 2,
};

const samplePressure: PressurePoint[] = [
  { kind: 'unreachable', nodeId: 'n-err', nodeName: 'web-prod-3', value: 1 },
  { kind: 'highCpu', nodeId: 'n-hot1', nodeName: 'analytics-1', value: 92 },
  { kind: 'highMem', nodeId: 'n-hot2', nodeName: 'cache-2', value: 88 },
];

const meta = {
  title: 'Features/Topology/Components/Topology Fleet Summary',
  component: TopologyFleetSummary,
  tags: ['autodocs'],
  args: {
    summary: baseSummary,
    pressurePoints: samplePressure,
    onAttentionClick: fn(),
    onPressureSelect: fn(),
  },
  argTypes: {
    onAttentionClick: { table: { disable: true } },
    onPressureSelect: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TopologyFleetSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SomeAttention: Story = {};

export const HighAttention: Story = {
  args: {
    summary: {
      ...baseSummary,
      avgCpuUtil: 88,
      avgMemUtil: 92,
      lifecycleCounts: {
        provisioning: 0,
        active: 6,
        stopping: 0,
        stopped: 3,
        terminating: 0,
        terminated: 3,
      },
      healthCounts: {
        healthy: 6,
        degraded: 0,
        critical: 3,
        unknown: 3,
      },
    },
  },
};

export const Healthy: Story = {
  args: {
    summary: {
      ...baseSummary,
      avgCpuUtil: 22,
      avgMemUtil: 31,
      lifecycleCounts: {
        provisioning: 0,
        active: 12,
        stopping: 0,
        stopped: 0,
        terminating: 0,
        terminated: 0,
      },
      healthCounts: {
        healthy: 12,
        degraded: 0,
        critical: 0,
        unknown: 0,
      },
    },
    pressurePoints: [],
  },
};
