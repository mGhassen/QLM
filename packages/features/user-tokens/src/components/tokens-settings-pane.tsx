import { useReducer } from 'react';

import { GenerateTokenForm } from './generate-token-form';
import { RevealTokenView } from './reveal-token-view';
import { RevokeConfirmInline } from './revoke-confirm-inline';
import { TokenListView } from './token-list-view';
import {
  INITIAL_PANE_STATE,
  paneReducer,
  type PaneAction,
  type PaneState,
} from './tokens-settings-pane-state';

/**
 * Top-level component for the Personal Tokens section of the Settings
 * dialog. Owns the pane-state reducer; renders one of four child
 * components based on `state.kind`.
 */
export function TokensSettingsPane() {
  const [state, dispatch] = useReducer(paneReducer, INITIAL_PANE_STATE);
  return <PaneContent state={state} dispatch={dispatch} />;
}

function PaneContent({
  state,
  dispatch,
}: {
  state: PaneState;
  dispatch: React.Dispatch<PaneAction>;
}) {
  switch (state.kind) {
    case 'list':
      return (
        <div data-test="pane-state-list">
          <TokenListView
            onGenerateClick={() => dispatch({ type: 'open-create' })}
            onRevokeClick={(token) =>
              dispatch({ type: 'open-revoke-confirm', token })
            }
          />
        </div>
      );
    case 'create':
      return (
        <div data-test="pane-state-create">
          <GenerateTokenForm
            onCancel={() => dispatch({ type: 'cancel-create' })}
            onCreated={(output) => dispatch({ type: 'created', output })}
          />
        </div>
      );
    case 'reveal':
      return (
        <div data-test="pane-state-reveal">
          <RevealTokenView
            row={state.row}
            rawJwt={state.rawJwt}
            onClose={() => dispatch({ type: 'close-reveal' })}
          />
        </div>
      );
    case 'revoke-confirm':
      return (
        <div data-test="pane-state-revoke-confirm">
          <RevokeConfirmInline
            token={state.token}
            onCancel={() => dispatch({ type: 'cancel-revoke-confirm' })}
            onRevoked={(row) => dispatch({ type: 'revoked', row })}
          />
        </div>
      );
  }
}
