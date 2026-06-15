import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { UserProfilePageObject } from './user-profile.po';

/**
 * RFC 0025 phase-1 spec §3.3 F1 — submitting a new display name persists
 * it via `shell.personalAccount.updateMine` and the topbar avatar trigger
 * reflects the change without a page reload (resolution for spec §1
 * open question #1: shared `['personal-account', userId]` query key).
 *
 * Single-test linear flow because each Playwright test gets a fresh
 * `page` / context — see profile-navigation.spec.ts for rationale.
 */
test.describe('user-profile: update display name', () => {
  test('updates the display name; topbar reflects it; rejects empty', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    const profile = new UserProfilePageObject(page);
    const email = createRandomEmail();
    const newName = `Profile e2e ${Date.now()}`;
    const projectLandingUrlPattern = /\/prj\/[^/]+/;

    await auth.goToSignUp();
    await auth.signUp({ email, password: DEFAULT_PASSWORD });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });

    await profile.goToProfile();

    await profile.setName(newName);
    await profile.submitName();

    // Wait for the mutation invalidation to refresh both the form and
    // the topbar.
    await profile.expectTopbarName(newName);

    // The Name input should also display the new value (form was reset
    // via `form.reset({name: trimmed})` after a successful submit).
    await expect(profile.nameInput()).toHaveValue(newName);

    // Empty name → inline error, no mutation.
    await profile.setName('');
    await profile.submitName();
    await profile.expectNameError();
  });
});
