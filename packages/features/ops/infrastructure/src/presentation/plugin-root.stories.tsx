import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
import type {
  BulkResult,
  ListNodesInput,
  ListNodesRepositoryResult,
} from '@qlm/domain/usecases';
import { ShellAppProvider } from '@qlm/shell-runtime';

import { ListPage } from './components/list-page';
import { withNodesRouter } from './storybook-router';

function seedNodes(projectId: string): Node[] {
  const now = new Date();
  const iso = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const regions: Node['region'][] = [
    'us-east-1',
    'us-west-2',
    'eu-west-1',
    'eu-central-1',
    'ap-southeast-1',
  ];
  const kinds: Node['kind'][] = [
    'standard-2',
    'standard-4',
    'standard-8',
    'highmem-4',
    'highmem-8',
    'highcpu-8',
  ];
  type SeedKind = 'running' | 'running' | 'draining' | 'stopped' | 'error';
  const seeds: SeedKind[] = [
    'running',
    'running',
    'draining',
    'stopped',
    'error',
  ];

  return Array.from({ length: 73 }).map((_, i): Node => {
    const kind = kinds[i % kinds.length]!;
    const cpuCores = Number(kind.split('-')[1]) || 2;
    const memoryGb = kind.startsWith('highmem-')
      ? cpuCores * 8
      : kind.startsWith('highcpu-')
        ? cpuCores * 2
        : cpuCores * 4;
    const seed = seeds[i % seeds.length]!;
    const lifecycle: NodeLifecycleState =
      seed === 'stopped' || seed === 'error' ? 'stopped' : 'active';
    const orchestration =
      seed === 'stopped' || seed === 'error' ? 'down' : 'ready';
    const eligibility: NodeEligibility =
      seed === 'draining' ? 'ineligible' : 'eligible';
    const drain: NodeDrain | undefined =
      seed === 'draining'
        ? {
            active: true,
            ignoreSystemJobs: false,
            force: false,
            startedAt: iso(0),
          }
        : undefined;
    const health =
      seed === 'error'
        ? 'critical'
        : seed === 'draining' || seed === 'stopped'
          ? 'unknown'
          : 'healthy';
    return {
      id: `node_${projectId}_${String(i + 1).padStart(3, '0')}`,
      projectId,
      name: `worker-${String(i + 1).padStart(3, '0')}`,
      kind,
      region: regions[i % regions.length]!,
      cpuCores,
      memoryGb,
      tags: i % 4 === 0 ? ['prod'] : i % 4 === 1 ? ['staging'] : [],
      version: 1,
      lifecycle,
      orchestration,
      eligibility,
      drain,
      health,
      createdAt: iso(90 - i),
      updatedAt: iso(i % 10),
    };
  });
}

class InMemoryNodeRepository extends INodeRepository {
  constructor(private data: Node[]) {
    super();
  }

  async findAll() {
    return this.data;
  }

  async findById(id: string) {
    return this.data.find((n) => n.id === id) ?? null;
  }

  async findBySlug() {
    return null;
  }

  async findByOrganizationId(
    organizationId: string,
    _input?: Omit<ListNodesInput, 'projectId'>,
  ): Promise<ListNodesRepositoryResult> {
    const items = this.data.filter((n) => n.projectId === organizationId);
    return {
      items,
      total: items.length,
      nextCursor: null,
      facets: { lifecycle: {}, region: {}, provider: {} },
    };
  }

  async create(entity: Node) {
    this.data = [entity, ...this.data];
    return entity;
  }

  async update(entity: Node) {
    this.data = this.data.map((n) => (n.id === entity.id ? entity : n));
    return entity;
  }

  async delete(id: string) {
    const before = this.data.length;
    this.data = this.data.filter((n) => n.id !== id);
    return this.data.length !== before;
  }

  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const set = new Set(ids);
    this.data = this.data.filter((n) => !set.has(n.id));
    return { succeeded: [...set], failed: [] };
  }

  async setLifecycle(
    id: string,
    lifecycle: NodeLifecycleState,
    _expectedVersion: number,
  ): Promise<Node> {
    return this.patch(id, { lifecycle });
  }

  async setEligibility(
    id: string,
    eligibility: NodeEligibility,
    _expectedVersion: number,
  ): Promise<Node> {
    return this.patch(id, { eligibility });
  }

  async setDrain(
    id: string,
    drain: NodeDrain | null,
    _expectedVersion: number,
  ): Promise<Node> {
    return this.patch(id, { drain: drain ?? undefined });
  }

  private patch(id: string, partial: Partial<Node>): Node {
    const existing = this.data.find((n) => n.id === id);
    if (!existing) throw new Error('not found');
    const next: Node = {
      ...existing,
      ...partial,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.data = this.data.map((n) => (n.id === id ? next : n));
    return next;
  }

  async getMetrics(_id: string, _range: MetricsRange): Promise<MetricsPoint[]> {
    return [];
  }
}

function PluginRootFrame({ shellHeight }: { shellHeight: number }) {
  const projectId = 'prj_storybook';
  const queryClient = new QueryClient();
  const repo = new InMemoryNodeRepository(seedNodes(projectId));

  // Storybook-only: everything except `node` + `projectId` is stubbed since
  // the nodes feature doesn't consume them. Cast through unknown — this is
  // test scaffolding, not production code.
  const repositories = { node: repo } as unknown as Repositories;
  const value = {
    projectId,
    projectSlug: 'storybook',
    orgSlug: 'storybook-org',
      organizationId: 'org-storybook',
    currentUserId: 'user_storybook',
    repositories,
    runQuery: (() => Promise.reject(new Error('not implemented'))) as never,
    testConnection: (() => Promise.reject(new Error('not implemented'))) as never,
    getDatasourceMetadata: (() =>
      Promise.reject(new Error('not implemented'))) as never,
  };

  return (
    <div
      className="bg-background flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border"
      style={{ height: shellHeight }}
    >
      <QueryClientProvider client={queryClient}>
        <ShellAppProvider value={value}>
          <ListPage projectId={projectId} />
        </ShellAppProvider>
      </QueryClientProvider>
    </div>
  );
}

const meta = {
  title: 'Features/Nodes/Plugin root',
  component: PluginRootFrame,
  decorators: [withNodesRouter],
  tags: ['autodocs'],
  args: {
    shellHeight: 720,
  },
  argTypes: {
    shellHeight: { control: { type: 'range', min: 400, max: 900, step: 20 } },
  },
} satisfies Meta<typeof PluginRootFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
