import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { UserProfilePageObject } from './user-profile.po';

/**
 * RFC 0025 phase-1 spec §3.3 F4 + §1 open question #2 — wrong-current
 * password surfaces inline (re-auth gate), correct current + valid new
 * password persists, and signing out + back in with the new password
 * lands on the project shell.
 *
 * Single-test linear flow because each Playwright test gets a fresh
 * `page` / context — see profile-navigation.spec.ts for rationale.
 */
test.describe('user-profile: update password', () => {
  test('rejects wrong current; rotates; signs in with the new one', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    const profile = new UserProfilePageObject(page);
    const email = createRandomEmail();
    const oldPassword = DEFAULT_PASSWORD;
    const newPassword = `${DEFAULT_PASSWORD}-rotated`;
    const projectLandingUrlPattern = /\/prj\/[^/]+/;

    await auth.goToSignUp();
    await auth.signUp({ email, password: oldPassword });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });

    await profile.goToProfile();

    // Wrong current → inline error.
    await profile.setPassword({
      current: 'WrongPassword1!',
      next: newPassword,
      confirm: newPassword,
    });
    await profile.submitPassword();
    await profile.expectPasswordCurrentError();

    // Correct current → form resets after success.
    await profile.setPassword({
      current: oldPassword,
      next: newPassword,
      confirm: newPassword,
    });
    await profile.submitPassword();
    await expect(page.getByTestId('password-current')).toHaveValue('', {
      timeout: 10_000,
    });

    // Sign out lands on `/auth/sign-in` already. Calling `goToSignIn()`
    // here re-issues `page.goto('/auth/sign-in')` which races a delayed
    // session-restore in the freshly-loaded app and gets aborted by a
    // bounce-back to the project URL. Just wait for the form to settle
    // and sign in directly on the page we're already on.
    await auth.signOut();
    await page.waitForURL(/\/auth\/sign-in/, { timeout: 10_000 });
    await auth.waitForAuthFormReady();
    await auth.signIn({ email, password: newPassword });
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });
    await expect(page).toHaveURL(projectLandingUrlPattern);
  });
});
