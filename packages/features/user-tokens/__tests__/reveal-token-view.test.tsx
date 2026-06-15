import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';

import type { UserToken } from '@guepard/domain/entities';

import { RevealTokenView } from '../src/components/reveal-token-view';
import { storybookI18n } from '../src/components/story-helpers';

const ROW: UserToken = {
  id: '11111111-1111-4111-9111-111111111111',
  account_id: '00000000-0000-4000-8000-000000000001',
  token_name: 'CI deploy token',
  scopes: ['read'],
  expires_at: 9_999_999_999,
  revoked: false,
  revoked_at: null,
  created_at: '2026-04-15T00:00:00.000Z',
  updated_at: '2026-04-15T00:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000001',
  updated_by: '00000000-0000-4000-8000-000000000001',
};

const RAW_JWT = 'header.payload.signature';

function renderView(onClose = vi.fn()) {
  return render(
    <I18nextProvider i18n={storybookI18n}>
      <RevealTokenView row={ROW} rawJwt={RAW_JWT} onClose={onClose} />
    </I18nextProvider>,
  );
}

describe('RevealTokenView', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the warning, the readonly JWT input, and the curl snippet', () => {
    renderView();
    expect(
      screen.getByText('This token will not be shown again. Copy it now.'),
    ).toBeInTheDocument();

    const jwtInput = screen.getByTestId('reveal-jwt-input') as HTMLInputElement;
    expect(jwtInput).toHaveAttribute('readonly');
    expect(jwtInput.value).toBe(RAW_JWT);

    const curlSnippet = screen.getByTestId('reveal-curl-snippet');
    expect(curlSnippet.textContent).toContain(
      `curl -H "Authorization: Bearer ${RAW_JWT}"`,
    );
  });

  it('clicking Copy on the JWT field calls navigator.clipboard.writeText with the raw JWT', async () => {
    renderView();
    const copyButton = screen.getByRole('button', { name: 'Copy token' });
    fireEvent.click(copyButton);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(RAW_JWT));
  });

  it('clicking Copy on the curl field copies the full snippet', async () => {
    renderView();
    const copyButton = screen.getByRole('button', {
      name: 'Copy curl command',
    });
    fireEvent.click(copyButton);
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining(`Bearer ${RAW_JWT}`),
      ),
    );
  });

  it('clicking Close fires onClose exactly once', () => {
    const onClose = vi.fn();
    renderView(onClose);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
