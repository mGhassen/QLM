import type { Meta, StoryObj } from '@storybook/react-vite';
import { DbProviderBadge } from './db-provider-badge';

const meta = {
  title: 'Features/Databases/DbProviderBadge',
  component: DbProviderBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DbProviderBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Postgres: Story = { args: { provider: 'postgres' } };
export const MySQL: Story    = { args: { provider: 'mysql' } };
export const Redis: Story    = { args: { provider: 'redis' } };
export const MongoDB: Story  = { args: { provider: 'mongodb' } };
export const Unknown: Story  = { args: { provider: 'oracle' } };

export const AllProviders: Story = {
  args: { provider: 'postgres' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['postgres', 'mysql', 'redis', 'mongodb', 'oracle'] as const).map(
        (p) => <DbProviderBadge key={p} provider={p} />,
      )}
    </div>
  ),
};
