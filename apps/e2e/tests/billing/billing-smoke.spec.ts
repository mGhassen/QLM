import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { OrganizationPageObject } from '../orgs/org.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { BillingPageObject } from './billing.po';

/**
 * First running e2e case for the billing surface: sign up a fresh user,
 * create an organization, land on its billing page, and assert the
 * read-only shape of the screen — Credit balance heading + $0.00 balance
 * + Invoice history heading + "No invoices found" empty-state row.
 *
 * Shares one browser context + page across the describe (see
 * orgs/list-and-navigate.spec.ts for the reason).
 */
test.describe('billing: read-only smoke', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const orgName = `Billing Smoke ${nonce}`;

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

  test('renders Credit balance with $0.00 and empty Invoice history', async () => {
    const billing = new BillingPageObject(page);

    await billing.goto(projectSlug);

    // Credit balance section is visible with the expected title.
    await expect(billing.creditBalanceTitle).toBeVisible();
    await expect(billing.remainingBalanceCard).toBeVisible();

    // A fresh org starts with 0 credits — the balance value reads $0.00.
    await expect(billing.balanceValue).toHaveText('$0.00');

    // Buy credits trigger is present (we don't click it in this smoke).
    await expect(billing.buyCreditsTrigger).toBeVisible();

    // Invoice history section is visible with the expected title + an
    // empty-state row ("No invoices found") since no purchases have been made.
    await expect(billing.invoiceHistoryTitle).toBeVisible();
    await expect(billing.invoiceHistoryEmptyRow).toBeVisible();
    await expect(billing.invoiceHistoryEmptyRow).toContainText(
      'No invoices found',
    );
  });
});
