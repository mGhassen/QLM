import { test } from '@playwright/test';

import { AuthPageObject } from './auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';

/**
 * Full password-reset round trip against the local stack:
 *
 *   1. Sign up + confirm a fresh user (arrange).
 *   2. Request a password reset from `/auth/password-reset`.
 *   3. Follow the Mailpit recovery link, which lands on `/update-password`.
 *   4. Set a new password → the form redirects to `/` which lands on
 *      `/prj/<slug>` (LastProjectRedirect). Pre-RFC-0024 this was
 *      `/organizations`.
 *   5. Sign out and sign back in with the NEW password.
 *
 * Two tests in a serial describe so each stage is reported independently.
 */
test.describe('auth: password reset flow', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const originalPassword = DEFAULT_PASSWORD;
  const newPassword = 'NewTesting5678!';

  test('arrange: sign up + confirm a user', async ({ page }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password: originalPassword });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);

    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });
    await auth.signOut();
  });

  test('resets password via email and signs in with the new password', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);

    // Request the reset email.
    await auth.goToPasswordReset();
    await auth.requestPasswordReset(email);

    // Follow the Mailpit recovery link → Supabase verifies the token
    // and redirects to `/update-password`.
    await auth.confirmEmail(email);
    await page.waitForURL(/\/update-password(\?|$)/, { timeout: 15_000 });

    // Set the new password — the form navigates to app.home on success.
    await auth.setNewPassword(newPassword);
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    // Sign out and sign back in with the NEW credentials to prove the
    // rotation actually took effect in Supabase. `signOut` redirects
    // straight to `/auth/sign-in`, so we re-settle the form in place
    // instead of re-issuing `goto` (which would race with the client
    // navigation that fired on sign-out).
    await auth.signOut();
    await page.waitForURL(/\/auth\/sign-in(\?|$)/, { timeout: 15_000 });
    await auth.waitForAuthFormReady();

    await auth.signIn({ email, password: newPassword });
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    await auth.signOut();
  });
});
