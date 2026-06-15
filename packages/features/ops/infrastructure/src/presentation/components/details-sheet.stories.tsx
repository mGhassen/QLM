import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from 'storybook/test';

import type {
  MetricsPoint,
  MetricsRange,
  Node,
  NodeDrain,
  NodeEligibility,
  NodeLifecycleState,
} from '@qlm/domain/entities';

import {
  INodeRepository,
  type Repositories,
} from '@qlm/domain/repositories';
import type { BulkResult, ListNodesInput, ListNodesRepositoryResult, UpdateNodeInput } from '@qlm/domain/usecases';
import { ShellAppProvider } from '@qlm/shell-runtime';

import { DetailsSheet } from './details-sheet';
import { storyNode } from '../story-fixtures';

const STORY_NODE_ID = 'node_story_001';

class StubNodeRepository extends INodeRepository {
  constructor(
    private readonly node: Node | null,
    private readonly metricsData: MetricsPoint[] = [],
    private readonly simulateLoadingMs: number = 0,
  ) {
    super();
  }

  async findAll(): Promise<Node[]> { return this.node ? [this.node] : []; }

  async findById(_id: string): Promise<Node | null> {
    if (this.simulateLoadingMs > 0) {
      await new Promise((r) => setTimeout(r, this.simulateLoadingMs));
    }
    return this.node;
  }

  async findBySlug(): Promise<Node | null> { return null; }

  async findByOrganizationId(_id: string, _input?: Omit<ListNodesInput, 'projectId'>): Promise<ListNodesRepositoryResult> {
    return { items: [], total: 0, nextCursor: null, facets: { lifecycle: {}, region: {}, provider: {} } };
  }

  async create(entity: Node): Promise<Node> { return entity; }
  async update(entity: Node): Promise<Node> { return entity; }
  async delete(): Promise<boolean> { return true; }
  async bulkDelete(): Promise<BulkResult> { return { succeeded: [], failed: [] }; }

  async setLifecycle(id: string, lifecycle: NodeLifecycleState, _expectedVersion: number): Promise<Node> {
    return { ...(this.node ?? {}), id, lifecycle } as Node;
  }

  async setEligibility(id: string, eligibility: NodeEligibility, _expectedVersion: number): Promise<Node> {
    return { ...(this.node ?? {}), id, eligibility } as Node;
  }

  async setDrain(id: string, drain: NodeDrain | null, _expectedVersion: number): Promise<Node> {
    return { ...(this.node ?? {}), id, drain: drain ?? undefined } as Node;
  }

  async getMetrics(_id: string, _range: MetricsRange): Promise<MetricsPoint[]> {
    return this.metricsData;
  }
}

function makeSineMetrics(): MetricsPoint[] {
  const now = Date.now();
  return Array.from({ length: 60 }, (_, i) => {
    const t = new Date(now - (59 - i) * 24 * 60 * 1000).toISOString();
    return {
      t,
      cpu: Math.round(40 + 30 * Math.sin((i / 59) * Math.PI * 4)),
      mem: Math.round(55 + 20 * Math.cos((i / 59) * Math.PI * 3)),
    };
  });
}

type FrameProps = {
  node: Node | null;
  metricsData?: MetricsPoint[];
  simulateLoadingMs?: number;
  onDelete?: (id: string) => void;
  onUpdate?: (input: UpdateNodeInput) => void;
  onSetLifecycle?: (id: string, lifecycle: NodeLifecycleState) => void;
  onDrain?: (node: Node) => void;
  onCancelDrain?: (id: string) => void;
  onTagClick?: (tag: string) => void;
};

function DetailsSheetFrame({
  node,
  metricsData = [],
  simulateLoadingMs = 0,
  onDelete,
  onUpdate,
  onSetLifecycle,
  onDrain,
  onCancelDrain,
  onTagClick,
}: FrameProps) {
  const [open, setOpen] = useState(true);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repo = new StubNodeRepository(node, metricsData, simulateLoadingMs);
  const repositories = { node: repo } as unknown as Repositories;

  const shellValue = {
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

  return (
    <div className="relative h-[720px] w-full border border-dashed border-border flex items-center justify-center bg-background">
      <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
        Sheet renders on right
      </span>
      <QueryClientProvider client={queryClient}>
        <ShellAppProvider value={shellValue}>
          <DetailsSheet
            nodeId={node ? STORY_NODE_ID : null}
            open={open}
            onOpenChange={setOpen}
            onDelete={onDelete ?? fn()}
            onUpdate={onUpdate}
            onSetLifecycle={onSetLifecycle}
            onDrain={onDrain}
            onCancelDrain={onCancelDrain}
            onTagClick={onTagClick}
          />
        </ShellAppProvider>
      </QueryClientProvider>
    </div>
  );
}

const meta = {
  title: 'Features/Nodes/Components/Node Details Sheet',
  component: DetailsSheetFrame,
  tags: ['autodocs'],
  args: {
    node: storyNode(),
    metricsData: makeSineMetrics(),
    onDelete: fn(),
    onUpdate: fn(),
    onSetLifecycle: fn(),
    onDrain: fn(),
    onCancelDrain: fn(),
    onTagClick: fn(),
  },
  argTypes: {
    node: { control: 'object' },
    metricsData: { table: { disable: true } },
    onDelete: { table: { disable: true } },
    onUpdate: { table: { disable: true } },
    onSetLifecycle: { table: { disable: true } },
    onDrain: { table: { disable: true } },
    onCancelDrain: { table: { disable: true } },
    onTagClick: { table: { disable: true } },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DetailsSheetFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'View mode (running)',
};

export const Draining: Story = {
  args: {
    node: storyNode({
      lifecycle: 'active',
      orchestration: 'ready',
      eligibility: 'ineligible',
      drain: { active: true, ignoreSystemJobs: false, force: false },
      health: 'degraded',
    }),
  },
};

export const Stopped: Story = {
  args: {
    node: storyNode({
      lifecycle: 'stopped',
      orchestration: 'down',
      health: 'unknown',
      lastSeenAt: undefined,
    }),
  },
};

export const ErrorState: Story = {
  args: {
    node: storyNode({
      lifecycle: 'stopped',
      orchestration: 'down',
      health: 'critical',
    }),
  },
};

export const WithMetrics: Story = {
  name: 'With metrics sparkline',
  args: { metricsData: makeSineMetrics() },
};

export const NoMetrics: Story = {
  name: 'Metrics unavailable',
  args: { metricsData: [] },
};

export const Loading: Story = {
  name: 'Loading (skeleton)',
  args: { simulateLoadingMs: 99999 },
};

export const NotFound: Story = {
  name: 'Node not found',
  args: { node: null },
};

export const FullyLoaded: Story = {
  name: 'All fields populated',
  args: {
    node: storyNode({
      lifecycle: 'active',
      orchestration: 'ready',
      eligibility: 'eligible',
      health: 'healthy',
      provider: 'aws',
      cluster: 'cluster-prod-a',
      ip: '10.0.1.42',
      owner: 'platform-team',
      tags: ['production', 'gpu', 'critical'],
      cpuUtilPct: 72,
      memUtilPct: 88,
    }),
    metricsData: makeSineMetrics(),
  },
};

export const GCPNode: Story = {
  name: 'GCP node',
  args: {
    node: storyNode({
      provider: 'gcp',
      region: 'eu-west-1',
      kind: 'highmem-8',
      cpuCores: 8,
      memoryGb: 64,
      cluster: 'gke-prod-eu',
      tags: ['staging'],
    }),
  },
};
