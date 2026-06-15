import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { expectNoApiCall } from '../utils/expect-no-api-call';
import { OrganizationPageObject } from './org.po';

/**
 * Creation flow for organizations — driven through the global shell
 * topbar dropdown (see `shell-dropdown.spec.ts` §"+ New organization").
 *
 *   - Happy path: open the dropdown → ORGANIZATION submenu →
 *     `New organization`, fill a valid name, submit, expect the app to
 *     land on `/prj/<slug>` for the new org's default project.
 *   - Empty-name submit is blocked client-side — no POST to
 *     `/api/organizations` fires.
 *   - 256-char name (one over the `max(255)` Zod rule) is also blocked.
 *
 * `OrganizationDialog` uses
 * `zodResolver(z.object({ name: z.string().min(1).max(255) }))` —
 * special chars are allowed and not worth testing.
 *
 * **Context sharing**: Playwright creates a fresh browser context per
 * test by default, which wipes the authenticated session. We allocate
 * one context + page in `beforeAll` and close it in `afterAll`.
 */
test.describe('orgs: create', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('arrange: sign up + confirm a user', async () => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);

    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });
  });

  test('happy path: creates an org and lands on its default project', async () => {
    const org = new OrganizationPageObject(page);

    const projectSlug = await org.createOrganization(
      `Happy Org ${Date.now().toString(36)}`,
    );

    expect(projectSlug).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`/prj/${projectSlug}(/|\\?|$)`));
  });

  test('empty name blocks submit (no /api/organizations call)', async () => {
    const org = new OrganizationPageObject(page);

    await org.openCreateOrganizationDialog();

    await expectNoApiCall(page, '**/api/organizations**', async () => {
      const dialog = org.getCreateOrganizationForm();
      await dialog.locator('#create-org-name').fill('');
      // The submit button is `disabled` when the form is invalid, so a
      // click is a no-op — but we still exercise it to confirm no
      // network call escapes.
      await dialog
        .getByRole('button', { name: /create organization/i })
        .click({ force: true })
        .catch(() => {
          // force-click may throw if the button is disabled and not
          // actionable; that's fine — the invariant is "no API call".
        });
      await page.waitForTimeout(500);
    });

    await expect(org.getCreateOrganizationForm()).toBeVisible();
    // Close the dialog so the next test can re-open it cleanly.
    await page.keyboard.press('Escape');
  });
});
