import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Database } from '@qlm/domain/entities';
import { IDatabaseRepository, type Repositories } from '@qlm/domain/repositories';
import { ShellAppProvider } from '@qlm/shell-runtime';

import { STORY_DATABASES } from '../story-fixtures';
import { DatabaseListPage } from './list-page';

class InMemoryDatabaseRepository extends IDatabaseRepository {
  constructor(private rows: Database[]) { super(); }
  async findAll() { return this.rows; }
  async findByAccountId() { return this.rows; }
  async findById(id: string) { return this.rows.find((r) => r.id === id) ?? null; }
  async create(e: Database) { return e; }
  async update(e: Database) { return e; }
  async delete() { return undefined; }
}

function makeShell(databases: Database[]): {
  value: Parameters<typeof ShellAppProvider>[0]['value'];
  queryClient: QueryClient;
} {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repo = new InMemoryDatabaseRepository(databases);
  const repositories = { database: repo } as unknown as Repositories;
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

function Frame({
  databases,
  height = 680,
  displayMode,
}: {
  databases: Database[];
  height?: number;
  displayMode?: 'list' | 'grid';
}) {
  if (displayMode) {
    // Pre-seed the versioned preference so the list page opens in the desired mode.
    localStorage.setItem(
      'qlm:databases:displayMode',
      JSON.stringify({ v: 1, data: displayMode }),
    );
  }
  const { queryClient, value } = makeShell(databases);
  return (
    <div
      className="bg-background flex flex-col overflow-hidden rounded-lg border border-border w-full max-w-5xl"
      style={{ height }}
    >
      <QueryClientProvider client={queryClient}>
        <ShellAppProvider value={value}>
          <DatabaseListPage />
        </ShellAppProvider>
      </QueryClientProvider>
    </div>
  );
}

const meta = {
  title: 'Features/Databases/ListPage',
  component: Frame,
  tags: ['autodocs'],
  args: { databases: STORY_DATABASES, height: 680 },
  argTypes: {
    height: { control: { type: 'range', min: 400, max: 900, step: 20 } },
    displayMode: { control: { type: 'select' }, options: ['list', 'grid'] },
  },
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

export const GridMode: Story = {
  name: 'Grid mode (3 cols)',
  args: { databases: STORY_DATABASES, height: 780, displayMode: 'grid' },
};

export const GridModeNarrow: Story = {
  name: 'Grid mode (1 col)',
  decorators: [
    (Story) => {
      localStorage.setItem(
        'qlm:databases:gridCols',
        JSON.stringify({ v: 1, data: 1 }),
      );
      return <Story />;
    },
  ],
  args: { databases: STORY_DATABASES, height: 780, displayMode: 'grid' },
};

export const Empty: Story = { args: { databases: [] } };

export const SingleRow: Story = {
  args: { databases: [STORY_DATABASES[0]!] },
};

export const AllStatuses: Story = {
  args: { databases: STORY_DATABASES },
};
