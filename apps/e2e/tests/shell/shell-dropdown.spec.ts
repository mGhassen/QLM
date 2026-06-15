import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { AuthPageObject } from '../auth/auth.po';
import { createRandomEmail, DEFAULT_PASSWORD } from '../utils/credentials';

/**
 * Intensive coverage for the global shell topbar dropdown + settings surface.
 *
 * Covers `docs/specs/0024-global-shell-ui-phase1.md` §10.4. The UI is built on
 * Radix DropdownMenu + DropdownMenuSub primitives, so selectors lean on
 * `role=menu` / `role=menuitem` + text rendered from
 * `apps/web/src/lib/i18n/locales/en/{shell,org-settings}.json`.
 *
 * The suite runs serial: earlier tests seed state (an extra project, an extra
 * org) that later tests rely on.
 */
test.describe('shell: dropdown + settings', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;
  const email = createRandomEmail();
  const password = DEFAULT_PASSWORD;
  const nonce = Date.now().toString(36);
  const extraProjectName = `E2E Project ${nonce}`;
  const extraOrgName = `E2E Org ${nonce}`;

  let initialProjectSlug = '';
  let extraProjectSlug = '';
  let extraOrgLandedSlug = '';

  // ── Helpers ─────────────────────────────────────────────────────────

  const openDropdown = async () => {
    const trigger = page.locator('button[aria-haspopup="menu"]').first();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Use keyboard Enter on a focused trigger. Playwright's pointer-click
    // fires both pointerdown (which Radix uses to toggle) and a later click
    // that Radix reads as the second toggle — so click-toggle-close flickers
    // observably. Enter avoids the double-fire.
    await trigger.focus();
    await trigger.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  };

  const level1Menu = () =>
    // Radix renders every open menu with role="menu" + data-state="open".
    // The first one is the level-1 content.
    page.locator('[role="menu"][data-state="open"]').first();

  // ── Setup ───────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.beforeEach(async () => {
    if (!page) return;
    // TanStack Router Devtools renders a floating button near the bottom of
    // the viewport and intercepts pointer events on elements behind it. It
    // uses a goober-generated class name (`.go<hash>`) that changes per
    // build, so target it by role + visible text and nuke the whole
    // contentinfo region that wraps it.
    await page
      .evaluate(() => {
        document
          .querySelectorAll('[role="contentinfo"]')
          .forEach((node) => node.remove());
      })
      .catch(() => {
        /* page might not be loaded yet */
      });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('arrange: sign up + land in default workspace', async () => {
    const auth = new AuthPageObject(page);

    await auth.goToSignUp();
    await auth.signUp({ email, password });
    await auth.waitForEmailConfirmationPrompt();
    await auth.confirmEmail(email);

    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 30_000 });

    const match = page.url().match(/\/prj\/([^/?]+)/);
    initialProjectSlug = match?.[1] ?? '';
    expect(initialProjectSlug).toBeTruthy();
  });

  // ── Structure ───────────────────────────────────────────────────────

  test('trigger click opens level-1 with PROJECT + ORGANIZATION sections (no ACCOUNT)', async () => {
    await openDropdown();

    const menu = level1Menu();
    await expect(menu).toBeVisible();
    await expect(menu.getByText(/^PROJECT$/)).toBeVisible();
    await expect(menu.getByText(/^ORGANIZATION$/)).toBeVisible();
    await expect(menu.getByText(/^ACCOUNT$/i)).toHaveCount(0);

    await page.keyboard.press('Escape');
  });

  test('level-1 lists the four org shortcuts + project settings', async () => {
    await openDropdown();
    const menu = level1Menu();

    await expect(menu.getByText('Project settings')).toBeVisible();
    await expect(menu.getByText('Invite members')).toBeVisible();
    await expect(menu.getByText('Billing', { exact: true })).toBeVisible();
    await expect(menu.getByText('Organization settings')).toBeVisible();

    await page.keyboard.press('Escape');
  });

  // ── Create project ──────────────────────────────────────────────────

  test('+ New project dialog creates a project and switches context', async () => {
    await openDropdown();

    // The project row is the first menuitem (DropdownMenuSubTrigger).
    // Hover to open the submenu.
    await level1Menu().locator('[role="menuitem"]').nth(0).hover();

    const submenu = page.locator('[role="menu"][data-state="open"]').nth(1);
    await expect(submenu).toBeVisible();

    await submenu.getByText('New project').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#create-project-name').fill(extraProjectName);
    await dialog.getByRole('button', { name: /create project/i }).click();

    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 10_000 });

    const match = page.url().match(/\/prj\/([^/?]+)/);
    extraProjectSlug = match?.[1] ?? '';
    expect(extraProjectSlug).toBeTruthy();
    expect(extraProjectSlug).not.toBe(initialProjectSlug);
  });

  // ── Submenu search + switch ─────────────────────────────────────────

  test('project submenu search filters and clicking switches URL', async () => {
    await openDropdown();
    await level1Menu().locator('[role="menuitem"]').nth(0).hover();

    const submenu = page.locator('[role="menu"][data-state="open"]').nth(1);
    await expect(submenu).toBeVisible();

    const search = submenu.locator('input[type="text"]');
    // Search by project name — the submenu displays names, not slugs. Use
    // the unique nonce from our extra project so exactly one row matches.
    await search.fill(nonce);

    const matching = submenu.getByRole('menuitem').filter({
      hasText: new RegExp(nonce, 'i'),
    });
    await expect(matching).toHaveCount(1);

    // Clear + look for 2 project rows + 1 New project row.
    await search.fill('');
    await expect(submenu.getByText('New project')).toBeVisible();

    // Click the initial project (the one whose name does NOT contain the
    // nonce). Its displayed name is the project entity's `.name` — default
    // workspaces label their seed project "Default project".
    const initialRow = submenu
      .getByRole('menuitem')
      .filter({ hasText: /default project/i })
      .first();
    await initialRow.click();
    await page.waitForURL(new RegExp(`/prj/${initialProjectSlug}`), {
      timeout: 10_000,
    });
  });

  // ── Create organization ─────────────────────────────────────────────

  test('+ New organization dialog creates an org + seeds default project', async () => {
    await openDropdown();

    // Open the org submenu.
    // Level-1 structure: [0]=project sub-trigger, [1]=project settings,
    // [2]=org sub-trigger, [3]=invite, [4]=billing, [5]=org settings.
    await level1Menu().getByRole('menuitem').nth(2).hover();

    const submenu = page.locator('[role="menu"][data-state="open"]').nth(1);
    await expect(submenu).toBeVisible();

    await submenu.getByText('New organization').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#create-org-name').fill(extraOrgName);
    await dialog.getByRole('button', { name: /create organization/i }).click();

    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 15_000 });
    extraOrgLandedSlug = page.url().match(/\/prj\/([^/?]+)/)?.[1] ?? '';
    expect(extraOrgLandedSlug).toBeTruthy();
    expect(extraOrgLandedSlug).not.toBe(initialProjectSlug);
    expect(extraOrgLandedSlug).not.toBe(extraProjectSlug);
  });

  // ── Shortcuts → settings apps ───────────────────────────────────────

  test.describe('dropdown shortcuts navigate to the matching settings surface', () => {
    for (const { label, expected } of [
      { label: 'Project settings', expected: /\/project-settings/ },
      { label: 'Invite members', expected: /\/org-settings\?section=members/ },
      { label: 'Billing', expected: /\/org-settings\?section=billing/ },
      { label: 'Organization settings', expected: /\/org-settings(?!\?section=)/ },
    ]) {
      test(`shortcut: ${label}`, async () => {
        await openDropdown();
        await level1Menu().getByText(label, { exact: true }).click();
        await page.waitForURL(expected, { timeout: 10_000 });
      });
    }
  });

  // ── User-settings from sidebar profile menu ─────────────────────────

  test('sidebar profile → Settings navigates to /user-settings', async () => {
    await page.goto(`/prj/${initialProjectSlug}`);
    await page.waitForURL(new RegExp(`/prj/${initialProjectSlug}`));
    // TanStack Router Devtools renders a floating panel that intercepts
    // pointer events on elements behind it. Remove it (the goober class
    // name is randomized per build, so target by text + walk up to the
    // fixed-positioned ancestor).
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('body *'))
        .filter((el) =>
          /TanStack Router/i.test((el as HTMLElement).textContent ?? ''),
        )
        .forEach((el) => {
          let node: HTMLElement | null = el as HTMLElement;
          while (node && getComputedStyle(node).position !== 'fixed') {
            node = node.parentElement;
          }
          (node ?? el).remove();
        });
    });
    // Target the profile trigger via the stable
    // `data-test="shell-user-menu-trigger"` hook (RFC 0025 story 006).
    // The pre-RFC heuristic matched on the accessible name containing
    // the user email — that stops working once the topbar shows
    // `accounts.name` instead of the raw email. Press Enter on the
    // focused trigger — avoids pointer-event interception entirely.
    // Radix `DropdownMenuTrigger` opens on Enter.
    const trigger = page.getByTestId('shell-user-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
    await trigger.focus();
    await trigger.press('Enter');
    const settingsItem = page.getByTestId('shell-account-dropdown-settings');
    await settingsItem.waitFor({ state: 'visible', timeout: 10_000 });
    await settingsItem.click();
    await page.waitForURL(/\/user-settings/, { timeout: 10_000 });
    await expect(page.getByText(/Personal tokens/).first()).toBeVisible();
  });

  // ── Esc + outside-click ─────────────────────────────────────────────

  test('Escape closes the dropdown without navigating', async () => {
    const urlBefore = page.url();
    await openDropdown();
    await page.keyboard.press('Escape');
    const trigger = page.locator('button[aria-haspopup="menu"]').first();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(page.url()).toBe(urlBefore);
  });

  test('outside-click closes the dropdown without navigating', async () => {
    const urlBefore = page.url();
    await openDropdown();
    await page.mouse.click(10, 10);
    const trigger = page.locator('button[aria-haspopup="menu"]').first();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(page.url()).toBe(urlBefore);
  });

  // ── Landing redirects ───────────────────────────────────────────────

  test('/ redirects into a project', async () => {
    await page.goto('/');
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 15_000 });
  });

  test('/organizations redirects into a project', async () => {
    await page.goto('/organizations');
    await page.waitForURL(/\/prj\/[^/]+/, { timeout: 15_000 });
  });
});
