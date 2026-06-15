import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DatasourceSelector, type DatasourceItem } from './datasource-selector';

const meta: Meta<typeof DatasourceSelector> = {
  title: 'Design System/AI/Datasource Selector',
  component: DatasourceSelector,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="bg-background p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DatasourceSelector>;

const NOW = new Date('2026-04-10T10:00:00.000Z');

const BASE_DATASOURCES: DatasourceItem[] = [
  {
    id: 'ds-1',
    name: 'PostgreSQL Database',
    slug: 'postgres-db',
    datasource_provider: 'postgresql',
    updatedAt: new Date(NOW.getTime() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'ds-2',
    name: 'MySQL Database',
    slug: 'mysql-db',
    datasource_provider: 'mysql',
    updatedAt: new Date(NOW.getTime() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'ds-3',
    name: 'SQLite Database',
    slug: 'sqlite-db',
    datasource_provider: 'sqlite',
    updatedAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
  },
  {
    id: 'ds-4',
    name: 'MongoDB Database',
    slug: 'mongodb-db',
    datasource_provider: 'mongodb',
    updatedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'ds-5',
    name: 'Redis Cache',
    slug: 'redis-cache',
    datasource_provider: 'redis',
    updatedAt: new Date(NOW.getTime() - 12 * 60 * 60 * 1000),
  },
  {
    id: 'ds-6',
    name: 'Elasticsearch',
    slug: 'elasticsearch',
    datasource_provider: 'elasticsearch',
    updatedAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
  },
  {
    id: 'ds-7',
    name: 'DuckDB Database',
    slug: 'duckdb-db',
    datasource_provider: 'duckdb',
    updatedAt: new Date(NOW.getTime() - 6 * 60 * 60 * 1000),
  },
  {
    id: 'ds-8',
    name: 'Neon Database',
    slug: 'neon-db',
    datasource_provider: 'neon',
    updatedAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000),
  },
  {
    id: 'ds-9',
    name: 'Supabase Database',
    slug: 'supabase-db',
    datasource_provider: 'supabase',
    updatedAt: new Date(NOW.getTime() - 7 * 60 * 60 * 1000),
  },
  {
    id: 'ds-10',
    name: 'PGLite Database',
    slug: 'pglite-db',
    datasource_provider: 'pglite',
    updatedAt: new Date(NOW.getTime() - 72 * 60 * 60 * 1000),
  },
];

const PLUGIN_LOGO_MAP = new Map<string, string>([
  ['postgresql', '/images/datasources/postgresql_icon.png'],
  ['mysql', '/images/datasources/mysql_icon.png'],
  ['sqlite', '/images/datasources/sqlite_icon.png'],
  ['mongodb', '/images/datasources/mongodb_icon.png'],
  ['redis', '/images/datasources/redis_icon.png'],
  ['elasticsearch', '/images/datasources/elasticsearch_icon.png'],
  ['duckdb', '/images/datasources/duckdb_icon.png'],
  ['neon', '/images/datasources/neon_icon.png'],
  ['supabase', '/images/datasources/supabase_icon.png'],
  ['pglite', '/images/datasources/pglite_icon.png'],
]);

type StoryHarnessProps = Omit<
  React.ComponentProps<typeof DatasourceSelector>,
  'selectedDatasources' | 'onSelectionChange'
> & {
  initialSelected?: string[];
};

function StoryHarness({
  initialSelected = [],
  datasources,
  ...props
}: StoryHarnessProps) {
  const [selected, setSelected] = React.useState<string[]>(initialSelected);

  const selectedNames = React.useMemo(() => {
    const byId = new Map(datasources.map((d) => [d.id, d.name] as const));
    return selected.map((id) => byId.get(id) ?? id);
  }, [datasources, selected]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <DatasourceSelector
          {...props}
          selectedDatasources={selected}
          onSelectionChange={setSelected}
          datasources={datasources}
        />
        <div className="text-muted-foreground text-xs font-medium">
          {selected.length === 0 ? 'None' : selectedNames.join(', ')}
        </div>
      </div>
      <div className="text-muted-foreground text-[11px]">
        Selected: {selected.length}
      </div>
    </div>
  );
}

const BASE_ARGS: Omit<StoryHarnessProps, 'initialSelected'> = {
  datasources: BASE_DATASOURCES,
  pluginLogoMap: PLUGIN_LOGO_MAP,
};

export const Empty: Story = {
  name: 'Empty (no selection)',
  render: () => <StoryHarness {...BASE_ARGS} />,
};

export const SingleSelected: Story = {
  name: 'Single selected',
  render: () => <StoryHarness {...BASE_ARGS} initialSelected={['ds-1']} />,
};

export const MultipleSelected: Story = {
  name: 'Multiple selected',
  render: () => (
    <StoryHarness {...BASE_ARGS} initialSelected={['ds-1', 'ds-2', 'ds-4']} />
  ),
};

export const WithSearchPlaceholder: Story = {
  name: 'With search placeholder',
  render: () => (
    <StoryHarness
      {...BASE_ARGS}
      searchPlaceholder="Type to search datasources…"
    />
  ),
};

export const BadgeVariant: Story = {
  name: 'Badge variant',
  render: () => <StoryHarness {...BASE_ARGS} variant="badge" />,
};

export const ReadOnlyEmpty: Story = {
  name: 'Read-only (empty)',
  render: () => <StoryHarness {...BASE_ARGS} readOnly />,
};

export const ReadOnlySingle: Story = {
  name: 'Read-only (single)',
  render: () => (
    <StoryHarness {...BASE_ARGS} readOnly initialSelected={['ds-1']} />
  ),
};

export const Loading: Story = {
  render: () => (
    <StoryHarness
      datasources={[]}
      pluginLogoMap={new Map()}
      isLoading
      initialSelected={[]}
    />
  ),
};

const PAGINATION_DATASOURCES: DatasourceItem[] = (() => {
  const providers = [
    'postgresql',
    'mysql',
    'sqlite',
    'mongodb',
    'redis',
    'elasticsearch',
    'duckdb',
    'neon',
    'supabase',
    'pglite',
  ];

  return Array.from({ length: 25 }, (_, i) => {
    const provider = providers[i % providers.length]!;
    return {
      id: `ds-many-${i + 1}`,
      name: `Datasource ${i + 1}`,
      slug: `datasource-${i + 1}`,
      datasource_provider: provider,
      updatedAt: new Date(NOW.getTime() - i * 60 * 1000),
    };
  });
})();

export const Pagination: Story = {
  name: 'Pagination (25 datasources)',
  render: () => (
    <StoryHarness
      datasources={PAGINATION_DATASOURCES}
      pluginLogoMap={PLUGIN_LOGO_MAP}
      initialSelected={[]}
    />
  ),
};
