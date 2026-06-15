import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import type { UserToken, UserTokenScope } from '@guepard/domain/entities';

import { TokenRow } from '../src/components/token-row';
import { storybookI18n } from '../src/components/story-helpers';

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
    // Picked far enough from the `revoked_at` used in the revoked-token
    // test (2026-04-14) that the locale-default `PP` formatter can't
    // collapse both into the same display string in any reasonable
    // timezone — otherwise `getByText(/Apr 14, 2026/)` matches twice.
    created_at: '2026-01-15T12:00:00.000Z',
    updated_at: '2026-01-15T12:00:00.000Z',
    created_by: ACCOUNT_ID,
    updated_by: ACCOUNT_ID,
    ...overrides,
  };
}

function renderRow(token: UserToken, onRevokeClick = vi.fn()) {
  return render(
    <I18nextProvider i18n={storybookI18n}>
      <table>
        <tbody>
          <TokenRow token={token} onRevokeClick={onRevokeClick} />
        </tbody>
      </table>
    </I18nextProvider>,
  );
}

describe('TokenRow', () => {
  it('renders all 7 cells for an active token and the revoke button is enabled', () => {
    renderRow(makeToken({ scopes: ['read', 'write', 'admin'] }));
    expect(screen.getByText('CI deploy token')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Write')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    const revokeButton = screen.getByRole('button', { name: 'Revoke token' });
    expect(revokeButton).toBeEnabled();
  });

  it('disables the revoke button for an expired token', () => {
    renderRow(makeToken({ expires_at: NOW_SECONDS - 86_400 }));
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke token' })).toBeDisabled();
  });

  it('disables the revoke button and shows the revoked-at date for a revoked token', () => {
    renderRow(
      makeToken({
        revoked: true,
        revoked_at: '2026-04-14T12:00:00.000Z',
      }),
    );
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke token' })).toBeDisabled();
    // 'Apr 14, 2026' is the locale-default `PP` format from date-fns.
    expect(screen.getByText(/Apr 14, 2026/)).toBeInTheDocument();
  });

  it('calls onRevokeClick exactly once with the token when the button is clicked', () => {
    const onRevokeClick = vi.fn();
    const token = makeToken();
    renderRow(token, onRevokeClick);
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }));
    expect(onRevokeClick).toHaveBeenCalledTimes(1);
    expect(onRevokeClick).toHaveBeenCalledWith(token);
  });

  it('renders scope pills in canonical read/write/admin order regardless of DB array order', () => {
    renderRow(
      makeToken({ scopes: ['admin', 'read', 'write'] as UserTokenScope[] }),
    );
    const pillTexts = ['Read', 'Write', 'Admin'].map(
      (label) => screen.getByText(label).textContent,
    );
    expect(pillTexts).toEqual(['Read', 'Write', 'Admin']);
  });

  it('shows N/A in the Revoked At cell for an active (non-revoked) token', () => {
    renderRow(makeToken());
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
