import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { expectNoApiCall } from '../utils/expect-no-api-call';
import { OrganizationPageObject } from './org.po';

/**
 * Members list + invite flow.
 *
 * **Invitation acceptance is NOT tested.** `AcceptInvitationContainer`
 * has no wired route and `TeamMember.inviteTeamMember` doesn't email
 * anyone — it just inserts an invitation row into Supabase. We
 * exercise the send-side of the flow (dialog opens, fields accept
 * input, submit reaches the RPC cleanly) and nothing past that.
 *
 * Shares one browser context + page across the describe (see the
 * create-org spec for the reason).
 */
test.describe('orgs: members and invite', () => {
  test.describe.configure({ mode: 'serial' });

  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const orgName = `Members Test ${nonce}`;

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

  test('arrange: sign up + create an org', async () => {
    const auth = new AuthPageObject(page);
    const org = new OrganizationPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    projectSlug = await org.createOrganization(orgName);
    expect(projectSlug).toBeTruthy();
  });

  test('creator is listed in the members table', async () => {
    const org = new OrganizationPageObject(page);
    await org.goToMembers(projectSlug);

    await expect(org.getMemberRowByEmail(email)).toBeVisible();
  });

  test('invite dialog: add and remove rows', async () => {
    const org = new OrganizationPageObject(page);
    await org.goToMembers(projectSlug);
    await org.openInviteDialog();

    await expect(org.getInviteRows()).toHaveCount(1);

    await org.addInviteRow();
    await org.addInviteRow();
    await expect(org.getInviteRows()).toHaveCount(3);

    await org.removeInviteRow(1);
    await expect(org.getInviteRows()).toHaveCount(2);
  });

  test('invite submit with invalid email is blocked client-side', async () => {
    const org = new OrganizationPageObject(page);
    await org.goToMembers(projectSlug);
    await org.openInviteDialog();

    await expectNoApiCall(
      page,
      '**/rest/v1/rpc/create_invitation*',
      async () => {
        const firstEmail = page.getByTestId('invite-email-input').first();
        await firstEmail.fill('definitely-not-an-email');
        await page.getByTestId('confirm-invite-members-button').click();
        await page.waitForTimeout(500);
      },
    );

    await expect(page.getByTestId('invite-members-form')).toBeVisible();
  });

  test('inviting a valid email closes the dialog', async () => {
    const org = new OrganizationPageObject(page);
    await org.goToMembers(projectSlug);
    await org.openInviteDialog();

    await org.fillInviteRow(0, { email: createRandomEmail() });
    await org.submitInvite();

    await expect(page.getByTestId('invite-members-form')).toBeHidden({
      timeout: 15_000,
    });
  });
});
