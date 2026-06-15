import type { Meta, StoryObj } from '@storybook/react';

import { withUserTokensProviders } from '../story-helpers';
import { StatusChip } from './status-chip';

const meta: Meta<typeof StatusChip> = {
  title: 'UserTokens/Primitives/StatusChip',
  component: StatusChip,
  decorators: [withUserTokensProviders],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof StatusChip>;

export const Active: Story = { args: { status: 'active' } };
export const Expired: Story = { args: { status: 'expired' } };
export const Revoked: Story = { args: { status: 'revoked' } };

/** Visual side-by-side comparison of all 3 statuses. */
export const AllThree: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <StatusChip status="active" />
      <StatusChip status="expired" />
      <StatusChip status="revoked" />
    </div>
  ),
};
