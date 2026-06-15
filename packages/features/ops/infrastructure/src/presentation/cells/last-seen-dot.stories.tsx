import type { Meta, StoryObj } from '@storybook/react-vite';

import { LastSeenDot } from './last-seen-dot';
import { LAST_SEEN } from '../story-fixtures';

const meta = {
  title: 'Features/Nodes/Cells/Last Seen Dot',
  component: LastSeenDot,
  tags: ['autodocs'],
  args: {
    lastSeenAt: LAST_SEEN.fresh,
    showLabel: true,
    showPrefix: false,
  },
  argTypes: {
    lastSeenAt: { control: 'text' },
    showLabel: { control: 'boolean' },
    showPrefix: { control: 'boolean' },
  },
} satisfies Meta<typeof LastSeenDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fresh: Story = {
  name: 'Fresh (<1 min)',
  args: { lastSeenAt: LAST_SEEN.fresh },
};

export const Recent: Story = {
  name: 'Recent (<5 min)',
  args: { lastSeenAt: LAST_SEEN.recent },
};

export const Stale: Story = {
  name: 'Stale (<1 h)',
  args: { lastSeenAt: LAST_SEEN.stale },
};

export const Cold: Story = {
  name: 'Cold (>1 h)',
  args: { lastSeenAt: LAST_SEEN.cold },
};

export const Never: Story = {
  args: { lastSeenAt: undefined },
};

export const WithPrefix: Story = {
  name: 'With prefix label',
  args: { lastSeenAt: LAST_SEEN.stale, showPrefix: true },
};

export const DotOnly: Story = {
  name: 'Dot only (no label)',
  args: { lastSeenAt: LAST_SEEN.fresh, showLabel: false },
};

export const AllBuckets: Story = {
  name: 'All freshness buckets',
  render: () => (
    <div className="flex flex-col gap-3">
      <LastSeenDot lastSeenAt={LAST_SEEN.fresh} showPrefix />
      <LastSeenDot lastSeenAt={LAST_SEEN.recent} showPrefix />
      <LastSeenDot lastSeenAt={LAST_SEEN.stale} showPrefix />
      <LastSeenDot lastSeenAt={LAST_SEEN.cold} showPrefix />
      <LastSeenDot lastSeenAt={LAST_SEEN.never} showPrefix />
    </div>
  ),
};
