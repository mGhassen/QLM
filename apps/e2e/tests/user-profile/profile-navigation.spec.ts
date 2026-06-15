import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { UserProfilePageObject } from './user-profile.po';

/**
 * RFC 0025 phase-1 spec §3.2.1 — the Profile section sits at
 * `/prj/{slug}/user-settings`, is the default sidebar item, and renders
 * four cards (Picture, Name, Password, MFA). Personal tokens stays
 * accessible as the second sidebar item.
 *
 * Single-test linear flow: each Playwright test gets a fresh `page` /
 * context (even under `mode: 'serial'`), so splitting this into
 * separate sign-up + assert-cards + assert-tokens tests would require
 * each follow-up test to re-sign-in. Folding them into one keeps the
 * spec narrative readable AND avoids three duplicate auth round-trips.
 */
test.describe('user-profile: navigation + cards', () => {
  test('signs up, opens user-settings, and renders all four cards', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    const profile = new UserProfilePageObject(page);
    const email = createRandomEmail();
    const projectLandingUrlPattern = /\/prj\/[^/]+/;

    await auth.goToSignUp();
    await auth.signUp({ email, password: DEFAULT_PASSWORD });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });

    await profile.goToProfile();

    await expect(page.getByTestId('name-card')).toBeVisible();
    await expect(page.getByTestId('picture-card')).toBeVisible();
    await expect(page.getByTestId('password-card')).toBeVisible();
    await expect(page.getByTestId('mfa-card')).toBeVisible();

    // Personal tokens is the second sidebar item post-RFC-0025; click
    // it and confirm the tokens pane mounts.
    await page
      .getByRole('button', { name: /^Personal tokens$/ })
      .first()
      .click();
    await expect(page.getByTestId('pane-state-list')).toBeVisible();
  });
});
