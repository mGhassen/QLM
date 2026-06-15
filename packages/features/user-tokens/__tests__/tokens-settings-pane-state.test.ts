import { describe, expect, it } from 'vitest';

import type { UserToken } from '@guepard/domain/entities';

import {
  INITIAL_PANE_STATE,
  paneReducer,
  type PaneState,
} from '../src/components/tokens-settings-pane-state';

const TOKEN: UserToken = {
  id: '11111111-1111-4111-9111-111111111111',
  account_id: '00000000-0000-4000-8000-000000000001',
  token_name: 't',
  scopes: ['read'],
  expires_at: 9_999_999_999,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-15T00:00:00.000Z',
  updated_at: '2026-04-15T00:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000001',
  updated_by: '00000000-0000-4000-8000-000000000001',
};

describe('paneReducer', () => {
  it('starts in list', () => {
    expect(INITIAL_PANE_STATE).toEqual({ kind: 'list' });
  });

  describe('legal transitions', () => {
    it('list → create on open-create', () => {
      const next = paneReducer({ kind: 'list' }, { type: 'open-create' });
      expect(next).toEqual({ kind: 'create' });
    });

    it('create → list on cancel-create', () => {
      const next = paneReducer({ kind: 'create' }, { type: 'cancel-create' });
      expect(next).toEqual({ kind: 'list' });
    });

    it('create → reveal on created (carries rawJwt)', () => {
      const next = paneReducer(
        { kind: 'create' },
        { type: 'created', output: { row: TOKEN, rawJwt: 'jwt.value' } },
      );
      expect(next).toEqual({
        kind: 'reveal',
        row: TOKEN,
        rawJwt: 'jwt.value',
      });
    });

    it('reveal → list on close-reveal (drops rawJwt)', () => {
      const next = paneReducer(
        { kind: 'reveal', row: TOKEN, rawJwt: 'jwt.value' },
        { type: 'close-reveal' },
      );
      expect(next).toEqual({ kind: 'list' });
      // Sanity-check: rawJwt must NOT be on the next state.
      expect(next).not.toHaveProperty('rawJwt');
    });

    it('list → revoke-confirm on open-revoke-confirm', () => {
      const next = paneReducer(
        { kind: 'list' },
        { type: 'open-revoke-confirm', token: TOKEN },
      );
      expect(next).toEqual({ kind: 'revoke-confirm', token: TOKEN });
    });

    it('revoke-confirm → list on cancel-revoke-confirm', () => {
      const next = paneReducer(
        { kind: 'revoke-confirm', token: TOKEN },
        { type: 'cancel-revoke-confirm' },
      );
      expect(next).toEqual({ kind: 'list' });
    });

    it('revoke-confirm → list on revoked', () => {
      const next = paneReducer(
        { kind: 'revoke-confirm', token: TOKEN },
        { type: 'revoked', row: { ...TOKEN, revoked: true } },
      );
      expect(next).toEqual({ kind: 'list' });
    });
  });

  describe('illegal transitions throw', () => {
    const cases: Array<{
      from: PaneState;
      action: Parameters<typeof paneReducer>[1];
      label: string;
    }> = [
      {
        from: { kind: 'list' },
        action: { type: 'cancel-create' },
        label: 'list × cancel-create',
      },
      {
        from: { kind: 'list' },
        action: { type: 'close-reveal' },
        label: 'list × close-reveal',
      },
      {
        from: { kind: 'create' },
        action: { type: 'open-create' },
        label: 'create × open-create',
      },
      {
        from: { kind: 'create' },
        action: { type: 'open-revoke-confirm', token: TOKEN },
        label: 'create × open-revoke-confirm',
      },
      {
        from: { kind: 'reveal', row: TOKEN, rawJwt: 'x' },
        action: { type: 'open-create' },
        label: 'reveal × open-create',
      },
      {
        from: { kind: 'revoke-confirm', token: TOKEN },
        action: { type: 'open-create' },
        label: 'revoke-confirm × open-create',
      },
    ];

    it.each(cases)('throws on $label', ({ from, action }) => {
      expect(() => paneReducer(from, action)).toThrow(
        /Illegal pane transition/,
      );
    });
  });
});
