import type { Meta, StoryObj } from '@storybook/react-vite';
import { DbStatusBadge } from './db-status-badge';

const meta = {
  title: 'Features/Databases/DbStatusBadge',
  component: DbStatusBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DbStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Init: Story       = { args: { status: 'init' } };
export const Pending: Story    = { args: { status: 'pending' } };
export const InProgress: Story = { args: { status: 'in_progress' } };
export const Created: Story    = { args: { status: 'created' } };
export const Error: Story      = { args: { status: 'error' } };
export const Deleted: Story    = { args: { status: 'deleted' } };

export const AllStatuses: Story = {
  args: { status: 'created' },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(['init', 'pending', 'in_progress', 'created', 'error', 'deleted'] as const).map(
        (s) => <DbStatusBadge key={s} status={s} />,
      )}
    </div>
  ),
};
