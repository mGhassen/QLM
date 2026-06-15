import { expect, test } from '@playwright/test';

import { AuthPageObject } from './auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';

/**
 * Sign-in failure matrix. Two buckets:
 *
 *   - server-side (wrong password → Supabase returns `Invalid login
 *     credentials` → `AuthErrorAlert`)
 *   - client-side (Zod validation → submit never fires)
 *
 * We do NOT test "unknown email" separately because Supabase intentionally
 * merges it into the same `Invalid login credentials` error to prevent
 * account enumeration.
 */
test.describe('auth: sign-in failures', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;

  test('arrange: sign up + confirm a user for the wrong-password test', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);

    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });
    await auth.signOut();
  });

  test('wrong password surfaces the auth error alert', async ({ page }) => {
    const auth = new AuthPageObject(page);

    await auth.goToSignIn();
    await auth.signIn({ email, password: 'WrongPassword9!' });

    await expect(auth.getAuthErrorMessage()).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in(\?|$)/);
  });

  test('invalid email format blocks the submit (no Supabase call)', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    await auth.goToSignIn();

    await auth.expectNoAuthApiCall('**/auth/v1/token**', async () => {
      await page.getByTestId('email-input').fill('not-an-email');
      await page.getByTestId('password-input').fill(DEFAULT_PASSWORD);
      await page.getByTestId('auth-submit-button').click();
      // Give react-hook-form + HTML5 validation a beat to block submit.
      await page.waitForTimeout(500);
    });

    await expect(page).toHaveURL(/\/auth\/sign-in(\?|$)/);
    await expect(page.getByTestId('auth-submit-button')).toBeVisible();
  });

  test('password shorter than 8 chars blocks the submit (no Supabase call)', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    await auth.goToSignIn();

    await auth.expectNoAuthApiCall('**/auth/v1/token**', async () => {
      await page.getByTestId('email-input').fill('someone@example.com');
      await page.getByTestId('password-input').fill('short');
      await page.getByTestId('auth-submit-button').click();
      await page.waitForTimeout(500);
    });

    await expect(page).toHaveURL(/\/auth\/sign-in(\?|$)/);
    await expect(page.getByTestId('auth-submit-button')).toBeVisible();
  });
});
