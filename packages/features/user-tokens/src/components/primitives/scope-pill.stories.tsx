import type { Meta, StoryObj } from '@storybook/react';

import { withUserTokensProviders } from '../story-helpers';
import { ScopePill } from './scope-pill';

const meta: Meta<typeof ScopePill> = {
  title: 'UserTokens/Primitives/ScopePill',
  component: ScopePill,
  decorators: [withUserTokensProviders],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ScopePill>;

export const Read: Story = { args: { scope: 'read' } };
export const Write: Story = { args: { scope: 'write' } };
export const Admin: Story = { args: { scope: 'admin' } };

/**
 * Three pills in the canonical render order — `TokenRow` always sorts to
 * this order regardless of how the DB stores the scopes array.
 */
export const AllThreeInOrder: Story = {
  render: () => (
    <div className="flex items-center gap-1.5">
      <ScopePill scope="read" />
      <ScopePill scope="write" />
      <ScopePill scope="admin" />
    </div>
  ),
};
