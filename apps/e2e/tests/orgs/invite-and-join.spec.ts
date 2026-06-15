import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';
import { getLatestInviteTokenFor } from '../utils/supabase-admin';
import { OrganizationPageObject } from './org.po';

/**
 * Full invitation + join round trip, exercising the routes ported from
 * qwery-enterprise:
 *
 *   1. Owner signs up, creates an org, and invites `invitee@...` via the
 *      existing members dialog (browser-direct `create_invitation` RPC).
 *   2. The spec captures the generated `invite_token` from Supabase
 *      directly — the server-side email dispatcher is descoped (no SMTP
 *      mailer for Mailpit in local dev), so there's nothing in the
 *      mailbox to follow.
 *   3. The invitee — in a fresh browser context with no account —
 *      visits `/join/accept?invite_token=<token>`. The server handler
 *      issues a Supabase admin "invite" magic link that creates the
 *      account and signs them in, then bounces the user through
 *      `/auth/confirm` and onto `/join?invite_token=<token>`.
 *   4. The invitee clicks the join button; the `/join` POST handler
 *      calls the `accept_invitation` admin RPC to insert the membership
 *      and redirects to `/org/<slug>`.
 *   5. Back on the owner's context, a refetch of the members page shows
 *      the invitee as a member.
 *
 * The spec runs with `workers: 1` (suite-wide default) so the two
 * contexts share the single Vite dev server cleanly.
 */
test.describe('orgs: invitation + join round trip', () => {
  test.describe.configure({ mode: 'serial' });

  const ownerEmail = createRandomEmail();
  const inviteeEmail = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const orgName = `Invite Join ${nonce}`;

  let projectSlug = '';
  let inviteToken = '';

  let ownerContext: BrowserContext;
  let ownerPage: Page;
  let inviteeContext: BrowserContext;
  let inviteePage: Page;

  test.beforeAll(async ({ browser }) => {
    ownerContext = await browser.newContext();
    ownerPage = await ownerContext.newPage();
    inviteeContext = await browser.newContext();
    inviteePage = await inviteeContext.newPage();
  });

  test.afterAll(async () => {
    await ownerContext?.close();
    await inviteeContext?.close();
  });

  test('arrange: owner signs up, confirms, and creates an org', async () => {
    const auth = new AuthPageObject(ownerPage);
    const org = new OrganizationPageObject(ownerPage);

    await auth.goToSignUp();
    await auth.signUp({ email: ownerEmail, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(ownerEmail);
    await ownerPage.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    projectSlug = await org.createOrganization(orgName);
    expect(projectSlug).toBeTruthy();
  });

  test('owner invites the invitee via the members dialog', async () => {
    const org = new OrganizationPageObject(ownerPage);

    await org.goToMembers(projectSlug);
    await org.openInviteDialog();
    await org.fillInviteRow(0, { email: inviteeEmail });
    await org.submitInvite();

    // Dialog closes on success (browser-direct `create_invitation` RPC
    // path is still in use pending the mailer rewire).
    await expect(ownerPage.getByTestId('invite-members-form')).toBeHidden({
      timeout: 15_000,
    });

    // Capture the token that would normally be in the email body.
    inviteToken = await getLatestInviteTokenFor(inviteeEmail);
    expect(inviteToken).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('invitee follows /join/accept and lands on /join', async () => {
    // Fresh context — no Supabase session yet. The `/join/accept`
    // handler detects that the invitee's email isn't in `accounts`,
    // issues an admin `invite`-type magic link, and redirects through
    // `/auth/confirm` (which creates the account + signs them in) to
    // `/join?invite_token=<token>`.
    await inviteePage.goto(`/join/accept?invite_token=${inviteToken}`);

    await inviteePage.waitForURL(/\/join(\/|\?)/, { timeout: 30_000 });
    expect(inviteePage.url()).toContain(`invite_token=${inviteToken}`);

    // The `/join` page renders `AcceptInvitationContainer` once it
    // finishes validating the token + the membership check.
    await expect(inviteePage.getByTestId('join-team-form')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('invitee clicks the join button and lands in a project', async () => {
    // `AcceptInvitationContainer` renders a native <form method="POST">
    // with no explicit `action`, so submitting it POSTs to the current
    // URL — `/join` — which triggers `server.handlers.POST` and
    // redirects to `nextPath` (= `pathsConfig.app.home` = `/`). `/`
    // then resolves via `LastProjectRedirect` into `/prj/<slug>` for
    // whatever org's default project the user is landing in.
    //
    // We poll `page.url()` instead of `waitForURL` because the project
    // shell chains a bunch of Supabase queries (members, pending
    // invitations, projects…) that delay the frame's `commit` / `load`
    // events past the default waitForURL timeout, even after the URL
    // has actually settled.
    await inviteePage
      .getByTestId('join-team-form')
      .locator('button[type="submit"]')
      .click();

    await expect
      .poll(() => inviteePage.url(), { timeout: 15_000 })
      .toMatch(/\/prj\/[^/?#]+(\/|\?|$)/);
  });

  test('owner-visible members list now includes the invitee', async () => {
    const org = new OrganizationPageObject(ownerPage);

    // Re-navigate to force a React Query refetch against the
    // `get_organization_members` RPC.
    await org.goToMembers(projectSlug);

    await expect(org.getMemberRowByEmail(inviteeEmail)).toBeVisible({
      timeout: 15_000,
    });
  });
});
