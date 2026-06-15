import { expect, test } from '@playwright/test';

import { AuthPageObject } from './auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';

/**
 * Sign-up failure matrix.
 *
 *   - Duplicate-email: server-side error, covered by
 *     `[data-test="auth-error-message"]`.
 *   - Zod validation (invalid email, short password, mismatched repeat):
 *     submit is blocked, no `/auth/v1/signup` call fires.
 *
 * The duplicate-email scenario is serial so the second step can reuse
 * the email the first step confirmed.
 */
test.describe('auth: sign-up failures', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;

  test('arrange: sign up + confirm a user', async ({ page }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);

    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });
    await auth.signOut();
  });

  test('signing up again with the same email surfaces the auth error alert', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });

    await expect(auth.getAuthErrorMessage()).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-up(\?|$)/);
  });

  test('invalid email format blocks sign-up submit (no Supabase call)', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    await auth.goToSignUp();

    await auth.expectNoAuthApiCall('**/auth/v1/signup**', async () => {
      await page.getByTestId('email-input').fill('definitely-not-an-email');
      await page.getByTestId('password-input').fill(DEFAULT_PASSWORD);
      await page.getByTestId('repeat-password-input').fill(DEFAULT_PASSWORD);
      await page.getByTestId('auth-submit-button').click();
      await page.waitForTimeout(500);
    });

    await expect(page).toHaveURL(/\/auth\/sign-up(\?|$)/);
  });

  test('password shorter than 8 chars blocks sign-up submit', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    await auth.goToSignUp();

    await auth.expectNoAuthApiCall('**/auth/v1/signup**', async () => {
      await page.getByTestId('email-input').fill(createRandomEmail());
      await page.getByTestId('password-input').fill('short');
      await page.getByTestId('repeat-password-input').fill('short');
      await page.getByTestId('auth-submit-button').click();
      await page.waitForTimeout(500);
    });

    await expect(page).toHaveURL(/\/auth\/sign-up(\?|$)/);
  });

  test('mismatched password and repeat-password block sign-up submit', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    await auth.goToSignUp();

    await auth.expectNoAuthApiCall('**/auth/v1/signup**', async () => {
      await page.getByTestId('email-input').fill(createRandomEmail());
      await page.getByTestId('password-input').fill('Testing1234!');
      await page.getByTestId('repeat-password-input').fill('Different9876@');
      await page.getByTestId('auth-submit-button').click();
      await page.waitForTimeout(500);
    });

    await expect(page).toHaveURL(/\/auth\/sign-up(\?|$)/);
  });
});
