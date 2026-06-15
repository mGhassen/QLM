import type { Meta, StoryObj } from '@storybook/react-vite';

import { DatabaseDetailPage } from './detail-page';
import { storyDatabase } from '../story-fixtures';

const meta = {
  title: 'Features/Databases/DatabaseDetailPage',
  component: DatabaseDetailPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DatabaseDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCompute: Story = {
  args: { database: storyDatabase() },
};

export const WithBackButton: Story = {
  args: {
    database: storyDatabase(),
    onBack: () => {},
  },
};

export const NoCompute: Story = {
  args: {
    database: storyDatabase({
      provider: 'mysql',
      status: 'pending',
      compute: undefined,
      dbRole: undefined,
    }),
  },
};

export const ErrorStatus: Story = {
  args: {
    database: storyDatabase({ status: 'error', compute: undefined, dbRole: undefined }),
  },
};

export const MongoProvider: Story = {
  args: {
    database: storyDatabase({
      provider: 'mongodb',
      version: '7',
      fqdn: 'app-mongo.db.qlm.internal',
      port: 27017,
    }),
  },
};

export const RedisNoPort: Story = {
  args: {
    database: storyDatabase({
      provider: 'redis',
      version: '7',
      fqdn: 'cache.db.qlm.internal',
      port: undefined,
      compute: undefined,
      dbRole: undefined,
    }),
  },
};
