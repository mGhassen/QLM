import { useEffect, useReducer } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  INITIAL_PANE_STATE,
  paneReducer,
  type PaneState,
} from './tokens-settings-pane-state';
import { TokensSettingsPane } from './tokens-settings-pane';
import { withUserTokensProviders } from './story-helpers';

const meta: Meta<typeof TokensSettingsPane> = {
  title: 'UserTokens/TokensSettingsPane',
  component: TokensSettingsPane,
  decorators: [withUserTokensProviders],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof TokensSettingsPane>;

export const Initial: Story = {
  render: () => <TokensSettingsPane />,
};

/**
 * Storybook helper that drives the reducer to a specific initial state by
 * dispatching an action on mount. Useful for previewing non-`list` states
 * without re-implementing the pane wiring.
 */
function PaneAtInitialState({ initial }: { initial: PaneState }) {
  // Run the real reducer once to get the desired starting state, then let
  // the component own its own reducer from there.
  const [, dispatch] = useReducer(paneReducer, INITIAL_PANE_STATE);
  useEffect(() => {
    if (initial.kind === 'create') dispatch({ type: 'open-create' });
    if (initial.kind === 'revoke-confirm')
      dispatch({ type: 'open-revoke-confirm', token: initial.token });
    // 'reveal' would require a 'created' dispatch from 'create'; the reducer
    // forbids jumping straight there. The `OpenedReveal` story therefore
    // dispatches the two-step path.
    if (initial.kind === 'reveal') {
      dispatch({ type: 'open-create' });
      dispatch({
        type: 'created',
        output: { row: initial.row, rawJwt: initial.rawJwt },
      });
    }
  }, [initial]);
  return <TokensSettingsPane />;
}

export const OpenedCreate: Story = {
  render: () => <PaneAtInitialState initial={{ kind: 'create' }} />,
};

export const OpenedReveal: Story = {
  render: () => (
    <PaneAtInitialState
      initial={{
        kind: 'reveal',
        row: {
          id: '11111111-1111-4111-9111-111111111111',
          account_id: '00000000-0000-4000-8000-000000000001',
          token_name: 'Demo token',
          scopes: ['read'],
          expires_at: 9_999_999_999,
          revoked: false,
          revoked_at: null,
          created_at: '2026-04-15T00:00:00.000Z',
          updated_at: '2026-04-15T00:00:00.000Z',
          created_by: '00000000-0000-4000-8000-000000000001',
          updated_by: '00000000-0000-4000-8000-000000000001',
        },
        rawJwt: 'demo.jwt.signature.value',
      }}
    />
  ),
};

export const OpenedRevokeConfirm: Story = {
  render: () => (
    <PaneAtInitialState
      initial={{
        kind: 'revoke-confirm',
        token: {
          id: '11111111-1111-4111-9111-111111111111',
          account_id: '00000000-0000-4000-8000-000000000001',
          token_name: 'CI deploy token',
          scopes: ['read', 'write'],
          expires_at: 9_999_999_999,
          revoked: false,
          revoked_at: null,
          created_at: '2026-04-15T00:00:00.000Z',
          updated_at: '2026-04-15T00:00:00.000Z',
          created_by: '00000000-0000-4000-8000-000000000001',
          updated_by: '00000000-0000-4000-8000-000000000001',
        },
      }}
    />
  ),
};
