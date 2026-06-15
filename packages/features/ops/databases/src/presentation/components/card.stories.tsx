import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import type { DatabaseOutput } from '@guepard/domain/usecases';

import { storyDatabase } from '../story-fixtures';
import { DatabaseCard } from './card';

const meta = {
  title: 'Features/Databases/Components/DatabaseCard',
  component: DatabaseCard,
  tags: ['autodocs'],
  args: {
    database: storyDatabase(),
    selectionMode: false,
    selected: false,
    rowActions: [],
    onViewDetails: fn(),
    onSelect: fn(),
  },
  argTypes: {
    database: { control: 'object' },
    selectionMode: { control: 'boolean' },
    selected: { control: 'boolean' },
    rowActions: { table: { disable: true } },
    onViewDetails: { table: { disable: true } },
    onSelect: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 220 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatabaseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: { database: storyDatabase({ status: 'created' }) },
};

export const Pending: Story = {
  args: { database: storyDatabase({ status: 'pending', compute: undefined }) },
};

export const Deploying: Story = {
  args: { database: storyDatabase({ status: 'in_progress', compute: undefined }) },
};

export const Error: Story = {
  args: { database: storyDatabase({ status: 'error', compute: undefined }) },
};

export const Init: Story = {
  args: { database: storyDatabase({ status: 'init', compute: undefined }) },
};

export const Selected: Story = {
  args: {
    database: storyDatabase({ status: 'created' }),
    selected: true,
  },
};

export const SelectionMode: Story = {
  name: 'Selection mode (unchecked)',
  args: {
    database: storyDatabase({ status: 'created' }),
    selectionMode: true,
    selected: false,
  },
};

export const SelectionModeChecked: Story = {
  name: 'Selection mode (checked)',
  args: {
    database: storyDatabase({ status: 'created' }),
    selectionMode: true,
    selected: true,
  },
};

export const MySQL: Story = {
  name: 'MySQL provider',
  args: {
    database: storyDatabase({
      provider: 'mysql',
      version: '8.0',
      fqdn: 'app-mysql.db.guepard.internal',
      port: 3306,
    }),
  },
};

export const Redis: Story = {
  name: 'Redis provider',
  args: {
    database: storyDatabase({
      name: 'cache-redis',
      provider: 'redis',
      version: '7',
      fqdn: 'cache-redis.db.guepard.internal',
      port: 6379,
      compute: undefined,
    }),
  },
};

export const MongoDB: Story = {
  name: 'MongoDB provider',
  args: {
    database: storyDatabase({
      name: 'documents-mongo',
      provider: 'mongodb',
      version: '7.0',
      fqdn: 'documents-mongo.db.guepard.internal',
      port: 27017,
      compute: undefined,
    }),
  },
};

export const NoCompute: Story = {
  name: 'No compute (unprovisioned)',
  args: {
    database: storyDatabase({ status: 'pending', compute: undefined }),
  },
};

export const LongName: Story = {
  name: 'Long database name (truncation)',
  args: {
    database: storyDatabase({ name: 'analytics-production-primary-replica-v2' }),
  },
};

export const AllStatuses: Story = {
  name: 'All statuses grid',
  render: (args) => {
    const statuses: DatabaseOutput['status'][] = [
      'created',
      'pending',
      'in_progress',
      'error',
      'init',
      'deleted',
    ];
    return (
      <div className="grid grid-cols-2 gap-3" style={{ width: 680 }}>
        {statuses.map((status) => (
          <div key={status} style={{ height: 200 }}>
            <DatabaseCard
              {...args}
              database={storyDatabase({
                name: `db-${status.replace('_', '-')}`,
                status,
                compute: status === 'created' ? args.database.compute : undefined,
              })}
            />
          </div>
        ))}
      </div>
    );
  },
};

export const AllProviders: Story = {
  name: 'All providers grid',
  render: (args) => {
    const providers: Array<{ provider: DatabaseOutput['provider']; port: number; version: string }> = [
      { provider: 'postgres', port: 5432, version: '15' },
      { provider: 'mysql', port: 3306, version: '8.0' },
      { provider: 'redis', port: 6379, version: '7' },
      { provider: 'mongodb', port: 27017, version: '7.0' },
    ];
    return (
      <div className="grid grid-cols-2 gap-3" style={{ width: 680 }}>
        {providers.map(({ provider, port, version }) => (
          <div key={provider} style={{ height: 200 }}>
            <DatabaseCard
              {...args}
              database={storyDatabase({
                name: `${provider}-primary`,
                provider,
                port,
                version,
                status: 'created',
              })}
            />
          </div>
        ))}
      </div>
    );
  },
};
