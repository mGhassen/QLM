import { expect, test } from '@playwright/test';

import { AuthPageObject } from './auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';

/**
 * Edge case: the happy-path scenario always visits the Mailpit
 * confirmation link, so it never exercises the branch where Supabase
 * refuses to sign in an unverified account. Here we deliberately skip
 * the confirm step and assert the error surfaces.
 */
test.describe('auth: unverified account cannot sign in', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;

  test('arrange: sign up without visiting the confirmation link', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    // Deliberately do NOT call `confirmEmail` — we want the user to
    // stay unverified for the next step.
  });

  test('unverified sign-in shows the auth error alert', async ({ page }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignIn();
    await auth.signIn({ email, password });

    await expect(auth.getAuthErrorMessage()).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in(\?|$)/);
  });
});
