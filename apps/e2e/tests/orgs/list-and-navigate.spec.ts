import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { OrganizationPageObject } from './org.po';

/**
 * Post-RFC-0024 there is no standalone organizations list page —
 * `/organizations` is a redirect (`LastProjectRedirect`) and the
 * in-product way to switch between orgs is the shell topbar dropdown's
 * ORGANIZATION submenu. This spec captures that invariant:
 *
 *   1. Sign up + confirm → lands on `/prj/<slug>`.
 *   2. Create a second org from the dropdown → lands on its default
 *      project at a different `/prj/<slug>`.
 *   3. Navigate to `/organizations` → redirected back into a project.
 *
 * The deeper switcher behaviour (submenu search, clicking a row in the
 * ORGANIZATION submenu) is covered by
 * `apps/e2e/tests/shell/shell-dropdown.spec.ts` so we don't re-test it
 * here.
 */
test.describe('orgs: list and navigate', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const orgName = `List Nav ${nonce}`;

  let initialProjectSlug = '';
  let secondProjectSlug = '';

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('arrange: sign up + confirm', async () => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);

    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });
    initialProjectSlug = page.url().match(/\/prj\/([^/?]+)/)?.[1] ?? '';
    expect(initialProjectSlug).toBeTruthy();
  });

  test('creating a second org lands on its default project', async () => {
    const org = new OrganizationPageObject(page);
    secondProjectSlug = await org.createOrganization(orgName);

    expect(secondProjectSlug).toBeTruthy();
    expect(secondProjectSlug).not.toBe(initialProjectSlug);
  });

  test('/organizations redirects into a project', async () => {
    await page.goto('/organizations');
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 15_000 });
  });
});
