import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import type { UserTokenStatus } from '@qlm/domain/entities';

import { withUserTokensProviders } from '../story-helpers';
import { FilterPopover } from './filter-popover';

const STATUS_OPTIONS: ReadonlyArray<{
  value: UserTokenStatus;
  label: string;
}> = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
];

const meta: Meta<typeof FilterPopover<UserTokenStatus>> = {
  title: 'UserTokens/Primitives/FilterPopover',
  component: FilterPopover<UserTokenStatus>,
  decorators: [withUserTokensProviders],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof FilterPopover<UserTokenStatus>>;

function ControlledPopover({ initial }: { initial: UserTokenStatus[] }) {
  const [selected, setSelected] = useState<UserTokenStatus[]>(initial);
  return (
    <FilterPopover
      label="Status"
      options={STATUS_OPTIONS}
      selected={selected}
      onChange={setSelected}
    />
  );
}

/** No selection — no badge count appears next to the label. */
export const Empty: Story = {
  render: () => <ControlledPopover initial={[]} />,
};

/** Two of three selected — badge shows count `2`. */
export const SomeSelected: Story = {
  render: () => <ControlledPopover initial={['active', 'expired']} />,
};
