
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '@guepard/domain/entities';
import {
  INodeRepository,
  type Repositories,
} from '@guepard/domain/repositories';
import type { BulkResult, ListNodesInput, ListNodesRepositoryResult } from '@guepard/domain/usecases';
import { ShellAppProvider } from '@guepard/shell-runtime';

import { MetricsSparkline } from './metrics-sparkline';

// Generates a deterministic 60-point sine wave for CPU + memory.
function makeSineMetrics(): MetricsPoint[] {
  const now = Date.now();
  return Array.from({ length: 60 }, (_, i) => {
    const t = new Date(now - (59 - i) * 24 * 60 * 1000).toISOString();
    const cpu = 40 + 30 * Math.sin((i / 59) * Math.PI * 4);
    const mem = 55 + 20 * Math.cos((i / 59) * Math.PI * 3);
    return { t, cpu: Math.round(cpu), mem: Math.round(mem) };
  });
}

class StubNodeRepository extends INodeRepository {
  constructor(private readonly metricsData: MetricsPoint[] | 'loading') {
    super();
  }

  async findAll(): Promise<Node[]> { return []; }
  async findById(): Promise<Node | null> { return null; }
  async findBySlug(): Promise<Node | null> { return null; }
  async findByOrganizationId(_id: string, _input?: Omit<ListNodesInput, 'projectId'>): Promise<ListNodesRepositoryResult> {
    return { items: [], total: 0, nextCursor: null, facets: { lifecycle: {}, region: {}, provider: {} } };
  }
  async create(entity: Node): Promise<Node> { return entity; }
  async update(entity: Node): Promise<Node> { return entity; }
  async delete(): Promise<boolean> { return true; }
  async bulkDelete(): Promise<BulkResult> { return { succeeded: [], failed: [] }; }
  async setLifecycle(id: string, lifecycle: NodeLifecycleState, _expectedVersion: number): Promise<Node> {
    return { id, lifecycle } as Node;
  }
  async setEligibility(id: string, eligibility: NodeEligibility, _expectedVersion: number): Promise<Node> {
    return { id, eligibility } as Node;
  }
  async setDrain(id: string, drain: NodeDrain | null, _expectedVersion: number): Promise<Node> {
    return { id, drain: drain ?? undefined } as Node;
  }

  async getMetrics(_id: string, _range: MetricsRange): Promise<MetricsPoint[]> {
    if (this.metricsData === 'loading') {
      return new Promise(() => {});
    }
    return this.metricsData;
  }
}

function makeShellValue(metricsData: MetricsPoint[] | 'loading') {
  const repo = new StubNodeRepository(metricsData);
  const repositories = { node: repo } as unknown as Repositories;
  return {
    projectId: 'prj_storybook',
    projectSlug: 'storybook',
    orgSlug: 'storybook-org',
    organizationId: 'org-storybook',
    currentUserId: 'user_storybook',
    repositories,
    runQuery: (() => Promise.reject(new Error('not implemented'))) as never,
    testConnection: (() => Promise.reject(new Error('not implemented'))) as never,
    getDatasourceMetadata: (() => Promise.reject(new Error('not implemented'))) as never,
  };
}

function SparklineFrame({ metricsData }: { metricsData: MetricsPoint[] | 'loading' }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <div className="w-80 border border-border p-4">
      <QueryClientProvider client={queryClient}>
        <ShellAppProvider value={makeShellValue(metricsData)}>
          <MetricsSparkline nodeId="node_story_001" />
        </ShellAppProvider>
      </QueryClientProvider>
    </div>
  );
}

const meta = {
  title: 'Features/Nodes/Components/Node Metrics Sparkline',
  component: SparklineFrame,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SparklineFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  name: 'With data (sine wave)',
  args: { metricsData: makeSineMetrics() },
};

export const Unavailable: Story = {
  name: 'Unavailable (empty)',
  args: { metricsData: [] },
};

export const Loading: Story = {
  name: 'Loading (skeleton)',
  args: { metricsData: 'loading' },
};
