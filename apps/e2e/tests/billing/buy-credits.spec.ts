import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { OrganizationPageObject } from '../orgs/org.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { BillingPageObject } from './billing.po';

/**
 * Buy Credits dialog — read-only interaction spec.
 *
 * Covers the dialog-visible + form-populated + total-recalculates branches,
 * plus the button's disabled-state handling for out-of-range amounts.
 * Stops short of clicking "Continue" because that triggers a Stripe
 * payment-intent creation which needs a configured Stripe test-mode
 * account. Stage I (checkout-happy-path) covers that.
 */
test.describe('billing: Buy Credits dialog', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const orgName = `Buy Credits ${nonce}`;

  let projectSlug = '';

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('arrange: sign up + create an organization', async () => {
    const auth = new AuthPageObject(page);
    const org = new OrganizationPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    projectSlug = await org.createOrganization(orgName);
    expect(projectSlug.length).toBeGreaterThan(0);
  });

  test('opens the dialog and renders the form with a $10 default', async () => {
    const billing = new BillingPageObject(page);
    await billing.goto(projectSlug);

    await billing.openBuyCreditsDialog();

    // The no-Stripe form defaults `amount` to 10 — the total row mirrors it.
    await expect(billing.buyCreditsAmountInput).toHaveValue('10');
    await expect(billing.buyCreditsTotalValue).toHaveText('$10.00');
    await expect(billing.buyCreditsContinueButton).toBeEnabled();
  });

  test('updates the total when the amount changes', async () => {
    const billing = new BillingPageObject(page);
    // The dialog is still open from the previous test in this serial describe.

    await billing.buyCreditsAmountInput.fill('25');
    await expect(billing.buyCreditsAmountInput).toHaveValue('25');
    await expect(billing.buyCreditsTotalValue).toHaveText('$25.00');
    await expect(billing.buyCreditsContinueButton).toBeEnabled();
  });

  test('disables Continue when the amount is out of range', async () => {
    const billing = new BillingPageObject(page);

    // Below min (default min is 10).
    await billing.buyCreditsAmountInput.fill('5');
    await expect(billing.buyCreditsContinueButton).toBeDisabled();

    // Above max (default max is 100).
    await billing.buyCreditsAmountInput.fill('150');
    await expect(billing.buyCreditsContinueButton).toBeDisabled();

    // Back to a valid value and the button re-enables.
    await billing.buyCreditsAmountInput.fill('50');
    await expect(billing.buyCreditsContinueButton).toBeEnabled();
  });
});
