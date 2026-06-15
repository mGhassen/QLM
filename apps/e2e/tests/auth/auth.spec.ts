import { expect, test } from '@playwright/test';

import { AuthPageObject } from './auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';

/**
 * Full password-auth round trip against the local stack:
 *
 *   1. Sign up a fresh user → expect the "check your email" alert.
 *   2. Pull the confirmation link from Mailpit → expect to land on
 *      `/prj/<slug>` (RFC 0024 removed the standalone `/organizations`
 *      list page; `LastProjectRedirect` sends the user straight to
 *      their default project).
 *   3. Sign out via the sidebar account dropdown → expect to be back at
 *      `/auth/sign-in`.
 *   4. Sign back in with the same credentials → expect `/prj/<slug>`
 *      again.
 *   5. Sign out once more as cleanup.
 *
 * Split into two tests that share a generated email/password across a
 * serial describe block so that each step of the flow is reported
 * independently in CI output.
 */
test.describe('auth: email + password full flow', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;

  // Matches `/auth/sign-in` with or without a `?next=...` query string.
  const signInUrlPattern = /\/auth\/sign-in(\?|$)/;
  const projectLandingUrlPattern = /\/prj\/[^/]+/;

  test('signs up, confirms email, and lands on /prj/<slug>', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();

    await auth.confirmEmail(email);

    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });
    await expect(page).toHaveURL(projectLandingUrlPattern);
  });

  test('signs out and signs back in with the same credentials', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignIn();
    await auth.signIn({ email, password });

    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });
    await expect(page).toHaveURL(projectLandingUrlPattern);

    await auth.signOut();
    await page.waitForURL(signInUrlPattern, { timeout: 15_000 });
    await expect(page).toHaveURL(signInUrlPattern);

    await auth.signIn({ email, password });
    await page.waitForURL(projectLandingUrlPattern, { timeout: 30_000 });
    await expect(page).toHaveURL(projectLandingUrlPattern);

    await auth.signOut();
    await page.waitForURL(signInUrlPattern, { timeout: 15_000 });
    await expect(page).toHaveURL(signInUrlPattern);
  });
});
