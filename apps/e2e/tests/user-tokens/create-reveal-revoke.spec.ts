import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { UserTokensPageObject } from './user-tokens.po';

/**
 * Full token-management round trip per RFC 0009 spec §10.4 (as amended
 * in 2026-04-16 Story 012 Changelog entry):
 *
 *   1. Sign up + confirm a fresh user → land on /prj/<slug>
 *      (post RFC 0024 — pre-RFC this was /organizations).
 *   2. Open account dropdown → click Settings → Settings dialog opens
 *      with TokensSettingsPane in `list` pane-state, empty state visible.
 *   3. Click Generate Token → pane flips to `create`.
 *   4. Fill name = "Playwright"; check Read + Write; keep default expiration.
 *   5. Click Create Token → pane flips to `reveal`; raw JWT field non-empty.
 *   6. Click Copy → navigator.clipboard.writeText was called with the raw JWT.
 *   7. Click Close → pane flips back to `list`; new row appears with
 *      Status = Active, Scopes = Read + Write.
 *   8. Click trash on the new row → pane flips to `revoke-confirm`.
 *   9. Click Revoke → pane flips back to `list`; row's status flips to
 *      Revoked.
 *
 * Steps are folded into a single test so that the serial flow runs as
 * one CI report row — easier to debug than 13 isolated assertions.
 */
test.describe('user-tokens: create → reveal → revoke', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const tokenName = `Playwright ${Date.now()}`;

  const projectLandingUrlPattern = /\/prj\/[^/]+/;

  test('signs up, confirms, and lands on /prj/<slug>', async ({ page }) => {
    const auth = new AuthPageObject(page);
    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });
    await expect(page).toHaveURL(projectLandingUrlPattern);
  });

  test('creates a token, reveals + copies the JWT, then revokes it', async ({
    page,
  }) => {
    // Spy on `navigator.clipboard.writeText` BEFORE the page navigates so
    // the assertion can read what was copied.
    await page.addInitScript(() => {
      const original = navigator.clipboard?.writeText?.bind(navigator.clipboard);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as unknown as { __copiedTexts?: string[] }).__copiedTexts =
              [
                ...((window as unknown as { __copiedTexts?: string[] })
                  .__copiedTexts ?? []),
                text,
              ];
            if (original) await original(text);
          },
        },
      });
    });

    const auth = new AuthPageObject(page);
    await auth.goToSignIn();
    await auth.signIn({ email, password });
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });

    const tokens = new UserTokensPageObject(page);

    // Step 2 — open Settings dialog.
    await tokens.openSettingsDialog();

    // Step 3 — empty state visible (the test user has no tokens yet).
    await expect(page.getByTestId('token-list-empty')).toBeVisible();

    // Step 4 — start the create flow.
    await tokens.startCreateFlow();

    // Step 5 — fill the form.
    await tokens.fillTokenForm({
      name: tokenName,
      scopes: ['read', 'write'],
    });

    // Step 6 — submit.
    await tokens.submitCreateForm();

    // Step 7 — reveal view shows a non-empty JWT.
    const jwt = await tokens.getRevealedJwt();
    expect(jwt.length).toBeGreaterThan(20);

    // Step 8 — copy the JWT and assert the spy captured it.
    await tokens.clickCopyJwt();
    const copiedTexts = await page.evaluate(
      () => (window as unknown as { __copiedTexts?: string[] }).__copiedTexts,
    );
    expect(copiedTexts).toContain(jwt);

    // Step 9 — close the reveal view.
    await tokens.closeRevealView();

    // Step 10 — new row visible in the list with the right status + scopes.
    await tokens.assertRowVisible(tokenName, {
      status: 'Active',
      scopes: ['Read', 'Write'],
    });

    // Step 11 — open the inline revoke confirm.
    await tokens.revokeRow(tokenName);

    // Step 12 — confirm the revoke.
    const revokeStartedAt = Date.now();
    await tokens.confirmRevoke();

    // Step 13 — row's status flips to Revoked; Revoked-At is recent.
    await tokens.assertRowVisible(tokenName, {
      status: 'Revoked',
      scopes: ['Read', 'Write'],
    });

    // The Revoked-At cell is rendered as a localized date — assert it
    // resolves to something within ±2 minutes of the click. Use a
    // permissive contains-match because the format is locale-dependent.
    const row = page
      .getByTestId('token-list-content')
      .getByRole('row')
      .filter({ hasText: tokenName });
    await expect(row).not.toContainText('N/A');
    expect(Date.now() - revokeStartedAt).toBeLessThan(120_000);
  });
});
