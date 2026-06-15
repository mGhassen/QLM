import type { UserToken } from '@guepard/domain/entities';
import type { CreateUserTokenOutput } from '@guepard/domain/usecases';

/**
 * Discriminated union of pane states per RFC 0009 spec §3.2.6.
 *
 * `rawJwt` lives ONLY in the `reveal` state — the reducer drops it on every
 * other transition. Closing the outer Settings dialog while `reveal` is
 * active also drops it (the Settings shell unmounts the pane on close,
 * which destroys the reducer state).
 */
export type PaneState =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'reveal'; row: UserToken; rawJwt: string }
  | { kind: 'revoke-confirm'; token: UserToken };

export type PaneAction =
  | { type: 'open-create' }
  | { type: 'cancel-create' }
  | { type: 'created'; output: CreateUserTokenOutput }
  | { type: 'close-reveal' }
  | { type: 'open-revoke-confirm'; token: UserToken }
  | { type: 'cancel-revoke-confirm' }
  | { type: 'revoked'; row: UserToken };

export const INITIAL_PANE_STATE: PaneState = { kind: 'list' };

/**
 * Strict pane-state reducer. Throws on illegal transitions instead of
 * returning the previous state — phase 1 chooses loud failure so a bad
 * dispatch in a child component (a regression vector) gets caught in
 * Storybook + tests, not silently absorbed.
 *
 * Legal transitions (per spec §3.2.6):
 *   list           → create | revoke-confirm
 *   create         → list (cancel) | reveal (created)
 *   reveal         → list (close)
 *   revoke-confirm → list (cancel | revoked)
 */
export function paneReducer(state: PaneState, action: PaneAction): PaneState {
  switch (state.kind) {
    case 'list':
      if (action.type === 'open-create') return { kind: 'create' };
      if (action.type === 'open-revoke-confirm')
        return { kind: 'revoke-confirm', token: action.token };
      break;
    case 'create':
      if (action.type === 'cancel-create') return { kind: 'list' };
      if (action.type === 'created')
        return {
          kind: 'reveal',
          row: action.output.row,
          rawJwt: action.output.rawJwt,
        };
      break;
    case 'reveal':
      if (action.type === 'close-reveal') return { kind: 'list' };
      break;
    case 'revoke-confirm':
      if (action.type === 'cancel-revoke-confirm') return { kind: 'list' };
      if (action.type === 'revoked') return { kind: 'list' };
      break;
  }
  throw new Error(
    `Illegal pane transition: ${action.type} from kind=${state.kind}`,
  );
}
