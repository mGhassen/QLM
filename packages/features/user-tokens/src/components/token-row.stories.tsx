import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import type { UserToken, UserTokenScope } from '@qlm/domain/entities';

import { withUserTokensProviders } from './story-helpers';
import { TokenRow } from './token-row';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const NOW_SECONDS = Math.floor(Date.now() / 1000);

function makeToken(overrides: Partial<UserToken> = {}): UserToken {
  return {
    id: '11111111-1111-4111-9111-111111111111',
    account_id: ACCOUNT_ID,
    token_name: 'CI deploy token',
    scopes: ['read', 'write'] as UserTokenScope[],
    expires_at: NOW_SECONDS + 30 * 86_400,
    revoked: false,
    revoked_at: null,
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-15T00:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
    ...overrides,
  };
}

/**
 * `<TokenRow>` renders a `<tr>`, so every story wraps it in a
 * `<table><tbody>` shell to keep browser table-rendering happy.
 */
function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-[900px] border-collapse">
      <tbody>{children}</tbody>
    </table>
  );
}

const meta: Meta<typeof TokenRow> = {
  title: 'UserTokens/TokenRow',
  component: TokenRow,
  decorators: [withUserTokensProviders],
  parameters: { layout: 'padded' },
  args: { onRevokeClick: fn() },
};

export default meta;
type Story = StoryObj<typeof TokenRow>;

export const ActiveAllScopes: Story = {
  render: (args) => (
    <TableShell>
      <TokenRow
        {...args}
        token={makeToken({ scopes: ['read', 'write', 'admin'] })}
      />
    </TableShell>
  ),
};

export const ActiveReadOnly: Story = {
  render: (args) => (
    <TableShell>
      <TokenRow {...args} token={makeToken({ scopes: ['read'] })} />
    </TableShell>
  ),
};

export const ActiveWriteAndAdmin: Story = {
  render: (args) => (
    <TableShell>
      <TokenRow {...args} token={makeToken({ scopes: ['write', 'admin'] })} />
    </TableShell>
  ),
};

export const Expired: Story = {
  render: (args) => (
    <TableShell>
      <TokenRow
        {...args}
        token={makeToken({
          token_name: 'Expired migration token',
          expires_at: NOW_SECONDS - 86_400,
          scopes: ['read'],
        })}
      />
    </TableShell>
  ),
};

export const Revoked: Story = {
  render: (args) => (
    <TableShell>
      <TokenRow
        {...args}
        token={makeToken({
          token_name: 'Old CI token (revoked)',
          revoked: true,
          revoked_at: '2026-04-14T12:00:00.000Z',
          scopes: ['read', 'write'],
        })}
      />
    </TableShell>
  ),
};
