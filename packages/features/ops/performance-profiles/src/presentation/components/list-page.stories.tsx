import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { PerformanceProfile } from '@guepard/domain/entities';
import { IPerformanceProfileRepository, type Repositories } from '@guepard/domain/repositories';
import { ShellAppProvider } from '@guepard/shell-runtime';

import { STORY_PROFILES } from '../story-fixtures';
import { PerformanceProfileListPage } from './list-page';

class InMemoryProfileRepository extends IPerformanceProfileRepository {
  constructor(private rows: PerformanceProfile[]) { super(); }
  async findPublicCatalog() { return this.rows.filter((r) => !r.accountId && r.isActive); }
  async findByAccountId() { return this.rows; }
  async findById(id: string) { return this.rows.find((r) => r.id === id) ?? null; }
}

function makeShell(profiles: PerformanceProfile[]): {
  value: Parameters<typeof ShellAppProvider>[0]['value'];
  queryClient: QueryClient;
} {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repo = new InMemoryProfileRepository(profiles);
  const repositories = { performanceProfile: repo } as unknown as Repositories;
  return {
    queryClient,
    value: {
      projectId: 'prj-storybook',
      projectSlug: 'storybook',
      orgSlug: 'storybook-org',
      organizationId: 'org-storybook',
      currentUserId: 'user-storybook',
      repositories,
      runQuery: (() => Promise.reject(new Error('not implemented'))) as never,
      testConnection: (() => Promise.reject(new Error('not implemented'))) as never,
      getDatasourceMetadata: (() => Promise.reject(new Error('not implemented'))) as never,
    },
  };
}

function Frame({ profiles, height = 680 }: { profiles: PerformanceProfile[]; height?: number }) {
  const { queryClient, value } = makeShell(profiles);
  return (
    <div
      className="bg-background flex flex-col overflow-hidden rounded-lg border border-border w-full max-w-5xl"
      style={{ height }}
    >
      <QueryClientProvider client={queryClient}>
        <ShellAppProvider value={value}>
          <PerformanceProfileListPage />
        </ShellAppProvider>
      </QueryClientProvider>
    </div>
  );
}

const meta = {
  title: 'Features/PerformanceProfiles/ListPage',
  component: Frame,
  tags: ['autodocs'],
  args: { profiles: STORY_PROFILES, height: 680 },
  argTypes: {
    height: { control: { type: 'range', min: 400, max: 900, step: 20 } },
  },
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

export const Empty: Story = { args: { profiles: [] } };

export const SingleRow: Story = {
  args: { profiles: [STORY_PROFILES[0]!] },
};

export const WithInactive: Story = {
  name: 'With inactive profile',
  args: { profiles: STORY_PROFILES },
};
